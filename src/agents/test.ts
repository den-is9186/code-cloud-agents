import { Agent, AgentRole, SubTask, FileChange, TestFile, TestResult, TestFailure } from './types';
import { llmClient } from '../llm/client';
import { executeTool } from '../tools';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';
import { validatePath } from '../tools/index';

export class TestAgent implements Agent {
  role: AgentRole = 'test';
  model: string;
  status = 'idle' as const;

  constructor(model: string) {
    this.model = model;
  }

  async execute(input: { filesChanged: FileChange[]; task: SubTask }): Promise<{
    testsWritten: TestFile[];
    testResults: TestResult;
    failures?: TestFailure[];
  }> {
    const codeToTest = input.filesChanged
      .filter(f => f.action !== 'delete')
      .map(f => `--- ${f.path} ---\n${f.content}`)
      .join('\n\n');

    const response = await llmClient.chat(this.model, [
      {
        role: 'system',
        content: `Du bist ein Test Agent. Schreibe Tests für den gegebenen Code.

Antworte NUR mit validem JSON:
{
  "testsWritten": [
    {
      "path": "tests/example.test.ts",
      "testCount": 3,
      "content": "import { describe, it, expect } from 'vitest';\\n..."
    }
  ]
}`
      },
      {
        role: 'user',
        content: `Schreibe Tests für:\n${codeToTest}`
      }
    ]);

    try {
      const TestAgentResponseSchema = z.object({
        testsWritten: z.array(z.object({
          path: z.string(),
          testCount: z.number(),
          content: z.string()
        }))
      });
      const parsed = safeJsonParse(response.content, TestAgentResponseSchema);

      // Write test files
      for (const test of parsed.testsWritten) {
        await executeTool('file_write', { path: test.path, content: test.content });
      }

      // Write test files - validate paths first
      for (const test of parsed.testsWritten) {
        // Validate the test file path before writing
        const safePath = validatePath(test.path);
        await executeTool('file_write', { path: safePath, content: test.content });
      }

      // Run tests using execFileAsync for better security (prevents shell injection)
      let stdout = '';
      let exitCode = 0;
      
      try {
        // Use execFileAsync instead of shell_exec to avoid shell injection
        // npm test with arguments passed as separate array elements
        const { execFile } = await import('child_process');
        const { promisify } = await import('util');
        const execFileAsync = promisify(execFile);
        
        const result = await execFileAsync('npm', ['test', '--', '--reporter=json'], {
          cwd: process.cwd(),
          timeout: 30000, // 30 second timeout
          stdio: ['ignore', 'pipe', 'pipe']
        });
        stdout = result.stdout;
        exitCode = 0;
      } catch (error: any) {
        // execFileAsync throws on non-zero exit codes
        stdout = error.stdout || '';
        exitCode = error.code || 1;
      }

      const testResults: TestResult = {
        passed: 0,
        failed: 0,
        skipped: 0,
        duration: 0
      };

      // Parse test output with Zod validation
      const TestOutputSchema = z.object({
        numPassedTests: z.number().optional(),
        numFailedTests: z.number().optional(),
        numSkippedTests: z.number().optional(),
        testResults: z.array(z.object({
          duration: z.number().optional()
        })).optional()
      });

      try {
        const results = safeJsonParse(stdout, TestOutputSchema, {
          numPassedTests: 0,
          numFailedTests: 0,
          numSkippedTests: 0
        });
        
        testResults.passed = results.numPassedTests || 0;
        testResults.failed = results.numFailedTests || 0;
        testResults.skipped = results.numSkippedTests || 0;
        
        // Calculate duration if available
        if (results.testResults && Array.isArray(results.testResults)) {
          testResults.duration = results.testResults.reduce((sum, test) => sum + (test.duration || 0), 0);
        }
      } catch {
        // Fallback to counting tests if parsing fails
        testResults.passed = exitCode === 0 ? parsed.testsWritten.reduce((a: number, t: any) => a + t.testCount, 0) : 0;
      }

      return {
        testsWritten: parsed.testsWritten,
        testResults
      };
    } catch {
      return {
        testsWritten: [],
        testResults: { passed: 0, failed: 0, skipped: 0, duration: 0 }
      };
    }
  }
}
