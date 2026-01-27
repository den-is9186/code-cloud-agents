import { Agent, AgentRole, AgentStatus, FileChange } from './types';
import { llmClient } from '../llm/client';
import { executeTool, validatePath } from '../tools';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';
import { sanitizeLogMessage } from '../utils/security';
import { logger } from '../utils/logger';

/**
 * Docs Agent Input
 */
interface DocsInput {
  filesChanged: FileChange[];
  task: { description: string };
  dryRun?: boolean;
  skipChangelog?: boolean;
}

/**
 * Docs Agent Output
 */
interface DocsOutput {
  docsUpdated: FileChange[];
  changelogEntry?: string;
  docQualityScore?: number;
}

/**
 * DocsAgent - Documentation Generation & Update
 *
 * Responsibilities:
 * - Update README.md with new features
 * - Generate/update API documentation
 * - Add inline code documentation (JSDoc, TSDoc, Python docstrings)
 * - Update CHANGELOG.md with changes
 * - Create documentation for new modules/functions
 * - Maintain consistency in documentation style
 */
export class DocsAgent implements Agent {
  role: AgentRole = 'docs';
  model = 'llama-4-scout-local'; // Runs locally, $0 cost
  status: AgentStatus = 'idle';

  /**
   * Execute documentation update
   */
  async execute(input: DocsInput): Promise<DocsOutput> {
    this.status = 'working';
    const startTime = Date.now();

    try {
      logger.info('Docs agent starting', {
        agent: 'docs',
        filesCount: input.filesChanged.length,
        skipChangelog: !!input.skipChangelog,
        dryRun: !!input.dryRun,
      });

      // Read existing docs for context
      const existingDocs = await this.readExistingDocs();

      // Generate documentation via LLM
      const generatedDocs = await this.generateDocumentation(
        input.filesChanged,
        input.task,
        existingDocs,
        input.skipChangelog
      );

      // Analyze doc quality
      const docQualityScore = this.analyzeDocQuality(generatedDocs.docsUpdated);

      // Write doc files (unless dry-run)
      if (!input.dryRun) {
        await this.writeDocFiles(generatedDocs.docsUpdated);
      }

      const duration = Date.now() - startTime;
      logger.info('Documentation update completed', {
        agent: 'docs',
        docsCount: generatedDocs.docsUpdated.length,
        hasChangelog: !!generatedDocs.changelogEntry,
        docQuality: docQualityScore,
        dryRun: !!input.dryRun,
        duration,
      });

      this.status = 'completed';
      return {
        docsUpdated: generatedDocs.docsUpdated,
        changelogEntry: generatedDocs.changelogEntry,
        docQualityScore,
      };
    } catch (error) {
      this.status = 'failed';
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Documentation update failed', {
        agent: 'docs',
        error: sanitizeLogMessage(errorMsg),
      });

