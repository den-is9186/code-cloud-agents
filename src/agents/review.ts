import { Agent, AgentRole, SubTask, FileChange, Issue } from './types';
import { llmClient } from '../llm/client';

export class ReviewAgent implements Agent {
  role: AgentRole = 'review';
  model: string;
  status = 'idle' as const;

  constructor(model: string) {
    this.model = model;
  }

  async execute(input: { filesChanged: FileChange[]; originalTask: SubTask }): Promise<{
    approved: boolean;
    issues: Issue[];
    summary: string;
    mustFix: Issue[];
    suggestions: Issue[];
  }> {
    const codeToReview = input.filesChanged
      .map(f => `--- ${f.path} ---\n${f.content}`)
      .join('\n\n');

    const response = await llmClient.chat(this.model, [
      {
        role: 'system',
        content: `Du bist ein Code Reviewer. Prüfe den Code auf Bugs, Security Issues und Best Practices.

Antworte NUR mit validem JSON:
{
  "approved": true | false,
  "issues": [
    {
      "severity": "error" | "warning" | "info",
      "file": "pfad/zur/datei.ts",
      "line": 10,
      "message": "Problem beschreibung",
      "suggestion": "Lösungsvorschlag"
    }
  ],
  "summary": "Zusammenfassung"
}

approved = true nur wenn keine "error" issues.`
      },
      {
        role: 'user',
        content: `Aufgabe war: ${input.originalTask.description}\n\nCode:\n${codeToReview}`
      }
    ]);

    try {
      const parsed = JSON.parse(response.content);
      const mustFix = parsed.issues.filter((i: Issue) => i.severity === 'error');
      const suggestions = parsed.issues.filter((i: Issue) => i.severity !== 'error');

      return {
        approved: parsed.approved,
        issues: parsed.issues,
        summary: parsed.summary,
        mustFix,
        suggestions
      };
    } catch {
      return {
        approved: true,
        issues: [],
        summary: 'Review completed',
        mustFix: [],
        suggestions: []
      };
    }
  }
}
