import { Agent, AgentRole, Step } from './types';
import { llmClient } from '../llm/client';
import { executeTool } from '../tools';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';
import { sanitizeLogMessage } from '../utils/security';
import { logger } from '../utils/logger';

export class ArchitectAgent implements Agent {
  role: AgentRole = 'architect';
  model: string;
  status = 'idle' as const;

  constructor(model: string) {
    this.model = model;
  }

  async execute(input: {
    task: string;
    projectPath: string;
  }): Promise<{ runbook: Step[]; estimatedComplexity: string }> {
    // Get project context
    const { files } = await executeTool('directory_list', {
      path: input.projectPath,
      recursive: true,
    });

    // Read key files for context in parallel
    const keyFiles = files
      .filter(
        (f: string) =>
          f.endsWith('package.json') || f.endsWith('tsconfig.json') || f.includes('README')
      )
      .slice(0, 10); // Increased limit for better context

    // Read files in parallel using Promise.all
    const fileReadPromises = keyFiles.map(async (file: string) => {
      try {
        const { content } = await executeTool('file_read', { path: file });
        return `\n--- ${file} ---\n${content.slice(0, 1000)}\n`;
      } catch (error) {
        logger.warn('Failed to read file', {
          agent: 'architect',
          file,
          error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
        });
        return ''; // Return empty string for failed reads
      }
    });

    const fileContents = await Promise.all(fileReadPromises);
    const context = fileContents.join('');

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
}`,
      },
      {
        role: 'user',
        content: `Projekt-Struktur:\n${files.slice(0, 50).join('\n')}\n\nKontext:\n${context}\n\nAufgabe: ${input.task}`,
      },
    ]);

    try {
      const ArchitectResponseSchema = z.object({
        runbook: z.array(
          z.object({
            id: z.string(),
            description: z.string(),
            files: z.array(z.string()),
            expectedOutcome: z.string(),
            estimatedTokens: z.number(),
          })
        ),
        estimatedComplexity: z.enum(['low', 'medium', 'high']),
      });
      const parsed = safeJsonParse(response.content, ArchitectResponseSchema);
      return parsed;
    } catch {
      // Fallback: Simple single-step runbook
      return {
        runbook: [
          {
            id: 'step-1',
            description: input.task,
            files: [],
            expectedOutcome: 'Task completed',
            estimatedTokens: 2000,
          },
        ],
        estimatedComplexity: 'medium' as const,
      };
    }
  }
}
