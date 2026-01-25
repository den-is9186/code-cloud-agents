import { Agent, AgentRole, Step, SubTask, Dependency } from './types';
import { llmClient } from '../llm/client';

export class CoachAgent implements Agent {
  role: AgentRole = 'coach';
  model: string;
  status = 'idle' as const;

  constructor(model: string) {
    this.model = model;
  }

  async execute(input: { runbook: Step[]; context: any }): Promise<{
    tasks: SubTask[];
    executionOrder: string[][];
    dependencies: Dependency[]
  }> {
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
}`
      },
      {
        role: 'user',
        content: `Runbook:\n${JSON.stringify(input.runbook, null, 2)}`
      }
    ]);

    try {
      return JSON.parse(response.content);
    } catch {
      // Fallback: One task per step
      const tasks: SubTask[] = input.runbook.map((step, i) => ({
        id: `task-${i + 1}`,
        stepId: step.id,
        assignedAgent: 'code' as AgentRole,
        description: step.description,
        input: { files: step.files },
        expectedOutput: step.expectedOutcome,
        status: 'pending' as const
      }));

      return {
        tasks,
        executionOrder: [tasks.map(t => t.id)],
        dependencies: []
      };
    }
  }
}
