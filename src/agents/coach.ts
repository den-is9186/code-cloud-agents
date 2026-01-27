import { Agent, AgentRole, AgentStatus, Step, SubTask, Dependency } from './types';
import { llmClient } from '../llm/client';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';
import { sanitizeLogMessage } from '../utils/security';
import { logger } from '../utils/logger';

/**
 * Coach Agent Input
 */
interface CoachInput {
  runbook: Step[];
  context?: unknown;
}

/**
 * Coach Agent Output
 */
interface CoachOutput {
  tasks: SubTask[];
  executionOrder: string[][];
  dependencies: Dependency[];
}

/**
 * CoachAgent - Task Decomposition & Work Distribution
 *
 * Responsibilities:
 * - Decompose runbook steps into granular sub-tasks
 * - Assign tasks to appropriate agents (code/test/review/docs)
 * - Define execution order and parallelization strategy
 * - Manage dependencies between tasks
 * - Optimize for parallel execution where possible
 */
export class CoachAgent implements Agent {
  role: AgentRole = 'coach';
  model: string;
  status: AgentStatus = 'idle';

  constructor(model: string) {
    this.model = model;
  }

  /**
   * Execute task planning
   */
  async execute(input: CoachInput): Promise<CoachOutput> {
    this.status = 'working';
    const startTime = Date.now();

    try {
      logger.info('Coach planning tasks', {
        agent: 'coach',
        stepCount: input.runbook.length,
      });

      // Validate input
      if (!input.runbook || input.runbook.length === 0) {
        logger.warn('Empty runbook provided to coach', { agent: 'coach' });
        return this.getEmptyResult();
      }

      // Build LLM prompt
      const response = await llmClient.chat(this.model, [
        {
          role: 'system',
          content: this.buildSystemPrompt(),
        },
        {
          role: 'user',
          content: this.buildUserPrompt(input.runbook),
        },
      ]);

      // Parse and validate response
      const result = this.parseResponse(response.content, input.runbook);

      // Validate dependencies
      this.validateDependencies(result);

      // Optimize execution order
      const optimized = this.optimizeExecutionOrder(result);

      const duration = Date.now() - startTime;
      logger.info('Coach planning completed', {
        agent: 'coach',
        tasksCreated: optimized.tasks.length,
        parallelBatches: optimized.executionOrder.length,
        duration,
      });

      this.status = 'completed';
      return optimized;
    } catch (error) {
      this.status = 'failed';
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Coach planning failed', {
        agent: 'coach',
        error: sanitizeLogMessage(errorMsg),
      });

