import { Agent, AgentRole, AgentStatus, Step } from './types';
import { llmClient } from '../llm/client';
import { executeTool } from '../tools';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';
import { sanitizeLogMessage } from '../utils/security';
import { logger } from '../utils/logger';

/**
 * Architect Agent Input
 */
export interface ArchitectInput {
  task: string;
  projectPath: string;
}

/**
 * Architect Agent Output
 */
export interface ArchitectOutput {
  runbook: Step[];
  estimatedComplexity: 'low' | 'medium' | 'high';
}

/**
 * ArchitectAgent - Architecture Planning & Runbook Creation
 *
 * Responsibilities:
 * - Analyze project structure and technology stack
 * - Create detailed step-by-step runbook
 * - Identify affected files per step
 * - Estimate token usage and complexity
 * - Make architectural decisions
 */
export class ArchitectAgent implements Agent {
  role: AgentRole = 'architect';
  model: string;
  status: AgentStatus = 'idle';

  constructor(model: string) {
    this.model = model;
  }

  /**
   * Execute architecture planning
   */
  async execute(input: ArchitectInput): Promise<ArchitectOutput> {
    this.status = 'working';
    const startTime = Date.now();

    try {
      logger.info('Architect analyzing project', {
        agent: 'architect',
        task: sanitizeLogMessage(input.task),
        projectPath: input.projectPath,
      });

      // Get project context
      const projectContext = await this.getProjectContext(input.projectPath);

      // Build LLM prompt
      const response = await llmClient.chat(this.model, [
        {
          role: 'system',
          content: this.buildSystemPrompt(),
        },
        {
          role: 'user',
          content: this.buildUserPrompt(input.task, projectContext),
        },
      ]);

      // Parse and validate response
      const result = this.parseResponse(response.content, input.task);

      const duration = Date.now() - startTime;
      logger.info('Architect planning completed', {
        agent: 'architect',
        stepsCreated: result.runbook.length,
        complexity: result.estimatedComplexity,
        duration,
      });

      this.status = 'completed';
      return result;
    } catch (error) {
      this.status = 'failed';
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Architect planning failed', {
        agent: 'architect',
        error: sanitizeLogMessage(errorMsg),
      });

