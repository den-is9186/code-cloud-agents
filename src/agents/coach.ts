import { Agent, AgentRole, AgentStatus, Step, SubTask, Dependency } from './types';
import { llmClient } from '../llm/client';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';
import { sanitizeLogMessage } from '../utils/security';

export class CoachAgent implements Agent {
  role: AgentRole = 'coach';
  model: string;
  status: AgentStatus = 'idle';

  constructor(model: string) {
    this.model = model;
  }

  private getEmptyResult(): {
    tasks: SubTask[];
    executionOrder: string[][];
    dependencies: Dependency[];
  } {
    return {
      tasks: [],
      executionOrder: [],
      dependencies: [],
    };
  }

  async execute(input: { runbook: Step[]; context: unknown }): Promise<{
    tasks: SubTask[];
    executionOrder: string[][];
    dependencies: Dependency[];
  }> {
    this.status = 'working';
    try {
      const response = await llmClient.chat(this.model, [
        {
          role: 'system',
          content: `Du bist ein Coach der Tasks plant. Zerlege das Runbook in konkrete Sub-Tasks.

Antworte NUR mit validem JSON:
{
  "tasks": [
    {
      "id": "task-1",
      "stepId": "step-1",
      "assignedAgent": "code" | "test" | "review" | "docs",
      "description": "Konkrete Aufgabe",
      "input": {},
      "expectedOutput": "Was erwartet wird",
      "status": "pending"
    }
  ],
  "executionOrder": [["task-1"], ["task-2", "task-3"]],
  "dependencies": [{"taskId": "task-2", "dependsOn": ["task-1"]}]
}`,
        },
        {
          role: 'user',
          content: `Runbook:\n${JSON.stringify(input.runbook, null, 2)}`,
        },
      ]);

      try {
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
        const result = safeJsonParse(response.content, CoachResponseSchema);
        this.status = 'completed';
        return result;
      } catch {
        // Fallback: One task per step
        const tasks: SubTask[] = input.runbook.map((step, i) => ({
          id: `task-${i + 1}`,
          stepId: step.id,
          assignedAgent: 'code' as const,
          description: step.description,
          input: { files: step.files },
          expectedOutput: step.expectedOutcome,
          status: 'pending' as const,
        }));

        this.status = 'completed';
        return {
          tasks,
          executionOrder: [tasks.map((t) => t.id)],
          dependencies: [],
        };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(sanitizeLogMessage(`[${this.role}] Error: ${errorMessage}`));
      this.status = 'failed';
      return this.getEmptyResult();
    }
  }
}
