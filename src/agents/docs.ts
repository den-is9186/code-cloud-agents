import { Agent, AgentRole, FileChange } from './types';
import { llmClient } from '../llm/client';
import { executeTool } from '../tools';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';

export class DocsAgent implements Agent {
  role: AgentRole = 'docs';
  model = 'llama-4-scout-local'; // Läuft lokal, $0 Kosten
  status = 'idle' as const;

  async execute(input: { filesChanged: FileChange[]; task: { description: string } }): Promise<{
    docsUpdated: FileChange[];
    changelogEntry?: string;
  }> {
    const changes = input.filesChanged
      .map(f => `${f.action}: ${f.path}`)
      .join('\n');

    const response = await llmClient.chat(this.model, [
      {
        role: 'system',
        content: `Du bist ein Documentation Agent. Aktualisiere Dokumentation basierend auf Code-Änderungen.

Antworte NUR mit validem JSON:
{
  "docsUpdated": [
    {
      "path": "README.md",
      "action": "modify",
      "content": "Vollständiger neuer Inhalt"
    }
  ],
  "changelogEntry": "- Added feature X"
}`
      },
      {
        role: 'user',
        content: `Aufgabe: ${input.task.description}\n\nÄnderungen:\n${changes}`
      }
    ]);

    try {
      const DocsResponseSchema = z.object({
        docsUpdated: z.array(z.object({
          path: z.string(),
          action: z.enum(['create', 'modify', 'delete']),
          content: z.string()
        })),
        changelogEntry: z.string().optional()
      });
      const parsed = safeJsonParse(response.content, DocsResponseSchema);

      // Write doc files
      for (const doc of parsed.docsUpdated) {
        await executeTool('file_write', { path: doc.path, content: doc.content });
      }

      return parsed;
    } catch {
      return { docsUpdated: [] };
    }
  }
}
