import {
  Agent,
  AgentRole,
  AgentStatus,
  SubTask,
  FileChange,
  TestFile,
  TestResult,
  TestFailure,
} from './types';
import { llmClient } from '../llm/client';
import { executeTool, validatePath } from '../tools';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';
import { sanitizeLogMessage } from '../utils/security';
import { logger } from '../utils/logger';

/**
 * Test Agent Input
 */
export interface TestInput {
  filesChanged: FileChange[];
  task: SubTask;
  runTests?: boolean; // Default true
  dryRun?: boolean;
}

/**
 * Test Agent Output
 */
export interface TestOutput {
  testsWritten: TestFile[];
  testResults?: TestResult;
  failures?: TestFailure[];
  coverage?: number;
  testQualityScore?: number;
}

/**
 * TestAgent - Test Generation & Execution
 *
 * Responsibilities:
 * - Generate comprehensive test suites (unit, integration, edge cases)
 * - Support multiple test frameworks (Vitest, Jest, Pytest, Go test)
 * - Write test files following best practices
 * - Execute tests and report results
 * - Calculate test coverage
 * - Ensure edge cases and error scenarios are tested
 */
export class TestAgent implements Agent {
  role: AgentRole = 'test';
  model: string;
  status: AgentStatus = 'idle';

  constructor(model: string) {
    this.model = model;
  }

  /**
   * Execute test generation
   */
  async execute(input: TestInput): Promise<TestOutput> {
    this.status = 'working';
    const startTime = Date.now();

    try {
      logger.info('Test agent starting', {
        agent: 'test',
        taskId: input.task.id,
        filesCount: input.filesChanged.length,
        runTests: input.runTests !== false,
        dryRun: !!input.dryRun,
      });

      // Detect test framework
      const framework = await this.detectTestFramework();

      // Generate tests via LLM
      const generatedTests = await this.generateTests(input.filesChanged, input.task, framework);

      // Analyze test quality
      const testQualityScore = this.analyzeTestQuality(generatedTests);

      // Write test files (unless dry-run)
      if (!input.dryRun) {
        await this.writeTestFiles(generatedTests);
      }

      // Run tests (if enabled and not dry-run)
      let testResults: TestResult | undefined;
      let failures: TestFailure[] | undefined;
      let coverage: number | undefined;

      if (input.runTests !== false && !input.dryRun) {
        const runResult = await this.runTests(framework);
        testResults = runResult.results;
        failures = runResult.failures;
        coverage = runResult.coverage;
      }

      const duration = Date.now() - startTime;
      logger.info('Test generation completed', {
        agent: 'test',
        testsCount: generatedTests.length,
        testQuality: testQualityScore,
        testsRan: !!testResults,
        passed: testResults?.passed || 0,
        failed: testResults?.failed || 0,
        coverage,
        duration,
      });

      this.status = 'completed';
      return {
        testsWritten: generatedTests,
        testResults,
        failures,
        coverage,
        testQualityScore,
      };
    } catch (error) {
      this.status = 'failed';
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('Test generation failed', {
        agent: 'test',
        taskId: input.task.id,
        error: sanitizeLogMessage(errorMsg),
      });

      return this.getFallbackOutput();
    }
  }

  /**
   * Detect test framework from package.json
   */
  private async detectTestFramework(): Promise<string> {
    try {
      const { content } = await executeTool('file_read', { path: 'package.json' });
      const pkg = JSON.parse(content as string);

      if (pkg.devDependencies?.vitest || pkg.dependencies?.vitest) {
        return 'vitest';
      }
      if (pkg.devDependencies?.jest || pkg.dependencies?.jest) {
        return 'jest';
      }
      if (pkg.devDependencies?.mocha || pkg.dependencies?.mocha) {
        return 'mocha';
      }

      return 'vitest'; // Default
    } catch {
      // Check for other frameworks
      try {
        await executeTool('file_read', { path: 'go.mod' });
        return 'go';
      } catch {}

      try {
        await executeTool('file_read', { path: 'pytest.ini' });
        return 'pytest';
      } catch {}

      return 'vitest'; // Default fallback
    }
  }

