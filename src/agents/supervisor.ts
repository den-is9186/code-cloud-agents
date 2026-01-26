import {
  Agent,
  AgentRole,
  AgentStatus,
  BuildResult,
  SubTask,
  ReviewResult,
  FileChange,
  TestFile,
  TestResult,
  Step,
  Dependency,
  Issue,
  TestFailure,
} from './types';
import { llmClient } from '../llm/client';
import { SUPERVISOR_CONFIG } from '../config/constants';
import { sanitizeLogMessage } from '../utils/security';
import { streamEmitter } from '../utils/events';
import { checkpointManager, Checkpoint } from '../utils/checkpoint';

interface SupervisorConfig {
  model: string;
  maxIterations?: number;
  preset: string;
}

export class SupervisorAgent implements Agent {
  role: AgentRole = 'supervisor';
  model: string;
  status: AgentStatus = 'idle';

  private agents: Map<AgentRole, Agent> = new Map();
  private maxIterations: number;

  constructor(config: SupervisorConfig) {
    this.model = config.model;
    this.maxIterations = config.maxIterations || SUPERVISOR_CONFIG.MAX_ITERATIONS;
  }

  registerAgent(agent: Agent) {
    this.agents.set(agent.role, agent);
  }

  async execute(input: { task: string; projectPath: string; resumeCheckpointId?: string }): Promise<BuildResult> {
    this.status = 'working';
    const startTime = Date.now();
    const result: BuildResult = {
      success: false,
      filesChanged: [],
      testsWritten: [],
      docsUpdated: [],
      totalCost: 0,
      totalTokens: 0,
      duration: 0,
    };

    // Emit build start event
    streamEmitter.emitBuildStart();

    // Variables to track state for checkpointing
    let runbook: Step[] | null = null;
    let tasks: SubTask[] = [];
    let executionOrder: string[][] = [];
    let taskMap: Map<string, SubTask> | null = null;
    let completedTaskIds: Set<string> = new Set();
    let currentPhase: 'architect' | 'coach' | 'execution' | 'documentation' | 'complete' = 'architect';

    // Check if we're resuming from a checkpoint
    if (input.resumeCheckpointId) {
      const checkpoint = await checkpointManager.load(input.resumeCheckpointId);
      if (checkpoint) {
        console.log(`🔄 Resuming from checkpoint: ${checkpoint.id}`);
        // Restore state from checkpoint
        runbook = checkpoint.result.runbook as Step[] || null;
        tasks = checkpoint.pendingTasks || [];
        executionOrder = checkpoint.result.executionOrder as string[][] || [];
        completedTaskIds = new Set(checkpoint.completedTasks || []);
        currentPhase = checkpoint.currentPhase;
        
        // Restore partial result
        if (checkpoint.result.filesChanged) {
          result.filesChanged = checkpoint.result.filesChanged as FileChange[];
        }
        if (checkpoint.result.testsWritten) {
          result.testsWritten = checkpoint.result.testsWritten as TestFile[];
        }
        if (checkpoint.result.docsUpdated) {
          result.docsUpdated = checkpoint.result.docsUpdated as FileChange[];
        }
        if (checkpoint.result.errors) {
          result.errors = checkpoint.result.errors as string[];
        }
        
        console.log(`📊 Resumed: phase=${currentPhase}, completed tasks=${completedTaskIds.size}`);
      }
    }

    try {
      // Step 1: Architect creates runbook (if not already done)
      if (!runbook) {
        console.log('📐 Architect analyzing task...');
        const architectStart = Date.now();
        const architect = this.getAgent('architect');
        const architectResult = await (
          architect as Agent<
            { task: string; projectPath: string },
            { runbook: Step[]; estimatedComplexity: string }
          >
        ).execute(input);
        runbook = architectResult.runbook;
        const architectDuration = Date.now() - architectStart;
        streamEmitter.emitAgentComplete({ agent: 'architect', success: true, duration: architectDuration });
        
        // Save checkpoint after architect phase
        currentPhase = 'coach';
        await this.saveCheckpoint(input, currentPhase, completedTaskIds, tasks, result, runbook, executionOrder);
      }

      // Step 2: Coach creates subtasks (if not already done)
      if (tasks.length === 0) {
        console.log('🎯 Coach planning tasks...');
        const coachStart = Date.now();
        const coach = this.getAgent('coach');
        const coachResult = await (
          coach as Agent<
            { runbook: Step[]; context: unknown },
            { tasks: SubTask[]; executionOrder: string[][]; dependencies: Dependency[] }
          >
        ).execute({ runbook: runbook!, context: input });
        tasks = coachResult.tasks;
        executionOrder = coachResult.executionOrder;
        const coachDuration = Date.now() - coachStart;
        streamEmitter.emitAgentComplete({ agent: 'coach', success: true, duration: coachDuration });
        
        // Save checkpoint after coach phase
        currentPhase = 'execution';
        await this.saveCheckpoint(input, currentPhase, completedTaskIds, tasks, result, runbook, executionOrder);
      }

      // Step 3: Execute tasks
      // Create a Map for O(1) task lookups instead of O(n) find() in nested loops
      taskMap = new Map(tasks.map((t: SubTask) => [t.id, t]));

      for (const taskBatch of executionOrder) {
        // Filter out already completed tasks
        const pendingTaskBatch = taskBatch.filter(taskId => !completedTaskIds.has(taskId));
        
        if (pendingTaskBatch.length === 0) {
          console.log(`⏭️ Skipping batch, all tasks already completed`);
          continue;
        }
        
        // Execute tasks in the same batch in parallel
        const batchResults = await Promise.all(
          pendingTaskBatch.map(async (taskId: string) => {
            const task = taskMap!.get(taskId);
            if (!task) {
              console.warn(`Task ${taskId} not found in task list`);
              return null;
            }

            // Emit task start event
            streamEmitter.emitTaskStart({
              taskId: task.id,
              description: task.description,
              agent: task.assignedAgent,
            });

            const taskStartTime = Date.now();
            // Collect changes from this task
            const taskChanges: {
              filesChanged: FileChange[];
              testsWritten: TestFile[];
              testResults?: TestResult;
              errors?: string[];
            } = {
              filesChanged: [],
              testsWritten: [],
              testResults: undefined,
              errors: [],
            };

            try {
              await this.executeTaskWithResult(task, taskChanges);
              // Mark task as completed
              completedTaskIds.add(task.id);
              
              // Save checkpoint after each task
              currentPhase = 'execution';
              await this.saveCheckpoint(input, currentPhase, completedTaskIds, tasks, result, runbook, executionOrder);
              
              // Emit task complete event on success
              streamEmitter.emitTaskComplete({
                taskId: task.id,
                success: true,
                duration: Date.now() - taskStartTime,
              });
              return taskChanges;
            } catch (error: unknown) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              console.error(sanitizeLogMessage(`❌ Task ${taskId} failed: ${errorMessage}`));
              taskChanges.errors = [errorMessage];
              // Save checkpoint on error
              currentPhase = 'execution';
              await this.saveCheckpoint(input, currentPhase, completedTaskIds, tasks, result, runbook, executionOrder);
              // Emit task complete event on failure
              streamEmitter.emitTaskComplete({
                taskId: task.id,
                success: false,
                duration: Date.now() - taskStartTime,
              });
              return taskChanges;
            }
          })
        );

        // Merge all batch results into the main result
        for (const batchResult of batchResults) {
          if (!batchResult) continue;

          result.filesChanged.push(...batchResult.filesChanged);
          result.testsWritten.push(...batchResult.testsWritten);

          // For test results, we might want to combine them
          // For simplicity, use the last non-undefined result
          if (batchResult.testResults) {
            result.testResults = batchResult.testResults;
          }

          // Collect errors
          if (batchResult.errors && batchResult.errors.length > 0) {
            if (!result.errors) result.errors = [];
            result.errors.push(...batchResult.errors);
          }
        }
      }

      // Step 4: Documentation (if not already done)
      if (currentPhase !== 'complete') {
        console.log('📝 Docs agent documenting...');
        const docs = this.agents.get('docs');
        if (docs) {
          const { docsUpdated } = await (
            docs as Agent<
              { filesChanged: FileChange[]; task: { description: string } },
              { docsUpdated: FileChange[]; changelogEntry?: string }
            >
          ).execute({
            filesChanged: result.filesChanged,
            task: { description: input.task },
          });
          result.docsUpdated = docsUpdated;
        }
        
        // Save checkpoint after documentation phase
        currentPhase = 'complete';
        await this.saveCheckpoint(input, currentPhase, completedTaskIds, tasks, result, runbook, executionOrder);
      }

      result.success = true;
      this.status = 'completed';
      // Emit build complete event on success
      streamEmitter.emitBuildComplete({ success: true, errors: result.errors });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(sanitizeLogMessage(`[${this.role}] Error: ${errorMessage}`));
      result.errors = [errorMessage];
      this.status = 'failed';
      // Save checkpoint on error
      await this.saveCheckpoint(input, currentPhase, completedTaskIds, tasks, result, runbook, executionOrder);
      // Emit build complete event on failure
      streamEmitter.emitBuildComplete({ success: false, errors: result.errors });
    }

