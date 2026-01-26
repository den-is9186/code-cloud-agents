import { Agent, AgentRole, Step } from './types';
import { llmClient } from '../llm/client';
import { executeTool } from '../tools';
import { RunbookSchema, safeJsonParse } from '../utils/schemas';

export class ArchitectAgent implements Agent {
  role: AgentRole = 'architect';
  model: string;
  status = 'idle' as const;

  constructor(model: string) {
    this.model = model;
  }

  async execute(input: { task: string; projectPath: string }): Promise<{ runbook: Step[]; estimatedComplexity: string }> {
    // Get project context
    const { files } = await executeTool('directory_list', {
      path: input.projectPath,
      recursive: true
    });

    // Read key files for context
    const keyFiles = files.filter((f: string) =>
      f.endsWith('package.json') ||
      f.endsWith('tsconfig.json') ||
      f.includes('README')
    ).slice(0, 5);

    let context = '';
    for (const file of keyFiles) {
      try {
        const { content } = await executeTool('file_read', { path: file });
        context += `\n--- ${file} ---\n${content.slice(0, 1000)}\n`;
      } catch {}
    }

    const response = await llmClient.chat(this.model, [
      {
        role: 'system',
        content: `Du bist ein Software Architect. Erstelle ein detailliertes Runbook für die gegebene Aufgabe.

Antworte NUR mit validem JSON in diesem Format:
{
  "runbook": [
    {
      "id": "step-1",
      "description": "Was zu tun ist",
      "files": ["pfad/zur/datei.ts"],
      "expectedOutcome": "Was danach erreicht ist",
      "estimatedTokens": 1000
    }
  ],
  "estimatedComplexity": "low" | "medium" | "high"
}`
      },
      {
        role: 'user',
        content: `Projekt-Struktur:\n${files.slice(0, 50).join('\n')}\n\nKontext:\n${context}\n\nAufgabe: ${input.task}`
      }
    ]);

    try {
      const parsed = safeJsonParse(response.content, RunbookSchema.extend({
        estimatedComplexity: z.enum(['low', 'medium', 'high'])
      }));
      return parsed;
    } catch {
      // Fallback: Simple single-step runbook
      return {
        runbook: [{
          id: 'step-1',
          description: input.task,
          files: [],
          expectedOutcome: 'Task completed',
          estimatedTokens: 2000
        }],
        estimatedComplexity: 'medium' as const
      };
    }
  }
}
