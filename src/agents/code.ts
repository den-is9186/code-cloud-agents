import { Agent, AgentRole, AgentStatus, SubTask, FileChange, ReviewResult } from './types';
import { llmClient } from '../llm/client';
import { executeTool, validatePath } from '../tools';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';
import { sanitizeLogMessage } from '../utils/security';
import { logger } from '../utils/logger';

/**
 * Code Agent Input
 */
interface CodeInput {
  task: SubTask;
  feedback?: ReviewResult;
  dryRun?: boolean;
}

/**
 * Code Agent Output
 */
interface CodeOutput {
  filesChanged: FileChange[];
  explanation: string;
  needsReview: boolean;
  securityWarnings?: string[];
  codeQualityScore?: number;
}

/**
 * CodeAgent - Code Generation & Modification
 *
 * Responsibilities:
 * - Generate new code files from scratch
 * - Modify existing code based on requirements
 * - Apply review feedback and fix issues
 * - Ensure code quality and security standards
 * - Validate code before writing to disk
 * - Handle TypeScript/JavaScript/Python/Go code
 */
export class CodeAgent implements Agent {
  role: AgentRole = 'code';
  model: string;
  status: AgentStatus = 'idle';

  constructor(model: string) {
    this.model = model;
  }

  /**
   * Execute code generation/modification
   */
  async execute(input: CodeInput): Promise<CodeOutput> {
    this.status = 'working';
    const startTime = Date.now();

    try {
      logger.info('Code agent starting', {
        agent: 'code',
        taskId: input.task.id,
        files: input.task.input.files?.length || 0,
        hasFeedback: !!input.feedback,
        dryRun: !!input.dryRun,
      });

      // Read existing code context
      const existingCode = await this.readExistingFiles(input.task.input.files || []);

      // Build LLM prompt
      const response = await llmClient.chat(this.model, [
        {
          role: 'system',
          content: this.buildSystemPrompt(),
        },
        {
          role: 'user',
          content: this.buildUserPrompt(input.task, existingCode, input.feedback),
        },
      ]);

      // Parse and validate response
      const parsed = this.parseResponse(response.content);

      // Security scan
      const securityWarnings = this.scanForSecurityIssues(parsed.filesChanged);

      // Validate code structure
      this.validateCodeStructure(parsed.filesChanged);

      // Write files (unless dry-run)
      if (!input.dryRun) {
        await this.writeFiles(parsed.filesChanged);
      }

      const duration = Date.now() - startTime;
      logger.info('Code generation completed', {
        agent: 'code',
        filesChanged: parsed.filesChanged.length,
        securityWarnings: securityWarnings.length,
        dryRun: !!input.dryRun,
        duration,
      });

      this.status = 'completed';
      return {
        filesChanged: parsed.filesChanged,
        explanation: parsed.explanation,
        needsReview: true,
        securityWarnings: securityWarnings.length > 0 ? securityWarnings : undefined,
        codeQualityScore: this.calculateQualityScore(parsed.filesChanged, securityWarnings),
      };
    } catch (error) {
      this.status = 'failed';
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Code generation failed', {
        agent: 'code',
        taskId: input.task.id,
        error: sanitizeLogMessage(errorMsg),
      });