  /**
   * Generate tests via LLM
   */
  private async generateTests(
    filesChanged: FileChange[],
    task: SubTask,
    framework: string
  ): Promise<TestFile[]> {
    const codeToTest = filesChanged
      .filter((f) => f.action !== 'delete')
      .map((f) => `--- ${f.path} ---\n${f.content}`)
      .join('\n\n');

    const response = await llmClient.chat(this.model, [
      {
        role: 'system',
        content: this.buildSystemPrompt(framework),
      },
      {
        role: 'user',
        content: this.buildUserPrompt(codeToTest, task),
      },
    ]);

    return this.parseResponse(response.content);
  }

  /**
   * Build system prompt
   */
  private buildSystemPrompt(framework: string): string {
    const frameworkExamples = this.getFrameworkExamples(framework);

    return `Du bist ein Test Agent. Schreibe umfassende, hochwertige Tests.

TEST FRAMEWORK: ${framework}

TEST PRINZIPIEN:
- AAA Pattern: Arrange, Act, Assert
- Tests müssen UNABHÄNGIG sein (keine shared state)
- Tests müssen DETERMINISTISCH sein (keine random values)
- Tests müssen SCHNELL sein (< 100ms pro Test)
- Tests müssen AUSSAGEKRÄFTIG sein (clear test names)

TEST COVERAGE:
1. HAPPY PATH: Normale Verwendung
2. EDGE CASES: Boundary conditions (0, null, undefined, empty arrays, max values)
3. ERROR CASES: Invalid inputs, network failures, timeouts
4. INTEGRATION: Interaction with dependencies
5. PERFORMANCE: Large inputs, stress testing (optional)

TEST STRUCTURE:
${frameworkExamples}

BEST PRACTICES:
- Beschreibende Test-Namen (\"should return user when valid ID provided\")
- Ein Assertion pro Test (focused tests)
- Mock externe Dependencies (APIs, DB, filesystem)
- Cleanup nach Tests (close connections, delete temp files)
- Keine hardcoded values (use constants)
- Test Data Builders für komplexe Objects

SECURITY TESTING:
- Input validation tests (SQL injection, XSS)
- Authentication/Authorization tests
- Rate limiting tests
- CSRF/CORS tests (für APIs)

ANTI-PATTERNS (VERMEIDE):
- Keine Tests von Mocks (test real behavior)
- Keine brittle tests (testing implementation details)
- Keine flaky tests (time-dependent, race conditions)
- Keine assertion-less tests

Antworte NUR mit validem JSON:
{
  "testsWritten": [
    {
      "path": "tests/services/auth.test.ts",
      "testCount": 8,
      "content": "VOLLSTÄNDIGER Test Code"
    }
  ]
}`;
  }

  /**
   * Get framework-specific examples
   */
  private getFrameworkExamples(framework: string): string {
    switch (framework) {
      case 'vitest':
        return `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('UserService', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create user when valid data provided', async () => {
    // Arrange
    const userData = { name: 'John', email: 'john@example.com' };

    // Act
    const user = await createUser(userData);

    // Assert
    expect(user.name).toBe('John');
    expect(user.email).toBe('john@example.com');
  });
});`;

      case 'jest':
        return `import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';

describe('UserService', () => {
  beforeEach(() => {
    // Setup
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create user when valid data provided', async () => {
    // Arrange
    const userData = { name: 'John', email: 'john@example.com' };

    // Act
    const user = await createUser(userData);

    // Assert
    expect(user.name).toBe('John');
    expect(user.email).toBe('john@example.com');
  });
});`;

      case 'pytest':
        return `import pytest

class TestUserService:
    def setup_method(self):
        # Setup
        pass

    def teardown_method(self):
        # Cleanup
        pass

    def test_create_user_with_valid_data(self):
        # Arrange
        user_data = {'name': 'John', 'email': 'john@example.com'}

        # Act
        user = create_user(user_data)

        # Assert
        assert user['name'] == 'John'
        assert user['email'] == 'john@example.com'`;

      case 'go':
        return `package auth

import (
    "testing"
)

func TestCreateUser(t *testing.T) {
    // Arrange
    userData := User{Name: "John", Email: "john@example.com"}

    // Act
    user, err := CreateUser(userData)

    // Assert
    if err != nil {
        t.Errorf("unexpected error: %v", err)
    }
    if user.Name != "John" {
        t.Errorf("expected name John, got %s", user.Name)
    }
}`;

      default:
        return 'Use appropriate test framework syntax';
    }
  }