      // Return fallback
      return this.getFallbackOutput(input.runbook);
    }
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(): string {
    return `Du bist ein Coach Agent. Deine Aufgabe ist es, Runbook-Steps in konkrete Sub-Tasks zu zerlegen und auf Agents zu verteilen.

VERFÜGBARE AGENTS:
- code: Schreibt/modifiziert Code
- review: Prüft Code auf Bugs und Security
- test: Schreibt und führt Tests aus
- docs: Aktualisiert Dokumentation

AUFGABEN:
1. Jeden Runbook-Step in granulare Sub-Tasks zerlegen
2. Jede Sub-Task einem Agent zuweisen
3. Dependencies zwischen Tasks definieren
4. Execution-Reihenfolge planen
5. Parallelisierung ermöglichen wo sinnvoll

REGELN:
- Sub-Tasks müssen ATOMIC sein (eine Sache tun)
- Jede Sub-Task braucht klare Input/Output Specs
- code MUSS vor review
- review MUSS vor test (optional: parallel wenn keine direkten Dependencies)
- test und docs können parallel laufen
- Dependencies müssen zyklenfrei sein

PARALLELISIERUNG:
- Nur Tasks ohne Dependencies können parallel
- Execution-Order ist Array von Batches: [["task-1"], ["task-2", "task-3"], ["task-4"]]
  → Batch 1: task-1 (alleine)
  → Batch 2: task-2 und task-3 (parallel)
  → Batch 3: task-4 (alleine)

Antworte NUR mit validem JSON:
{
  "tasks": [
    {
      "id": "task-1",
      "stepId": "step-1",
      "assignedAgent": "code" | "test" | "review" | "docs",
      "description": "Konkrete, actionable Beschreibung",
      "input": { "files": ["path/to/file.ts"] },
      "expectedOutput": "Was produziert wird",
      "status": "pending"
    }
  ],
  "executionOrder": [["task-1"], ["task-2", "task-3"]],
  "dependencies": [
    { "taskId": "task-2", "dependsOn": ["task-1"] }
  ]
}`;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(runbook: Step[]): string {
    return `Erstelle Sub-Tasks für dieses Runbook:

${JSON.stringify(runbook, null, 2)}

Erstelle granulare, atomic Tasks mit klaren Dependencies und optimaler Parallelisierung.`;
  }

  /**
   * Parse and validate LLM response
   */
  private parseResponse(content: string, _runbook: Step[]): CoachOutput {
    const CoachResponseSchema = z.object({
      tasks: z.array(
        z.object({
          id: z.string(),
          stepId: z.string(),
          assignedAgent: z.enum(['code', 'test', 'review', 'docs']),
          description: z.string(),
          input: z.any(),
          expectedOutput: z.string(),
          status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
        })
      ),
      executionOrder: z.array(z.array(z.string())),
      dependencies: z.array(
        z.object({
          taskId: z.string(),
          dependsOn: z.array(z.string()),
        })
      ),
    });

    try {
      return safeJsonParse(content, CoachResponseSchema);
    } catch (error) {
      logger.warn('Failed to parse coach response, using fallback', {
        agent: 'coach',
        error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
      });
      throw error;
    }
  }

  /**
   * Validate dependencies
   */
  private validateDependencies(output: CoachOutput): void {
    const taskIds = new Set(output.tasks.map((t) => t.id));

    // Check all dependency references exist
    for (const dep of output.dependencies) {
      if (!taskIds.has(dep.taskId)) {
        throw new Error(`Invalid dependency: task ${dep.taskId} not found`);
      }
      for (const depOn of dep.dependsOn) {
        if (!taskIds.has(depOn)) {
          throw new Error(
            `Invalid dependency: task ${dep.taskId} depends on ${depOn} which doesn't exist`
          );
        }
      }
    }

    // Check for cycles
    this.detectCycles(output.dependencies);
  }

  /**
   * Detect dependency cycles
   */
  private detectCycles(dependencies: Dependency[]): void {
    const graph = new Map<string, string[]>();

    for (const dep of dependencies) {
      graph.set(dep.taskId, dep.dependsOn);
    }

    const visited = new Set<string>();
    const stack = new Set<string>();

    const visit = (taskId: string): void => {
      if (stack.has(taskId)) {
        throw new Error(`Dependency cycle detected involving task ${taskId}`);
      }
      if (visited.has(taskId)) return;

      visited.add(taskId);
      stack.add(taskId);

      const deps = graph.get(taskId) || [];
      for (const dep of deps) {
        visit(dep);
      }

      stack.delete(taskId);
    };

    for (const taskId of graph.keys()) {
      visit(taskId);
    }
  }

  /**
   * Optimize execution order for maximum parallelization
   */
  private optimizeExecutionOrder(output: CoachOutput): CoachOutput {
    const depMap = new Map<string, Set<string>>();

    // Build dependency map
    for (const dep of output.dependencies) {
      if (!depMap.has(dep.taskId)) {
        depMap.set(dep.taskId, new Set());
      }
      for (const d of dep.dependsOn) {
        depMap.get(dep.taskId)?.add(d);
      }
    }

    // Topological sort with level-based batching
    const levels: string[][] = [];
    const completed = new Set<string>();
    const taskIds = output.tasks.map((t) => t.id);

    while (completed.size < taskIds.length) {
      const batch: string[] = [];

      for (const taskId of taskIds) {
        if (completed.has(taskId)) continue;

        const deps = depMap.get(taskId) || new Set();
        const allDepsSatisfied = [...deps].every((d) => completed.has(d));

        if (allDepsSatisfied) {
          batch.push(taskId);
        }
      }

      if (batch.length === 0) {
        // Shouldn't happen if cycle detection worked
        logger.error('Cannot make progress in execution order optimization', {
          agent: 'coach',
        });
        break;
      }

      levels.push(batch);
      batch.forEach((id) => completed.add(id));
    }

    return {
      ...output,
      executionOrder: levels,
    };
  }

  /**
   * Get empty result
   */
  private getEmptyResult(): CoachOutput {
    return {
      tasks: [],
      executionOrder: [],
      dependencies: [],
    };
  }

  /**
   * Get fallback output when LLM fails
   */
  private getFallbackOutput(runbook: Step[]): CoachOutput {
    logger.warn('Using fallback coach output', { agent: 'coach' });

    // Create one task per step, sequential execution
    const tasks: SubTask[] = runbook.map((step, i) => ({
      id: `task-${i + 1}`,
      stepId: step.id,
      assignedAgent: 'code' as const,
      description: step.description,
      input: { files: step.files },
      expectedOutput: step.expectedOutcome,
      status: 'pending' as const,
    }));

    // Add review task after all code tasks
    if (tasks.length > 0) {
      tasks.push({
        id: `task-review`,
        stepId: 'review',
        assignedAgent: 'review',
        description: 'Review all code changes',
        input: {},
        expectedOutput: 'Code review completed',
        status: 'pending',
      });
    }

    // Sequential execution order
    const executionOrder = tasks.map((t) => [t.id]);

    // Dependencies: each task depends on previous
    const dependencies: Dependency[] = tasks.slice(1).map((task, i) => ({
      taskId: task.id,
      dependsOn: [tasks[i]?.id || ''].filter((id) => id.length > 0),
    }));

    return {
      tasks,
      executionOrder,
      dependencies,
    };
  }
}