      return this.getFallbackOutput();
    }
  }

  /**
   * Read existing documentation files
   */
  private async readExistingDocs(): Promise<{ readme?: string; changelog?: string }> {
    const docs: { readme?: string; changelog?: string } = {};

    try {
      const { content } = await executeTool('file_read', { path: 'README.md' });
      docs.readme = content as string;
    } catch {
      // README doesn't exist or can't be read
    }

    try {
      const { content } = await executeTool('file_read', { path: 'CHANGELOG.md' });
      docs.changelog = content as string;
    } catch {
      // CHANGELOG doesn't exist or can't be read
    }

    return docs;
  }

  /**
   * Generate documentation via LLM
   */
  private async generateDocumentation(
    filesChanged: FileChange[],
    task: { description: string },
    existingDocs: { readme?: string; changelog?: string },
    skipChangelog?: boolean
  ): Promise<{ docsUpdated: FileChange[]; changelogEntry?: string }> {
    const changes = filesChanged
      .map(
        (f) =>
          `${f.action.toUpperCase()}: ${f.path}\n${f.content?.slice(0, 200) || '[no content]'}...\n`
      )
      .join('\n');

    const response = await llmClient.chat(this.model, [
      {
        role: 'system',
        content: this.buildSystemPrompt(),
      },
      {
        role: 'user',
        content: this.buildUserPrompt(task.description, changes, existingDocs, skipChangelog),
      },
    ]);

    return this.parseResponse(response.content);
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(): string {
    return `Du bist ein Documentation Agent. Erstelle und aktualisiere klare, präzise Dokumentation.

DOCUMENTATION PRINZIPIEN:
- KLARHEIT: Verständlich für neue Entwickler
- VOLLSTÄNDIGKEIT: Alle wichtigen Details abdecken
- AKTUALITÄT: Dokumentation muss Code entsprechen
- STRUKTUR: Logischer Aufbau, gute Gliederung
- BEISPIELE: Code-Beispiele wo sinnvoll

DOCUMENTATION ARTEN:

1. README.md:
   - Projekt-Überblick
   - Installation & Setup
   - Verwendung & Beispiele
   - API Übersicht
   - Contributing Guidelines
   - Lizenz & Credits

2. API DOCUMENTATION:
   - Funktionen/Methoden Beschreibung
   - Parameter & Return Types
   - Exceptions/Errors
   - Usage Examples
   - JSDoc/TSDoc Format für TypeScript
   - Docstrings für Python

3. CHANGELOG.md (Keep a Changelog Format):
   - [Added] für neue Features
   - [Changed] für Änderungen an existierenden Features
   - [Deprecated] für bald entfernte Features
   - [Removed] für entfernte Features
   - [Fixed] für Bug Fixes
   - [Security] für Security Fixes

4. INLINE CODE DOCS:
   - Komplexe Logik erklären
   - Nicht-offensichtliche Entscheidungen dokumentieren
   - Edge Cases erwähnen
   - KEIN Comment für offensichtlichen Code

STYLE GUIDE:
- Markdown für README, CHANGELOG
- JSDoc für TypeScript/JavaScript:
  /**
   * Brief function description
   * @param {string} name - Parameter description
   * @returns {Promise<User>} Return value description
   * @throws {Error} When validation fails
   * @example
   * const user = await createUser('John');
   */

- Python Docstrings:
  """
  Brief function description.

  Args:
      name (str): Parameter description

  Returns:
      User: Return value description

  Raises:
      ValueError: When validation fails

  Example:
      >>> user = create_user('John')
  """

BEST PRACTICES:
- Verwende aktive Sprache ("Creates user" statt "User is created")
- Vermeide redundante Kommentare ("// increment i" ist nutzlos)
- Dokumentiere WARUM, nicht WAS (Code zeigt WAS)
- Keep docs DRY - keine Wiederholungen
- Links zu relevanten Docs/RFCs wo nötig

Antworte NUR mit validem JSON:
{
  "docsUpdated": [
    {
      "path": "README.md",
      "action": "modify",
      "content": "VOLLSTÄNDIGER Dateiinhalt"
    },
    {
      "path": "src/services/auth.ts",
      "action": "modify",
      "content": "Code mit JSDoc comments"
    }
  ],
  "changelogEntry": "## [1.2.0] - 2024-01-27\\n\\n### Added\\n- Feature X for doing Y\\n\\n### Fixed\\n- Bug Z in module A"
}`;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(
    taskDescription: string,
    changes: string,
    existingDocs: { readme?: string; changelog?: string },
    skipChangelog?: boolean
  ): string {
    let prompt = `AUFGABE: ${taskDescription}\n\n`;
    prompt += `CODE ÄNDERUNGEN:\n${changes}\n\n`;

    if (existingDocs.readme) {
      prompt += `EXISTING README.md (erste 500 Zeichen):\n${existingDocs.readme.slice(0, 500)}...\n\n`;
    }

    if (existingDocs.changelog && !skipChangelog) {
      prompt += `EXISTING CHANGELOG.md (erste 500 Zeichen):\n${existingDocs.changelog.slice(0, 500)}...\n\n`;
    }

    prompt += `ANFORDERUNGEN:\n`;
    prompt += `1. Aktualisiere README.md falls neue Features/Breaking Changes\n`;
    prompt += `2. Füge JSDoc/TSDoc zu neuen Funktionen hinzu\n`;

    if (!skipChangelog) {
      prompt += `3. Erstelle CHANGELOG.md Eintrag im "Keep a Changelog" Format\n`;
    }

    prompt += `\nDokumentation muss KLAR, VOLLSTÄNDIG und AKTUELL sein.`;

    return prompt;
  }

  /**
   * Parse and validate LLM response
   */
  private parseResponse(content: string): {
    docsUpdated: FileChange[];
    changelogEntry?: string;
  } {
    const DocsResponseSchema = z.object({
      docsUpdated: z.array(
        z.object({
          path: z.string(),
          action: z.enum(['create', 'modify', 'delete']),
          content: z.string(),
        })
      ),
      changelogEntry: z.string().optional(),
    });

    try {
      const parsed = safeJsonParse(content, DocsResponseSchema);

      // Validate paths
      for (const doc of parsed.docsUpdated) {
        validatePath(doc.path);
      }

      return parsed;
    } catch (error) {
      logger.error('Failed to parse docs response', {
        agent: 'docs',
        error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
      });
      throw error;
    }
  }

  /**
   * Write documentation files
   */
  private async writeDocFiles(docs: FileChange[]): Promise<void> {
    for (const doc of docs) {
      try {
        const safePath = validatePath(doc.path);

        if (doc.action === 'create' || doc.action === 'modify') {
          await executeTool('file_write', {
            path: safePath,
            content: doc.content,
          });

          logger.info('Documentation file written', {
            agent: 'docs',
            path: safePath,
            action: doc.action,
            size: doc.content?.length || 0,
          });
        } else if (doc.action === 'delete') {
          await executeTool('file_delete', { path: safePath });
          logger.info('Documentation file deleted', {
            agent: 'docs',
            path: safePath,
          });
        }
      } catch (error) {
        logger.error('Failed to write documentation file', {
          agent: 'docs',
          path: doc.path,
          error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
        });
        throw error;
      }
    }
  }

  /**
   * Analyze documentation quality (0-100)
   */
  private analyzeDocQuality(docs: FileChange[]): number {
    let score = 100;

    for (const doc of docs) {
      if (!doc.content) continue;
      const content = doc.content;
      const lower = content.toLowerCase();

      // Check for README.md quality
      if (doc.path.toLowerCase() === 'readme.md') {
        if (!lower.includes('## installation') && !lower.includes('## install')) {
          score -= 10;
        }
        if (!lower.includes('## usage') && !lower.includes('## getting started')) {
          score -= 10;
        }
        if (!lower.includes('## api') && !lower.includes('## documentation')) {
          score -= 5;
        }
        if (!lower.includes('```') || content.match(/```/g)!.length < 2) {
          score -= 10; // Missing code examples
        }
      }

      // Check for CHANGELOG quality
      if (doc.path.toLowerCase() === 'changelog.md') {
        if (!lower.includes('### added') && !lower.includes('### changed')) {
          score -= 15; // Not following Keep a Changelog format
        }
        if (!content.match(/\d{4}-\d{2}-\d{2}/)) {
          score -= 5; // Missing date
        }
      }

      // Check for inline code docs (JSDoc/TSDoc)
      if (doc.path.endsWith('.ts') || doc.path.endsWith('.js')) {
        const jsdocCount = (content.match(/\/\*\*[\s\S]*?\*\//g) || []).length;
        const functionCount = (content.match(/function |async function |const \w+ = \(/g) || [])
          .length;

        if (functionCount > 0 && jsdocCount === 0) {
          score -= 20; // No JSDoc at all
        } else if (functionCount > jsdocCount * 2) {
          score -= 10; // Many functions without docs
        }

        // Check for @param, @returns in JSDoc
        if (jsdocCount > 0) {
          if (!content.includes('@param') && !content.includes('@returns')) {
            score -= 10; // JSDoc without proper tags
          }
        }
      }

      // Check for Python docstrings
      if (doc.path.endsWith('.py')) {
        const docstringCount = (content.match(/"""[\s\S]*?"""/g) || []).length;
        const functionCount = (content.match(/def \w+\(/g) || []).length;

        if (functionCount > 0 && docstringCount === 0) {
          score -= 20; // No docstrings at all
        } else if (functionCount > docstringCount * 2) {
          score -= 10; // Many functions without docs
        }
      }

      // Check content length (too short = incomplete)
      if (doc.path.toLowerCase().includes('readme') && content.length < 200) {
        score -= 20; // README too short
      }

      // Check for broken links (basic check)
      const linkMatches = content.match(/\[([^\]]+)\]\(([^\)]+)\)/g);
      if (linkMatches) {
        for (const link of linkMatches) {
          if (link.includes('](http') && link.includes('TODO')) {
            score -= 5; // Placeholder links
          }
        }
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get fallback output when documentation fails
   */
  private getFallbackOutput(): DocsOutput {
    logger.warn('Using fallback docs output', { agent: 'docs' });

    return {
      docsUpdated: [],
      changelogEntry: undefined,
      docQualityScore: 0,
    };
  }
}