  /**
   * Build user prompt
   */
  private buildUserPrompt(codeToTest: string, task: SubTask): string {
    let prompt = `AUFGABE: ${task.description}\n\n`;
    prompt += `CODE ZU TESTEN:\n${codeToTest}\n\n`;
    prompt += `Schreibe umfassende Tests mit:\n`;
    prompt += `1. Happy Path Tests\n`;
    prompt += `2. Edge Case Tests (null, undefined, empty, boundaries)\n`;
    prompt += `3. Error Case Tests (invalid inputs, errors)\n`;
    prompt += `4. Security Tests (injection, validation)\n\n`;
    prompt += `Jeder Test muss KLAR benannt und FOKUSSIERT sein.`;

    return prompt;
  }

  /**
   * Parse and validate LLM response
   */
  private parseResponse(content: string): TestFile[] {
    const TestAgentResponseSchema = z.object({
      testsWritten: z.array(
        z.object({
          path: z.string(),
          testCount: z.number(),
          content: z.string(),
        })
      ),
    });

    try {
      const parsed = safeJsonParse(content, TestAgentResponseSchema);

      // Validate paths
      for (const test of parsed.testsWritten) {
        validatePath(test.path);
      }

      return parsed.testsWritten;
    } catch (error) {
      logger.error('Failed to parse test response', {
        agent: 'test',
        error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
      });
      throw error;
    }
  }

  /**
   * Write test files to disk
   */
  private async writeTestFiles(tests: TestFile[]): Promise<void> {
    for (const test of tests) {
      try {
        const safePath = validatePath(test.path);
        await executeTool('file_write', {
          path: safePath,
          content: test.content,
        });

        logger.info('Test file written', {
          agent: 'test',
          path: safePath,
          testCount: test.testCount,
        });
      } catch (error) {
        logger.error('Failed to write test file', {
          agent: 'test',
          path: test.path,
          error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
        });
        throw error;
      }
    }
  }

  /**
   * Run tests and collect results
   */
  private async runTests(
    framework: string
  ): Promise<{ results: TestResult; failures?: TestFailure[]; coverage?: number }> {
    try {
      const { execFile } = await import('child_process');
      const { promisify } = await import('util');
      const execFileAsync = promisify(execFile);

      let command: string;
      let args: string[];

      switch (framework) {
        case 'vitest':
          command = 'npm';
          args = ['test', '--', '--reporter=json', '--coverage'];
          break;
        case 'jest':
          command = 'npm';
          args = ['test', '--', '--json', '--coverage'];
          break;
        case 'pytest':
          command = 'pytest';
          args = ['--json-report', '--cov'];
          break;
        case 'go':
          command = 'go';
          args = ['test', '-json', '-cover'];
          break;
        default:
          command = 'npm';
          args = ['test'];
      }

      logger.info('Running tests', {
        agent: 'test',
        command,
        args: args.join(' '),
      });

      let stdout = '';
      let exitCode = 0;

      try {
        const result = await execFileAsync(command, args, {
          cwd: process.cwd(),
          timeout: 60000, // 60 second timeout
        });
        stdout = result.stdout;
        exitCode = 0;
      } catch (error: unknown) {
        // Test failures cause non-zero exit
        if (typeof error === 'object' && error !== null && 'stdout' in error) {
          stdout = (error as { stdout?: string }).stdout || '';
          exitCode = (error as { code?: number }).code || 1;
        }
      }

      return this.parseTestResults(stdout, framework, exitCode);
    } catch (error) {
      logger.error('Failed to run tests', {
        agent: 'test',
        error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
      });

      return {
        results: {
          passed: 0,
          failed: 0,
          skipped: 0,
          duration: 0,
        },
      };
    }
  }