      return this.getFallbackOutput(errorMsg);
    }
  }

  /**
   * Read existing files for context
   */
  private async readExistingFiles(files: string[]): Promise<string> {
    if (!files || files.length === 0) {
      return '';
    }

    const fileReads = files.map(async (file) => {
      try {
        const safePath = validatePath(file);
        const { content } = await executeTool('file_read', { path: safePath });
        return `\n--- ${file} ---\n${content as string}\n`;
      } catch (error) {
        logger.warn('Failed to read file for context', {
          agent: 'code',
          file,
          error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
        });
        return `\n--- ${file} (not found) ---\n`;
      }
    });

    const results = await Promise.all(fileReads);
    return results.join('');
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(): string {
    return `Du bist ein Code Agent. Deine Aufgabe ist es, hochwertigen, sicheren, wartbaren Code zu schreiben.

CODING STANDARDS:
- TypeScript: Strict mode, proper typing, keine \`any\` (außer zwingend nötig)
- JavaScript: ES6+, async/await statt callbacks
- Python: Type hints, PEP 8, proper error handling
- Go: Idiomatic Go, proper error handling, context usage
- Alle: Clean Code Prinzipien, SOLID, DRY

SICHERHEIT (PFLICHT):
- NIEMALS SQL Injection Schwachstellen (use parameterized queries)
- NIEMALS XSS Schwachstellen (escape user input)
- NIEMALS Command Injection (validate inputs, use safe APIs)
- NIEMALS Path Traversal (validate/sanitize paths)
- NIEMALS Secrets im Code (use env vars, secret managers)
- NIEMALS unsichere Crypto (use crypto.randomBytes, bcrypt)
- Input Validation auf allen externen Eingaben
- Output Encoding auf allen Ausgaben
- Error Messages dürfen KEINE sensitiven Daten enthalten

CODE QUALITÄT:
- Tests mitschreiben (Unit Tests für Funktionen)
- Error Handling überall
- Logging an wichtigen Stellen
- Kommentare nur wo nötig (Code sollte selbsterklärend sein)
- Kleine Funktionen (max 50 Zeilen)
- DRY - Don't Repeat Yourself
- Separation of Concerns

TECH-STACK SPECIFIC:
- TypeScript: Use Zod für Runtime Validation
- Express: Use middleware, proper error handling
- React: Hooks, functional components
- Node.js: Use async/await, handle promises properly

RESPONSE FORMAT:
Antworte NUR mit validem JSON:
{
  "filesChanged": [
    {
      "path": "src/services/auth.ts",
      "action": "create" | "modify",
      "content": "VOLLSTÄNDIGER Dateiinhalt (nicht nur Snippets!)"
    }
  ],
  "explanation": "Was wurde implementiert und warum",
  "securityNotes": "Sicherheits-relevante Entscheidungen (optional)"
}`;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(task: SubTask, existingCode: string, feedback?: ReviewResult): string {
    let prompt = `AUFGABE: ${task.description}\n`;

    if (task.expectedOutput) {
      prompt += `\nERWARTETES ERGEBNIS: ${task.expectedOutput}\n`;
    }

    if (existingCode && existingCode.trim().length > 0) {
      prompt += `\nBESTEHENDER CODE:${existingCode}\n`;
    }

    if (feedback) {
      prompt += `\n📋 REVIEW FEEDBACK (MUSS BEHOBEN WERDEN):\n\n`;

      if (feedback.mustFix && feedback.mustFix.length > 0) {
        prompt += `🔴 CRITICAL Issues:\n`;
        feedback.mustFix.forEach((issue) => {
          prompt += `  - [${issue.type}] ${issue.message}\n`;
          if (issue.line) prompt += `    Zeile ${issue.line}\n`;
        });
        prompt += '\n';
      }

      if (feedback.suggestions && feedback.suggestions.length > 0) {
        prompt += `💡 Suggestions (optional):\n`;
        feedback.suggestions.forEach((issue) => {
          prompt += `  - ${issue.message}\n`;
        });
        prompt += '\n';
      }

      if (feedback.summary) {
        prompt += `\nReview Summary: ${feedback.summary}\n`;
      }
    }

    prompt += `\nSchreibe vollständigen, produktionsreifen Code mit allen Sicherheits-Checks und Error Handling.`;

    return prompt;
  }

  /**
   * Parse and validate LLM response
   */
  private parseResponse(content: string): { filesChanged: FileChange[]; explanation: string } {
    const CodeAgentResponseSchema = z.object({
      filesChanged: z.array(
        z.object({
          path: z.string(),
          action: z.enum(['create', 'modify', 'delete']),
          content: z.string(),
        })
      ),
      explanation: z.string(),
      securityNotes: z.string().optional(),
    });

    try {
      const parsed = safeJsonParse(content, CodeAgentResponseSchema);

      // Validate paths
      for (const file of parsed.filesChanged) {
        validatePath(file.path);
      }

      return {
        filesChanged: parsed.filesChanged,
        explanation: parsed.explanation,
      };
    } catch (error) {
      logger.error('Failed to parse code agent response', {
        agent: 'code',
        error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
      });
      throw error;
    }
  }

  /**
   * Scan code for common security issues
   */
  private scanForSecurityIssues(files: FileChange[]): string[] {
    const warnings: string[] = [];

    for (const file of files) {
      if (!file.content) continue;
      const content = file.content.toLowerCase();

      // SQL Injection patterns
      if (
        content.includes('query(') &&
        content.includes('${') &&
        !content.includes('parameterized')
      ) {
        warnings.push(`${file.path}: Possible SQL injection (string interpolation in query)`);
      }

      // Command Injection
      if (
        (content.includes('exec(') || content.includes('spawn(')) &&
        content.includes('${') &&
        !content.includes('validate')
      ) {
        warnings.push(`${file.path}: Possible command injection (unvalidated input in exec)`);
      }

      // XSS patterns
      if (content.includes('innerhtml') && !content.includes('sanitize')) {
        warnings.push(`${file.path}: Possible XSS (innerHTML without sanitization)`);
      }

      // Hardcoded secrets
      if (
        content.match(/password\s*=\s*["'][^"']+["']/) ||
        content.match(/api[_-]?key\s*=\s*["'][^"']+["']/) ||
        content.match(/secret\s*=\s*["'][^"']+["']/)
      ) {
        warnings.push(`${file.path}: Hardcoded secret detected`);
      }

      // Weak crypto
      if (content.includes('math.random') || content.includes('rand()')) {
        warnings.push(`${file.path}: Weak random number generator (use crypto.randomBytes)`);
      }

      // Missing error handling
      if (content.includes('await ') && !content.includes('try') && !content.includes('catch')) {
        warnings.push(`${file.path}: Async call without try-catch`);
      }
    }

    return warnings;
  }

  /**
   * Validate code structure
   */
  private validateCodeStructure(files: FileChange[]): void {
    for (const file of files) {
      if (!file.content) continue;

      // Check for minimum content length
      if (file.content.trim().length < 10) {
        throw new Error(`File ${file.path} has insufficient content (likely incomplete)`);
      }

      // Check for common syntax errors (basic)
      const content = file.content;

      // TypeScript/JavaScript validation
      if (file.path.endsWith('.ts') || file.path.endsWith('.js')) {
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;
        if (Math.abs(openBraces - closeBraces) > 2) {
          // Allow small diff for edge cases
          throw new Error(`File ${file.path} has mismatched braces (likely syntax error)`);
        }
      }

      // Python validation
      if (file.path.endsWith('.py')) {
        if (!content.includes('def ') && !content.includes('class ')) {
          logger.warn('Python file without function or class', {
            agent: 'code',
            file: file.path,
          });
        }
      }
    }
  }

  /**
   * Write files to disk
   */
  private async writeFiles(files: FileChange[]): Promise<void> {
    for (const file of files) {
      try {
        const safePath = validatePath(file.path);

        if (file.action === 'create' || file.action === 'modify') {
          await executeTool('file_write', {
            path: safePath,
            content: file.content,
          });

          logger.info('File written', {
            agent: 'code',
            path: safePath,
            action: file.action,
            size: file.content?.length || 0,
          });
        } else if (file.action === 'delete') {
          await executeTool('file_delete', { path: safePath });
          logger.info('File deleted', {
            agent: 'code',
            path: safePath,
          });
        }
      } catch (error) {
        logger.error('Failed to write file', {
          agent: 'code',
          path: file.path,
          action: file.action,
          error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
        });
        throw error;
      }
    }
  }

  /**
   * Calculate code quality score (0-100)
   */
  private calculateQualityScore(files: FileChange[], securityWarnings: string[]): number {
    let score = 100;

    // Deduct points for security warnings
    score -= securityWarnings.length * 10;

    // Deduct points for very short files (likely incomplete)
    for (const file of files) {
      if (!file.content) continue;
      if (file.content.length < 50) {
        score -= 15;
      }
    }

    // Deduct points for missing error handling
    for (const file of files) {
      if (!file.content) continue;
      const hasAsync = file.content.includes('async ') || file.content.includes('await ');
      const hasTryCatch = file.content.includes('try') && file.content.includes('catch');

      if (hasAsync && !hasTryCatch) {
        score -= 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get fallback output when code generation fails
   */
  private getFallbackOutput(errorMessage: string): CodeOutput {
    logger.warn('Using fallback code output', { agent: 'code' });

    return {
      filesChanged: [],
      explanation: `Code generation failed: ${errorMessage}`,
      needsReview: false,
      securityWarnings: ['Code generation failed - manual intervention required'],
      codeQualityScore: 0,
    };
  }
}
