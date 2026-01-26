import { Agent, AgentRole, SubTask, FileChange, ReviewFeedback } from './types';
import { llmClient } from '../llm/client';
import { executeTool } from '../tools';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';

export class CodeAgent implements Agent {
  role: AgentRole = 'code';
  model: string;
  status = 'idle' as const;

  constructor(model: string) {
    this.model = model;
  }

  async execute(input: { task: SubTask; feedback?: ReviewFeedback }): Promise<{
    filesChanged: FileChange[];
    explanation: string;
    needsReview: boolean;
  }> {
    // Read existing files if specified
    let existingCode = '';
    for (const file of input.task.input.files || []) {
      try {
        const { content } = await executeTool('file_read', { path: file });
        existingCode += `\n--- ${file} ---\n${content}\n`;
      } catch {}
    }

    const feedbackContext = input.feedback
      ? `\n\nReview Feedback (bitte beheben):\n${input.feedback.mustFix.map(i => `- ${i.message}`).join('\n')}`
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
    } catch (error: any) {
      return {
        filesChanged: [],
        explanation: `Error: ${error.message}`,
        needsReview: false
      };
    }
  }
}