    result.duration = Date.now() - startTime;
    result.totalCost = llmClient.getTotalCost();
    result.totalTokens = llmClient.getTotalTokens();

    return result;
  }

  private getAgent(name: AgentRole): Agent {
    const agent = this.agents.get(name);
    if (!agent) {
      throw new Error(
        `Agent '${name}' not registered. Available: ${[...this.agents.keys()].join(', ')}`
      );
    }
    return agent;
  }

  private async saveCheckpoint(
    input: { task: string; projectPath: string; resumeCheckpointId?: string },
    currentPhase: 'architect' | 'coach' | 'execution' | 'documentation' | 'complete',
    completedTaskIds: Set<string>,
    pendingTasks: SubTask[],
    result: BuildResult,
    runbook: Step[] | null,
    executionOrder: string[][]
  ) {
    const checkpoint: Checkpoint = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      task: input.task,
      projectPath: input.projectPath,
      currentPhase,
      completedTasks: Array.from(completedTaskIds),
      pendingTasks: pendingTasks.filter(task => !completedTaskIds.has(task.id)),
      result: {
        ...result,
        runbook: runbook || undefined,
        executionOrder: executionOrder,
      }
    };
    await checkpointManager.save(checkpoint);
    console.log(`💾 Checkpoint saved: ${checkpoint.id} (phase: ${currentPhase})`);
  }

  private async executeTaskWithResult(
    task: SubTask,
    taskChanges: {
      filesChanged: FileChange[];
      testsWritten: TestFile[];
      testResults?: TestResult;
      errors?: string[];
    }
  ) {
    try {
      const agent = this.getAgent(task.assignedAgent);
      console.log(`⚡ ${task.assignedAgent}: ${task.description}`);
      
      // Emit agent start event
      streamEmitter.emitAgentStart({ agent: task.assignedAgent, task: task.description });

      if (task.assignedAgent === 'code') {
        let iteration = 0;
        let approved = false;

        // Sammle alle Dateiänderungen in einem lokalen Array
        const taskFilesChanged: FileChange[] = [];

        while (!approved && iteration < this.maxIterations) {
          // Code writes
          const codeResult = await (
            agent as Agent<
              { task: SubTask; feedback?: ReviewResult },
              { filesChanged: FileChange[]; explanation: string; needsReview: boolean }
            >
          ).execute({ task, feedback: undefined });
          taskFilesChanged.push(...codeResult.filesChanged);
          
          // Emit file change events
          codeResult.filesChanged.forEach(fileChange => {
            streamEmitter.emitFileChange({
              path: fileChange.path,
              action: fileChange.action,
            });
          });

          // Review checks
          const review = this.agents.get('review');
          if (review) {
            const reviewResult = await (
              review as Agent<
                { filesChanged: FileChange[]; originalTask: SubTask },
                {
                  approved: boolean;
                  issues: Issue[];
                  summary: string;
                  mustFix: Issue[];
                  suggestions: Issue[];
                }
              >
            ).execute({
              filesChanged: codeResult.filesChanged,
              originalTask: task,
            });

            if (reviewResult.approved) {
              approved = true;
            } else {
              console.log(`🔄 Review found issues, iteration ${iteration + 1}`);
              // Safe assignment with proper typing
              task.input = { ...task.input, feedback: reviewResult as ReviewResult };
            }
          } else {
            approved = true;
            break; // Exit loop if no review agent
          }
          iteration++;
        }

        // Store file changes
        taskChanges.filesChanged.push(...taskFilesChanged);

        // Test writes tests
        const test = this.agents.get('test');
        if (test) {
          const testResult = await (
            test as Agent<
              { filesChanged: FileChange[]; task: SubTask },
              { testsWritten: TestFile[]; testResults: TestResult; failures?: TestFailure[] }
            >
          ).execute({
            filesChanged: taskFilesChanged,
            task,
          });
          taskChanges.testsWritten.push(...testResult.testsWritten);
          taskChanges.testResults = testResult.testResults;
            
          // Emit test run event
          if (testResult.testResults) {
            streamEmitter.emitTestRun({
              passed: testResult.testResults.passed,
              failed: testResult.testResults.failed,
              total: testResult.testResults.passed + testResult.testResults.failed + (testResult.testResults.skipped || 0),
            });
          }
        }
      }
    } catch (error: unknown) {
      // Wenn der Agent nicht existiert, loggen wir einen Fehler und fahren mit der nächsten Task fort
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(
        sanitizeLogMessage(
          `❌ Agent '${task.assignedAgent}' not found for task ${task.id}: ${errorMessage}`
        )
      );
      // Store error in taskChanges
      if (!taskChanges.errors) taskChanges.errors = [];
      taskChanges.errors.push(`Task ${task.id} failed: ${errorMessage}`);
      throw error; // Re-throw to be handled by the caller
    }
  }
}