      // Return safe fallback
      return this.getFallbackOutput(input.task);
    }
  }

  /**
   * Get project context by scanning files and reading key files
   */
  private async getProjectContext(projectPath: string): Promise<{
    files: string[];
    fileContents: string;
    techStack: string;
  }> {
    try {
      // Get file structure
      const { files } = await executeTool('directory_list', {
        path: projectPath,
        recursive: true,
      });

      // Identify key files
      const keyFiles = (files as string[])
        .filter(
          (f: string) =>
            f.endsWith('package.json') ||
            f.endsWith('tsconfig.json') ||
            f.endsWith('requirements.txt') ||
            f.endsWith('go.mod') ||
            f.endsWith('Cargo.toml') ||
            f.includes('README')
        )
        .slice(0, 10);

      // Read key files in parallel
      const fileReadPromises = keyFiles.map(async (file: string) => {
        try {
          const { content } = await executeTool('file_read', { path: file });
          return `\n--- ${file} ---\n${(content as string).slice(0, 1000)}\n`;
        } catch (error) {
          logger.warn('Failed to read file during context gathering', {
            agent: 'architect',
            file,
            error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
          });
          return '';
        }
      });

      const fileContents = (await Promise.all(fileReadPromises)).join('');

      // Detect tech stack
      const techStack = this.detectTechStack(files as string[], fileContents);

      return {
        files: files as string[],
        fileContents,
        techStack,
      };
    } catch (error) {
      logger.error('Failed to gather project context', {
        agent: 'architect',
        error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
      });
      return {
        files: [],
        fileContents: '',
        techStack: 'unknown',
      };
    }
  }

  /**
   * Detect technology stack from files
   */
  private detectTechStack(files: string[], fileContents: string): string {
    const stacks: string[] = [];

    // Language detection
    if (files.some((f) => f.endsWith('.ts'))) stacks.push('TypeScript');
    else if (files.some((f) => f.endsWith('.js'))) stacks.push('JavaScript');
    if (files.some((f) => f.endsWith('.py'))) stacks.push('Python');
    if (files.some((f) => f.endsWith('.go'))) stacks.push('Go');
    if (files.some((f) => f.endsWith('.rs'))) stacks.push('Rust');

    // Framework detection
    if (fileContents.includes('express')) stacks.push('Express');
    if (fileContents.includes('react')) stacks.push('React');
    if (fileContents.includes('vue')) stacks.push('Vue');
    if (fileContents.includes('next')) stacks.push('Next.js');
    if (fileContents.includes('fastapi')) stacks.push('FastAPI');
    if (fileContents.includes('django')) stacks.push('Django');

    // Testing frameworks
    if (fileContents.includes('vitest')) stacks.push('Vitest');
    if (fileContents.includes('jest')) stacks.push('Jest');
    if (fileContents.includes('pytest')) stacks.push('Pytest');

    return stacks.length > 0 ? stacks.join(', ') : 'unknown';
  }

  /**
   * Build system prompt for LLM
   */
  private buildSystemPrompt(): string {
    return `Du bist ein Software Architect Agent. Deine Aufgabe ist es, für gegebene Tasks ein detailliertes Runbook zu erstellen.

DEINE AUFGABEN:
1. Task analysieren und Scope verstehen
2. Betroffene Dateien identifizieren
3. Step-by-Step Runbook erstellen
4. Pro Step: Beschreibung, Files, Expected Outcome, Token-Aufwand
5. Komplexität einschätzen (low/medium/high)
6. Architektur-Entscheidungen treffen

RUNBOOK QUALITÄT:
- Jeder Step muss KLAR und ACTIONABLE sein
- Files müssen KONKRET benannt werden (Pfade angeben)
- Expected Outcome muss MESSBAR sein
- Token-Schätzung muss REALISTISCH sein

KOMPLEXITÄT:
- LOW: 1-2 Files, < 200 LOC, keine Dependencies
- MEDIUM: 3-5 Files, 200-500 LOC, moderate Dependencies
- HIGH: 6+ Files, > 500 LOC, komplexe Dependencies

ARCHITEKTUR-ENTSCHEIDUNGEN:
- Welches Design Pattern? (Factory, Singleton, Strategy, etc.)
- Welche Error-Handling Strategie?
- Async vs Sync?
- Neue Files oder bestehende erweitern?
- Wo platzieren? (services/, utils/, middleware/)

Antworte NUR mit validem JSON:
{
  "runbook": [
    {
      "id": "step-1",
      "description": "Klare Beschreibung was zu tun ist",
      "files": ["src/services/auth.ts", "src/middleware/jwt.ts"],
      "expectedOutcome": "Auth service mit JWT signing/verification",
      "estimatedTokens": 5000
    }
  ],
  "estimatedComplexity": "low" | "medium" | "high"
}`;
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(
    task: string,
    context: { files: string[]; fileContents: string; techStack: string }
  ): string {
    return `Erstelle ein Runbook für diese Aufgabe:

AUFGABE: ${task}

TECHNOLOGIE-STACK: ${context.techStack}

PROJEKT-STRUKTUR (erste 50 Files):
${context.files.slice(0, 50).join('\n')}

KEY-FILES INHALT:
${context.fileContents || 'Keine Key-Files gefunden'}

Erstelle ein detailliertes, schrittweises Runbook mit konkreten File-Pfaden.`;
  }

  /**
   * Parse and validate LLM response
   */
  private parseResponse(content: string, _taskFallback: string): ArchitectOutput {
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

    try {
      return safeJsonParse(content, ArchitectResponseSchema);
    } catch (error) {
      logger.warn('Failed to parse architect response, using fallback', {
        agent: 'architect',
        error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
      });
      throw error;
    }
  }

  /**
   * Get fallback output when LLM fails
   */
  private getFallbackOutput(task: string): ArchitectOutput {
    logger.warn('Using fallback architect output', { agent: 'architect' });

    return {
      runbook: [
        {
          id: 'step-1',
          description: task,
          files: [],
          expectedOutcome: 'Task completed',
          estimatedTokens: 2000,
        },
      ],
      estimatedComplexity: 'medium',
    };
  }
}
