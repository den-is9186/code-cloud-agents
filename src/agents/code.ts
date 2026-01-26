import { Agent, AgentRole, SubTask, FileChange, ReviewResult } from './types';
import { llmClient } from '../llm/client';
import { executeTool, validatePath } from '../tools';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';
import { sanitizeLogMessage } from '../utils/security';

export class CodeAgent implements Agent {
  role: AgentRole = 'code';
  model: string;
  status = 'idle' as const;

  constructor(model: string) {
    this.model = model;
  }

  async execute(input: { task: SubTask; feedback?: ReviewResult }): Promise<{
    filesChanged: FileChange[];
    explanation: string;
    needsReview: boolean;
  }> {
    // Read existing files if specified
    let existingCode = '';
    for (const file of input.task.input.files || []) {
      try {
        // Validate path before reading to prevent path traversal
        const safePath = validatePath(file);
        const { content } = await executeTool('file_read', { path: safePath });
        existingCode += `\n--- ${file} ---\n${content}\n`;
      } catch {}
    }

    const feedbackContext = input.feedback
      ? `\n\nReview Feedback (bitte beheben):\n${input.feedback.mustFix.map((i: any) => `- ${i.message}`).join('\n')}` +
        (input.feedback.summary ? `\n\nSummary: ${input.feedback.summary}` : '') +
        (input.feedback.suggestions && input.feedback.suggestions.length > 0 
          ? `\n\nSuggestions:\n${input.feedback.suggestions.map((i: any) => `- ${i.message}`).join('\n')}`
          : '')
      : '';

    const response = await llmClient.chat(this.model, [
      {
        role: 'system',
        content: `Du bist ein Code Agent. Schreibe oder modifiziere Code.

Antworte NUR mit validem JSON:
{
  "filesChanged": [
    {
      "path": "pfad/zur/datei.ts",
      "action": "create" | "modify",
      "content": "vollständiger Dateiinhalt"
    }
  ],
  "explanation": "Was wurde gemacht"
}`
      },
      {
        role: 'user',
        content: `Aufgabe: ${input.task.description}\n\nBestehender Code:${existingCode}${feedbackContext}`
      }
    ]);

    try {
      const CodeAgentResponseSchema = z.object({
        filesChanged: z.array(z.object({
          path: z.string(),
          action: z.enum(['create', 'modify']),
          content: z.string()
        })),
        explanation: z.string()
      });
      const parsed = safeJsonParse(response.content, CodeAgentResponseSchema);

      // Write files
      for (const file of parsed.filesChanged) {
        if (file.action === 'create' || file.action === 'modify') {
          await executeTool('file_write', { path: file.path, content: file.content });
        }
      }

      return {
        filesChanged: parsed.filesChanged,
        explanation: parsed.explanation,
        needsReview: true
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(sanitizeLogMessage(`[${this.role}] Error: ${errorMessage}`));
      return {
        filesChanged: [],
        explanation: `Error: ${errorMessage}`,
        needsReview: false
      };
    }
  }
}
