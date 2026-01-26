import { Agent, AgentRole, FileChange } from './types';
import { llmClient } from '../llm/client';
import { executeTool, validatePath } from '../tools';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';
import { sanitizeLogMessage } from '../utils/security';
import { logger } from '../utils/logger';

export class RefactorAgent implements Agent {
  role: AgentRole = 'refactor';
  model: string;
  status = 'idle' as const;

  constructor(model: string) {
    this.model = model;
  }

  async execute(input: { task: string; files: string[]; focusAreas?: string[] }): Promise<{
    filesChanged: FileChange[];
    analysis: {
      codeSmells: string[];
      improvements: string[];
      complexity: 'low' | 'medium' | 'high';
    };
    explanation: string;
  }> {
    // Read all specified files
    let existingCode = '';
    const fileContents: Record<string, string> = {};

    for (const file of input.files) {
      try {
        // Validate path before reading to prevent path traversal
        const safePath = validatePath(file);
        const { content } = await executeTool('file_read', { path: safePath });
        existingCode += `\n--- ${file} ---\n${content}\n`;
        fileContents[file] = content;
      } catch (error) {
        logger.warn('Failed to read file', {
          agent: 'refactor',
          file,
          error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
        });
      }
    }

    if (!existingCode.trim()) {
      return {
        filesChanged: [],
        analysis: {
          codeSmells: [],
          improvements: [],
          complexity: 'low',
        },
        explanation: 'No files could be read for refactoring',
      };
    }

    // Build focus areas context
    const focusContext =
      input.focusAreas && input.focusAreas.length > 0
        ? `\n\nFokussiere auf folgende Bereiche:\n${input.focusAreas.map((area) => `- ${area}`).join('\n')}`
        : '';

    const response = await llmClient.chat(this.model, [
      {
        role: 'system',
        content: `Du bist ein Refactoring Agent. Analysiere Code und verbessere ihn OHNE die Funktionalität zu ändern.

Refactoring-Prinzipien:
- DRY (Don't Repeat Yourself) - Duplikate eliminieren
- SOLID Principles - Clean Architecture
- Lesbarkeit - Klare Namen, einfache Strukturen
- Performance - Effiziente Algorithmen
- Testbarkeit - Lose Kopplung, klare Interfaces
- Security - Input Validation, Error Handling

Antworte NUR mit validem JSON:
{
  "analysis": {
    "codeSmells": ["Liste gefundener Code Smells"],
    "improvements": ["Liste möglicher Verbesserungen"],
    "complexity": "low" | "medium" | "high"
  },
  "filesChanged": [
    {
      "path": "pfad/zur/datei.ts",
      "action": "modify",
      "content": "vollständiger refactorierter Dateiinhalt"
    }
  ],
  "explanation": "Zusammenfassung aller Refactorings"
}`,
      },
      {
        role: 'user',
        content: `Aufgabe: ${input.task}\n\nBestehender Code:${existingCode}${focusContext}`,
      },
    ]);

    try {
      const RefactorAgentResponseSchema = z.object({
        analysis: z.object({
          codeSmells: z.array(z.string()),
          improvements: z.array(z.string()),
          complexity: z.enum(['low', 'medium', 'high']),
        }),
        filesChanged: z.array(
          z.object({
            path: z.string(),
            action: z.enum(['modify']),
            content: z.string(),
          })
        ),
        explanation: z.string(),
      });
      const parsed = safeJsonParse(response.content, RefactorAgentResponseSchema);

      // Write refactored files
      for (const file of parsed.filesChanged) {
        if (file.action === 'modify') {
          await executeTool('file_write', { path: file.path, content: file.content });
        }
      }

      return {
        filesChanged: parsed.filesChanged,
        analysis: parsed.analysis,
        explanation: parsed.explanation,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      logger.error('Refactor operation failed', {
        agent: this.role,
        error: sanitizeLogMessage(errorMessage),
        stack: stack ? sanitizeLogMessage(stack) : undefined,
      });
      return {
        filesChanged: [],
        analysis: {
          codeSmells: [],
          improvements: [],
          complexity: 'low',
        },
        explanation: `Error: ${errorMessage}`,
      };
    }
  }
}
