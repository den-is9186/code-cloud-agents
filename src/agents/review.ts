import { Agent, AgentRole, AgentStatus, SubTask, FileChange, Issue } from './types';
import { llmClient } from '../llm/client';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';
import { sanitizeLogMessage } from '../utils/security';
import { logger } from '../utils/logger';

/**
 * Review Agent Input
 */
interface ReviewInput {
  filesChanged: FileChange[];
  originalTask: SubTask;
  skipSecurityScan?: boolean;
}

/**
 * Review Agent Output
 */
interface ReviewOutput {
  approved: boolean;
  issues: Issue[];
  summary: string;
  mustFix: Issue[];
  suggestions: Issue[];
  securityScore?: number;
  qualityScore?: number;
  performanceScore?: number;
}

/**
 * ReviewAgent - Code Review & Quality Assurance
 *
 * Responsibilities:
 * - Security review (OWASP Top 10, common vulnerabilities)
 * - Code quality review (best practices, maintainability)
 * - Performance analysis (anti-patterns, optimization opportunities)
 * - Bug detection (logic errors, edge cases)
 * - Compliance checks (coding standards, conventions)
 */
export class ReviewAgent implements Agent {
  role: AgentRole = 'review';
  model: string;
  status: AgentStatus = 'idle';

  constructor(model: string) {
    this.model = model;
  }

  /**
   * Execute code review
   */
  async execute(input: ReviewInput): Promise<ReviewOutput> {
    this.status = 'working';
    const startTime = Date.now();

    try {
      logger.info('Review agent starting', {
        agent: 'review',
        taskId: input.originalTask.id,
        filesCount: input.filesChanged.length,
        skipSecurity: !!input.skipSecurityScan,
      });

      // Automatic security scan (static analysis)
      const securityIssues = input.skipSecurityScan
        ? []
        : this.performSecurityScan(input.filesChanged);

      // LLM-based deep review
      const llmReview = await this.performLLMReview(
        input.filesChanged,
        input.originalTask,
        securityIssues
      );

      // Quality metrics
      const qualityScore = this.calculateQualityScore(llmReview.issues, securityIssues);
      const securityScore = this.calculateSecurityScore(securityIssues);
      const performanceScore = this.calculatePerformanceScore(llmReview.issues);

      // Categorize issues
      const allIssues = [...securityIssues, ...llmReview.issues];
      const mustFix = allIssues.filter((i) => i.severity === 'error');
      const suggestions = allIssues.filter((i) => i.severity !== 'error');

      const approved = mustFix.length === 0;

      const duration = Date.now() - startTime;
      logger.info('Review completed', {
        agent: 'review',
        approved,
        totalIssues: allIssues.length,
        mustFixCount: mustFix.length,
        suggestionsCount: suggestions.length,
        securityScore,
        qualityScore,
        duration,
      });

      this.status = 'completed';
      return {
        approved,
        issues: allIssues,
        summary: this.buildSummary(llmReview.summary, mustFix, suggestions, {
          security: securityScore,
          quality: qualityScore,
          performance: performanceScore,
        }),
        mustFix,
        suggestions,
        securityScore,
        qualityScore,
        performanceScore,
      };
    } catch (error) {
      this.status = 'failed';
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Review failed', {
        agent: 'review',
        taskId: input.originalTask.id,
        error: sanitizeLogMessage(errorMsg),
      });

