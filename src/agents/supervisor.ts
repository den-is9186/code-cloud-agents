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

  async execute(input: { task: string; projectPath: string }): Promise<BuildResult> {
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

    try {
      // Step 1: Architect creates runbook
      console.log('📐 Architect analyzing task...');
      const architectStart = Date.now();
      const architect = this.getAgent('architect');
      const { runbook } = await (
        architect as Agent<
          { task: string; projectPath: string },
          { runbook: Step[]; estimatedComplexity: string }
        >
      ).execute(input);
      const architectDuration = Date.now() - architectStart;
      streamEmitter.emitAgentComplete({ agent: 'architect', success: true, duration: architectDuration });

      // Step 2: Coach creates subtasks
      console.log('🎯 Coach planning tasks...');
      const coachStart = Date.now();
      const coach = this.getAgent('coach');
      const { tasks, executionOrder } = await (
        coach as Agent<
          { runbook: Step[]; context: unknown },
          { tasks: SubTask[]; executionOrder: string[][]; dependencies: Dependency[] }
        >
      ).execute({ runbook, context: input });
      const coachDuration = Date.now() - coachStart;
      streamEmitter.emitAgentComplete({ agent: 'coach', success: true, duration: coachDuration });

      // Step 3: Execute tasks
      // Create a Map for O(1) task lookups instead of O(n) find() in nested loops
      const taskMap = new Map(tasks.map((t: SubTask) => [t.id, t]));

      for (const taskBatch of executionOrder) {
        // Execute tasks in the same batch in parallel
        const batchResults = await Promise.all(
          taskBatch.map(async (taskId: string) => {
            const task = taskMap.get(taskId);
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

      // Step 4: Documentation
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

      result.success = true;
      this.status = 'completed';
      // Emit build complete event on success
      streamEmitter.emitBuildComplete({ success: true, errors: result.errors });
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(sanitizeLogMessage(`[${this.role}] Error: ${errorMessage}`));
      result.errors = [errorMessage];
      this.status = 'failed';
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
