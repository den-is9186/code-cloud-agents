import { Agent, AgentRole, BuildResult, SubTask } from './types';
import { llmClient } from '../llm/client';

interface SupervisorConfig {
  model: string;
  maxIterations: number;
  preset: string;
}

export class SupervisorAgent implements Agent {
  role: AgentRole = 'supervisor';
  model: string;
  status = 'idle' as const;

  private agents: Map<AgentRole, Agent> = new Map();
  private maxIterations: number;

  constructor(config: SupervisorConfig) {
    this.model = config.model;
    this.maxIterations = config.maxIterations;
  }

  registerAgent(agent: Agent) {
    this.agents.set(agent.role, agent);
  }

  async execute(input: { task: string; projectPath: string }): Promise<BuildResult> {
    const startTime = Date.now();
    const result: BuildResult = {
      success: false,
      filesChanged: [],
      testsWritten: [],
      docsUpdated: [],
      totalCost: 0,
      totalTokens: 0,
      duration: 0
    };

    try {
      // Step 1: Architect creates runbook
      console.log('📐 Architect analyzing task...');
      const architect = this.getAgent('architect');
      const { runbook } = await architect.execute(input);

      // Step 2: Coach creates subtasks
      console.log('🎯 Coach planning tasks...');
      const coach = this.getAgent('coach');
      const { tasks, executionOrder } = await coach.execute({ runbook, context: input });

      // Step 3: Execute tasks
      for (const taskBatch of executionOrder) {
        for (const taskId of taskBatch) {
          const task = tasks.find((t: SubTask) => t.id === taskId);
          if (!task) continue;

          await this.executeTask(task, result);
        }
      }

      // Step 4: Documentation
      console.log('📝 Docs agent documenting...');
      const docs = this.agents.get('docs');
      if (docs) {
        const { docsUpdated } = await docs.execute({
          filesChanged: result.filesChanged,
          task: { description: input.task }
        });
        result.docsUpdated = docsUpdated;
      }

      result.success = true;
    } catch (error: any) {
      result.errors = [error.message];
    }

    result.duration = Date.now() - startTime;
    result.totalCost = llmClient.getTotalCost();
    result.totalTokens = llmClient.getTotalTokens();

    return result;
  }

  private getAgent(name: AgentRole): Agent {
    const agent = this.agents.get(name);
    if (!agent) {
      throw new Error(`Agent '${name}' not registered. Available: ${[...this.agents.keys()].join(', ')}`);
    }
    return agent;
  }

  private async executeTask(task: SubTask, result: BuildResult) {
    try {
      const agent = this.getAgent(task.assignedAgent);
      console.log(`⚡ ${task.assignedAgent}: ${task.description}`);

      if (task.assignedAgent === 'code') {
        let iteration = 0;
        let approved = false;
        
        // Sammle alle Dateiänderungen in einem lokalen Array
        const taskFilesChanged: any[] = [];

        while (!approved && iteration < this.maxIterations) {
          // Code writes
          const codeResult = await agent.execute({ task, feedback: undefined });
          taskFilesChanged.push(...codeResult.filesChanged);

          // Review checks
          const review = this.agents.get('review');
          if (review) {
            const reviewResult = await review.execute({
              filesChanged: codeResult.filesChanged,
              originalTask: task
            });

            if (reviewResult.approved) {
              approved = true;
            } else {
              console.log(`🔄 Review found issues, iteration ${iteration + 1}`);
              // Safe assignment with proper typing
              task.input = { ...task.input, feedback: reviewResult };
            }
          } else {
            approved = true;
            break; // Exit loop if no review agent
          }
          iteration++;
        }

        // Füge alle gesammelten Dateiänderungen am Ende hinzu
        result.filesChanged.push(...taskFilesChanged);

        // Test writes tests
        const test = this.agents.get('test');
        if (test) {
          const testResult = await test.execute({
            filesChanged: taskFilesChanged,
            task
          });
          result.testsWritten.push(...testResult.testsWritten);
          result.testResults = testResult.testResults;
        }
      }
    } catch (error: unknown) {
      // Wenn der Agent nicht existiert, loggen wir einen Fehler und fahren mit der nächsten Task fort
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Agent '${task.assignedAgent}' not found for task ${task.id}:`, errorMessage);
      // Store error in result for better error handling
      if (!result.errors) result.errors = [];
      result.errors.push(`Task ${task.id} failed: ${errorMessage}`);
    }
  }
}
