import { Agent, AgentRole, FileChange } from './types';
import { llmClient } from '../llm/client';
import { executeTool, validatePath } from '../tools';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';
import { sanitizeLogMessage } from '../utils/security';
import { logger } from '../utils/logger';

export interface MergeConflict {
  file: string;
  conflictType: 'content' | 'structure' | 'deletion';
  baseContent?: string;
  ourContent: string;
  theirContent: string;
  resolution: string;
  confidence: 'high' | 'medium' | 'low';
}

export class MergeAgent implements Agent {
  role: AgentRole = 'merge';
  model: string;
  status = 'idle' as const;

  constructor(model: string) {
    this.model = model;
  }

  async execute(input: {
    task: string;
    baseBranch?: string;
    sourceBranch: string;
    files: string[];
    strategy?: 'ours' | 'theirs' | 'smart' | 'manual';
  }): Promise<{
    filesChanged: FileChange[];
    conflicts: MergeConflict[];
    summary: string;
    requiresManualReview: boolean;
  }> {
    const strategy = input.strategy || 'smart';

    // Read files from both branches
    let baseContent = '';
    let sourceContent = '';
    const fileContents: Record<string, { base?: string; source: string }> = {};

    for (const file of input.files) {
      try {
        const safePath = validatePath(file);

        // Read source branch content
        const { content: srcContent } = await executeTool('file_read', { path: safePath });
        sourceContent += `\n--- ${file} (source) ---\n${srcContent}\n`;

        fileContents[file] = { source: srcContent };

        // Try to read base branch content if specified
        if (input.baseBranch) {
          try {
            // In a real implementation, this would checkout the base branch
            // For now, we'll simulate reading base content
            const { content: bContent } = await executeTool('file_read', { path: safePath });
            baseContent += `\n--- ${file} (base) ---\n${bContent}\n`;
            fileContents[file].base = bContent;
          } catch {
            // Base file might not exist (new file in source branch)
          }
        }
      } catch (error) {
        logger.warn('Failed to read file', {
          agent: 'merge',
          file,
          error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
        });
      }
    }

    if (!sourceContent.trim()) {
      return {
        filesChanged: [],
        conflicts: [],
        summary: 'No files could be read for merging',
        requiresManualReview: false,
      };
    }

    // Build strategy context
    const strategyContext = this.getStrategyContext(strategy);

    const response = await llmClient.chat(this.model, [
      {
        role: 'system',
        content: `Du bist ein Merge Agent. Merge Code aus verschiedenen Branches und löse Konflikte intelligent.

Merge Strategien:
- "ours": Bevorzuge unsere Änderungen bei Konflikten
- "theirs": Bevorzuge ihre Änderungen bei Konflikten
- "smart": Analysiere und wähle beste Lösung (Standard)
- "manual": Markiere alle Konflikte für manuelles Review

Konflikt-Typen:
- content: Beide Seiten haben denselben Code geändert
- structure: Strukturelle Änderungen (Klassen, Funktionen verschoben)
- deletion: Eine Seite hat gelöscht, andere geändert

Antworte NUR mit validem JSON:
{
  "conflicts": [
    {
      "file": "pfad/zur/datei.ts",
      "conflictType": "content" | "structure" | "deletion",
      "baseContent": "ursprünglicher Code (optional)",
      "ourContent": "unsere Version",
      "theirContent": "ihre Version",
      "resolution": "gemergte Version",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "filesChanged": [
    {
      "path": "pfad/zur/datei.ts",
      "action": "modify",
      "content": "vollständiger gemerged content"
    }
  ],
  "summary": "Zusammenfassung aller Merges und Konflikte",
  "requiresManualReview": false
}`,
      },
      {
        role: 'user',
        content: `Task: ${input.task}

${input.baseBranch ? `Base Branch: ${input.baseBranch}\n` : ''}Source Branch: ${input.sourceBranch}
Merge Strategy: ${strategy}

${strategyContext}

${input.baseBranch ? `Base Content:${baseContent}\n` : ''}Source Content:${sourceContent}`,
      },
    ]);

    try {
      const MergeAgentResponseSchema = z.object({
        conflicts: z.array(
          z.object({
            file: z.string(),
            conflictType: z.enum(['content', 'structure', 'deletion']),
            baseContent: z.string().optional(),
            ourContent: z.string(),
            theirContent: z.string(),
            resolution: z.string(),
            confidence: z.enum(['high', 'medium', 'low']),
          })
        ),
        filesChanged: z.array(
          z.object({
            path: z.string(),
            action: z.enum(['create', 'modify', 'delete']),
            content: z.string().optional(),
          })
        ),
        summary: z.string(),
        requiresManualReview: z.boolean(),
      });
      const parsed = safeJsonParse(response.content, MergeAgentResponseSchema);

      // Write merged files
      for (const file of parsed.filesChanged) {
        if (file.action === 'modify' || file.action === 'create') {
          if (file.content) {
            await executeTool('file_write', { path: file.path, content: file.content });
          }
        } else if (file.action === 'delete') {
          // Note: We don't actually delete files, just mark them for deletion
          logger.info('File marked for deletion', {
            agent: 'merge',
            path: sanitizeLogMessage(file.path),
          });
        }
      }

      return {
        filesChanged: parsed.filesChanged,
        conflicts: parsed.conflicts,
        summary: parsed.summary,
        requiresManualReview: parsed.requiresManualReview,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      logger.error('Merge operation failed', {
        agent: this.role,
        error: sanitizeLogMessage(errorMessage),
        stack: stack ? sanitizeLogMessage(stack) : undefined,
      });
      return {
        filesChanged: [],
        conflicts: [],
        summary: `Error: ${errorMessage}`,
        requiresManualReview: true,
      };
    }
  }

  private getStrategyContext(strategy: string): string {
    const contexts = {
      ours: 'Bei Konflikten: Bevorzuge UNSERE Änderungen, behalte aber logische Ergänzungen von ihrer Seite.',
      theirs:
        'Bei Konflikten: Bevorzuge IHRE Änderungen, behalte aber kritische Fixes von unserer Seite.',
      smart:
        'Bei Konflikten: Analysiere beide Versionen und wähle die beste Lösung. Kombiniere Änderungen wenn möglich.',
      manual:
        'Bei Konflikten: Markiere ALLE Konflikte für manuelles Review. Keine automatische Auflösung.',
    };

    return contexts[strategy as keyof typeof contexts] || contexts.smart;
  }
}