      return this.getFallbackOutput();
    }
  }

  /**
   * Perform automated security scan (static analysis)
   */
  private performSecurityScan(files: FileChange[]): Issue[] {
    const issues: Issue[] = [];

    for (const file of files) {
      if (!file.content) continue;
      const content = file.content;
      const lower = content.toLowerCase();

      // OWASP A1: SQL Injection
      if (lower.includes('query(') && content.includes('${') && !lower.includes('prepared')) {
        issues.push({
          severity: 'error',
          type: 'security',
          file: file.path,
          message: 'SQL Injection vulnerability: String interpolation in SQL query',
          suggestion: 'Use parameterized queries or prepared statements',
        });
      }

      // OWASP A2: Broken Authentication
      if (lower.match(/password\s*===?\s*["'][^"']+["']/) || lower.includes('hardcoded')) {
        issues.push({
          severity: 'error',
          type: 'security',
          file: file.path,
          message: 'Hardcoded credentials detected',
          suggestion: 'Use environment variables or secure secret management',
        });
      }

      // OWASP A3: Sensitive Data Exposure
      if (
        (lower.includes('api_key') ||
          lower.includes('secret') ||
          lower.includes('token') ||
          lower.includes('password')) &&
        content.match(/["'][a-zA-Z0-9]{20,}["']/)
      ) {
        issues.push({
          severity: 'error',
          type: 'security',
          file: file.path,
          message: 'Possible hardcoded secret or API key',
          suggestion: 'Move secrets to environment variables or secret manager',
        });
      }

      // OWASP A7: XSS (Cross-Site Scripting)
      if (
        lower.includes('innerhtml') &&
        !lower.includes('sanitize') &&
        !lower.includes('dompurify')
      ) {
        issues.push({
          severity: 'error',
          type: 'security',
          file: file.path,
          message: 'XSS vulnerability: Unsafe use of innerHTML',
          suggestion: 'Use textContent or sanitize HTML with DOMPurify',
        });
      }

      if (lower.includes('dangerouslysetinnerhtml') && !lower.includes('sanitize')) {
        issues.push({
          severity: 'error',
          type: 'security',
          file: file.path,
          message: 'XSS vulnerability: Unsafe use of dangerouslySetInnerHTML',
          suggestion: 'Sanitize HTML content before rendering',
        });
      }

      // OWASP A8: Insecure Deserialization
      if (lower.includes('json.parse') && !lower.includes('try') && !lower.includes('catch')) {
        issues.push({
          severity: 'warning',
          type: 'security',
          file: file.path,
          message: 'JSON.parse without error handling (potential DoS)',
          suggestion: 'Wrap JSON.parse in try-catch or use safe parsing library',
        });
      }

      // OWASP A9: Vulnerable Dependencies
      if (lower.includes('eval(') || (lower.includes('function(') && lower.includes('return'))) {
        issues.push({
          severity: 'error',
          type: 'security',
          file: file.path,
          message: 'Code injection vulnerability: Use of eval() or Function constructor',
          suggestion: 'Remove eval() and use safe alternatives',
        });
      }

      // Command Injection
      if (
        (lower.includes('exec(') ||
          lower.includes('spawn(') ||
          lower.includes('execsync(') ||
          lower.includes('shell')) &&
        content.includes('${') &&
        !lower.includes('validate')
      ) {
        issues.push({
          severity: 'error',
          type: 'security',
          file: file.path,
          message: 'Command injection vulnerability: Unsafe command execution with user input',
          suggestion: 'Validate and sanitize all inputs, use safe exec options',
        });
      }

      // Path Traversal
      if (
        (lower.includes('readfile') || lower.includes('writefile') || lower.includes('fs.')) &&
        !lower.includes('validate') &&
        !lower.includes('sanitize')
      ) {
        issues.push({
          severity: 'warning',
          type: 'security',
          file: file.path,
          message: 'Potential path traversal: File operations without path validation',
          suggestion: 'Validate file paths to prevent directory traversal attacks',
        });
      }

      // Weak Cryptography
      if (lower.includes('math.random') || lower.includes('rand()')) {
        issues.push({
          severity: 'warning',
          type: 'security',
          file: file.path,
          message: 'Weak random number generation (cryptographically insecure)',
          suggestion: 'Use crypto.randomBytes() for security-sensitive operations',
        });
      }

      // Missing Error Handling
      if (content.includes('await ') && !content.includes('try') && !content.includes('catch')) {
        issues.push({
          severity: 'warning',
          type: 'quality',
          file: file.path,
          message: 'Async operation without error handling',
          suggestion: 'Wrap await in try-catch block',
        });
      }

      // Missing Input Validation (API endpoints)
      if (
        (lower.includes('router.post') ||
          lower.includes('router.put') ||
          lower.includes('app.post')) &&
        !lower.includes('validate') &&
        !lower.includes('zod')
      ) {
        issues.push({
          severity: 'warning',
          type: 'quality',
          file: file.path,
          message: 'API endpoint without input validation',
          suggestion: 'Add input validation using Zod or similar library',
        });
      }

      // Console.log in production code
      if (content.includes('console.log') || content.includes('console.error')) {
        issues.push({
          severity: 'info',
          type: 'quality',
          file: file.path,
          message: 'Console statements in code (should use proper logger)',
          suggestion: 'Replace console.* with logger from logger utility',
        });
      }

      // TODOs and FIXMEs
      if (content.match(/\/\/\s*(TODO|FIXME|HACK|XXX)/i)) {
        issues.push({
          severity: 'info',
          type: 'quality',
          file: file.path,
          message: 'TODO/FIXME comment found',
          suggestion: 'Resolve TODO before production deployment',
        });
      }
    }

    return issues;
  }

  /**
   * Perform deep LLM-based review
   */
  private async performLLMReview(
    filesChanged: FileChange[],
    originalTask: SubTask,
    existingSecurityIssues: Issue[]
  ): Promise<{ issues: Issue[]; summary: string }> {
    const codeToReview = filesChanged.map((f) => `--- ${f.path} ---\n${f.content}`).join('\n\n');

    const securityContext =
      existingSecurityIssues.length > 0
        ? `\n\nAUTOMATED SECURITY SCAN fand ${existingSecurityIssues.length} Issues:\n` +
          existingSecurityIssues.map((i) => `- ${i.message}`).join('\n')
        : '';

    const response = await llmClient.chat(this.model, [
      {
        role: 'system',
        content: this.buildSystemPrompt(),
      },
      {
        role: 'user',
        content: `ORIGINAL AUFGABE: ${originalTask.description}\n\nCODE ZU REVIEWEN:\n${codeToReview}${securityContext}`,
      },
    ]);

    return this.parseResponse(response.content);
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(): string {
    return `Du bist ein Senior Code Reviewer. Prüfe Code auf Bugs, Security, Performance und Best Practices.

REVIEW FOCUS AREAS:

1. SECURITY (OWASP Top 10):
   - SQL/NoSQL Injection
   - XSS (Cross-Site Scripting)
   - Broken Authentication
   - Sensitive Data Exposure
   - XML External Entities (XXE)
   - Broken Access Control
   - Security Misconfiguration
   - Command Injection
   - Insecure Deserialization
   - Insufficient Logging

2. CODE QUALITY:
   - Clean Code Prinzipien
   - SOLID Prinzipien
   - DRY (Don't Repeat Yourself)
   - Single Responsibility
   - Proper Naming (variables, functions, classes)
   - Function complexity (max 50 lines)
   - Cyclomatic complexity
   - Code duplication

3. PERFORMANCE:
   - N+1 Query Problems
   - Unnecessary loops
   - Memory leaks
   - Inefficient algorithms
   - Missing caching
   - Blocking operations
   - Resource cleanup (connections, files)

4. ERROR HANDLING:
   - Try-catch coverage
   - Proper error messages (no sensitive data!)
   - Error propagation
   - Graceful degradation
   - Edge cases handled

5. TESTING:
   - Unit testability
   - Mocking points
   - Test coverage

6. DOCUMENTATION:
   - Complex logic explained
   - API documentation
   - Type annotations (TypeScript)

SEVERITY LEVELS:
- "error": MUSS gefixt werden (Security, Bugs, Breaking)
- "warning": SOLLTE gefixt werden (Performance, Quality)
- "info": Optional (Style, Documentation)

Antworte NUR mit validem JSON:
{
  "issues": [
    {
      "severity": "error" | "warning" | "info",
      "type": "security" | "bug" | "performance" | "quality",
      "file": "pfad/zur/datei.ts",
      "line": 42,
      "message": "Klare Problembeschreibung",
      "suggestion": "Konkreter Lösungsvorschlag"
    }
  ],
  "summary": "Kurze Zusammenfassung des Reviews (2-3 Sätze)"
}`;
  }

  /**
   * Parse and validate LLM response
   */
  private parseResponse(content: string): { issues: Issue[]; summary: string } {
    const ReviewResponseSchema = z.object({
      issues: z.array(
        z.object({
          severity: z.enum(['error', 'warning', 'info']),
          type: z.enum(['security', 'bug', 'performance', 'quality']),
          file: z.string(),
          line: z.number().optional(),
          message: z.string(),
          suggestion: z.string(),
        })
      ),
      summary: z.string(),
    });

    try {
      return safeJsonParse(content, ReviewResponseSchema);
    } catch (error) {
      logger.error('Failed to parse review response', {
        agent: 'review',
        error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
      });

      // Fallback
      return {
        issues: [],
        summary: 'Review completed with parsing errors',
      };
    }
  }

  /**
   * Calculate security score (0-100)
   */
  private calculateSecurityScore(securityIssues: Issue[]): number {
    let score = 100;

    const criticalSecurity = securityIssues.filter((i) => i.severity === 'error');
    const warningSecurity = securityIssues.filter((i) => i.severity === 'warning');

    score -= criticalSecurity.length * 20;
    score -= warningSecurity.length * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate quality score (0-100)
   */
  private calculateQualityScore(issues: Issue[], securityIssues: Issue[]): number {
    let score = 100;

    const qualityErrors = issues.filter((i) => i.type === 'quality' && i.severity === 'error');
    const qualityWarnings = issues.filter((i) => i.type === 'quality' && i.severity === 'warning');

    score -= qualityErrors.length * 10;
    score -= qualityWarnings.length * 3;
    score -= securityIssues.length * 5; // Security impacts quality

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate performance score (0-100)
   */
  private calculatePerformanceScore(issues: Issue[]): number {
    let score = 100;

    const perfIssues = issues.filter((i) => i.type === 'performance');

    score -= perfIssues.filter((i) => i.severity === 'error').length * 15;
    score -= perfIssues.filter((i) => i.severity === 'warning').length * 5;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Build comprehensive summary
   */
  private buildSummary(
    llmSummary: string,
    mustFix: Issue[],
    suggestions: Issue[],
    scores: { security: number; quality: number; performance: number }
  ): string {
    let summary = llmSummary;

    summary += `\n\n📊 SCORES:\n`;
    summary += `  - Security: ${scores.security}/100\n`;
    summary += `  - Quality: ${scores.quality}/100\n`;
    summary += `  - Performance: ${scores.performance}/100\n`;

    if (mustFix.length > 0) {
      summary += `\n🔴 MUST FIX: ${mustFix.length} critical issues\n`;
      const securityCount = mustFix.filter((i) => i.type === 'security').length;
      const bugCount = mustFix.filter((i) => i.type === 'bug').length;
      if (securityCount > 0) summary += `  - ${securityCount} security issues\n`;
      if (bugCount > 0) summary += `  - ${bugCount} bugs\n`;
    }

    if (suggestions.length > 0) {
      summary += `\n💡 SUGGESTIONS: ${suggestions.length} improvements recommended\n`;
    }

    if (mustFix.length === 0 && scores.security >= 80 && scores.quality >= 80) {
      summary += `\n✅ Code is production-ready!`;
    } else if (mustFix.length === 0) {
      summary += `\n⚠️ Code passes review but has quality issues.`;
    } else {
      summary += `\n❌ Code needs fixes before merging.`;
    }

    return summary;
  }

  /**
   * Get fallback output when review fails
   */
  private getFallbackOutput(): ReviewOutput {
    logger.warn('Using fallback review output', { agent: 'review' });

    return {
      approved: false,
      issues: [
        {
          severity: 'error',
          type: 'quality',
          file: 'unknown',
          message: 'Review failed - manual review required',
          suggestion: 'Review code manually',
        },
      ],
      summary: 'Automated review failed - manual review required',
      mustFix: [
        {
          severity: 'error',
          type: 'quality',
          file: 'unknown',
          message: 'Review failed - manual review required',
          suggestion: 'Review code manually',
        },
      ],
      suggestions: [],
      securityScore: 0,
      qualityScore: 0,
      performanceScore: 0,
    };
  }
}