  /**
   * Parse test execution results
   */
  private parseTestResults(
    stdout: string,
    _framework: string,
    exitCode: number
  ): { results: TestResult; failures?: TestFailure[]; coverage?: number } {
    const TestOutputSchema = z.object({
      numPassedTests: z.number().optional(),
      numFailedTests: z.number().optional(),
      numSkippedTests: z.number().optional(),
      testResults: z
        .array(
          z.object({
            duration: z.number().optional(),
            assertionResults: z
              .array(
                z.object({
                  status: z.string(),
                  title: z.string(),
                  failureMessages: z.array(z.string()).optional(),
                })
              )
              .optional(),
          })
        )
        .optional(),
      coverageMap: z.any().optional(),
    });

    try {
      const parsed = safeJsonParse(stdout, TestOutputSchema, {
        numPassedTests: 0,
        numFailedTests: 0,
        numSkippedTests: 0,
      });

      const results: TestResult = {
        passed: parsed.numPassedTests || 0,
        failed: parsed.numFailedTests || 0,
        skipped: parsed.numSkippedTests || 0,
        duration: 0,
      };

      // Calculate duration
      if (parsed.testResults && Array.isArray(parsed.testResults)) {
        results.duration = parsed.testResults.reduce((sum, test) => sum + (test.duration || 0), 0);
      }

      // Extract failures
      const failures: TestFailure[] = [];
      if (parsed.testResults) {
        for (const testResult of parsed.testResults) {
          if (testResult.assertionResults) {
            for (const assertion of testResult.assertionResults) {
              if (assertion.status === 'failed' && assertion.failureMessages) {
                failures.push({
                  testName: assertion.title,
                  file: '',
                  error: assertion.failureMessages.join('\n'),
                });
              }
            }
          }
        }
      }

      // Calculate coverage
      let coverage: number | undefined;
      if (parsed.coverageMap) {
        coverage = this.calculateCoverage(parsed.coverageMap);
      }

      return {
        results,
        failures: failures.length > 0 ? failures : undefined,
        coverage,
      };
    } catch (error) {
      logger.warn('Failed to parse test output, using fallback', {
        agent: 'test',
        error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
      });

      // Fallback based on exit code
      return {
        results: {
          passed: exitCode === 0 ? 1 : 0,
          failed: exitCode === 0 ? 0 : 1,
          skipped: 0,
          duration: 0,
        },
      };
    }
  }

  /**
   * Calculate test coverage percentage
   */
  private calculateCoverage(coverageMap: Record<string, unknown>): number {
    try {
      // Coverage map structure varies by framework
      // Simplified: average line coverage across files
      let totalLines = 0;
      let coveredLines = 0;

      for (const file of Object.values(coverageMap)) {
        if (typeof file === 'object' && file !== null) {
          const lineData = (file as { s?: Record<string, number> }).s;
          if (lineData) {
            for (const hits of Object.values(lineData)) {
              totalLines++;
              if (hits > 0) coveredLines++;
            }
          }
        }
      }

      if (totalLines === 0) return 0;
      return Math.round((coveredLines / totalLines) * 100);
    } catch {
      return 0;
    }
  }

  /**
   * Analyze test quality (0-100)
   */
  private analyzeTestQuality(tests: TestFile[]): number {
    let score = 100;

    for (const test of tests) {
      const content = test.content.toLowerCase();

      // Deduct for missing AAA pattern indicators
      if (!content.includes('arrange') && !content.includes('act') && !content.includes('assert')) {
        score -= 5;
      }

      // Deduct for missing edge case tests
      if (
        !content.includes('null') &&
        !content.includes('undefined') &&
        !content.includes('empty')
      ) {
        score -= 10;
      }

      // Deduct for missing error tests
      if (!content.includes('error') && !content.includes('throw') && !content.includes('fail')) {
        score -= 10;
      }

      // Deduct for too few tests
      if (test.testCount < 3) {
        score -= 15;
      }

      // Deduct for missing mocks/setup
      if (
        !content.includes('beforeeach') &&
        !content.includes('setup') &&
        !content.includes('mock')
      ) {
        score -= 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get fallback output when test generation fails
   */
  private getFallbackOutput(): TestOutput {
    logger.warn('Using fallback test output', { agent: 'test' });

    return {
      testsWritten: [],
      testResults: {
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0,
      },
      testQualityScore: 0,
    };
  }
}
