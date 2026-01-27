/**
 * Refactor Agent Tests
 *
 * Tests for the Refactor Agent that improves code quality without changing functionality
 */

const { RefactorAgent } = require('../dist/agents/refactor');
const { llmClient } = require('../dist/llm/client');

jest.mock('../dist/llm/client');

// Mock tools with explicit mock factory
const mockExecuteTool = jest.fn();
jest.mock('../dist/tools', () => ({
  executeTool: mockExecuteTool,
}));

const { executeTool } = require('../dist/tools');

describe('RefactorAgent', () => {
  let agent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new RefactorAgent('claude-sonnet-4');
  });

  describe('Agent Properties', () => {
    test('should have correct role', () => {
      expect(agent.role).toBe('refactor');
    });

    test('should have correct model', () => {
      expect(agent.model).toBe('claude-sonnet-4');
    });

    test('should have idle status', () => {
      expect(agent.status).toBe('idle');
    });
  });

  describe('execute()', () => {
    test('should read and analyze files', async () => {
      // Mock file reading
      mockExecuteTool.mockResolvedValueOnce({
        content: 'function oldFunction() { return 1 + 1; }',
      });

      // Mock LLM response
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          analysis: {
            codeSmells: ['Function name not descriptive'],
            improvements: ['Use descriptive function names', 'Add type annotations'],
            complexity: 'low',
          },
          filesChanged: [
            {
              path: 'src/utils.ts',
              action: 'modify',
              content: 'function calculateSum(): number { return 1 + 1; }',
            },
          ],
          explanation: 'Renamed function to be more descriptive',
        }),
        usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300, cost: 0.001 },
      });

      // Mock file writing
      mockExecuteTool.mockResolvedValueOnce({});

      const result = await agent.execute({
        task: 'Refactor this code for better readability',
        files: ['src/utils.ts'],
      });

      expect(result.filesChanged).toHaveLength(1);
      expect(result.filesChanged[0].path).toBe('src/utils.ts');
      expect(result.filesChanged[0].action).toBe('modify');
      expect(result.analysis.codeSmells).toContain('Function name not descriptive');
      expect(result.analysis.complexity).toBe('low');
      expect(result.explanation).toBe('Renamed function to be more descriptive');
    });

    test('should handle multiple files', async () => {
      // Mock file reading for two files
      executeTool
        .mockResolvedValueOnce({
          content: 'const x = 1;',
        })
        .mockResolvedValueOnce({
          content: 'const y = 2;',
        });

      // Mock LLM response
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          analysis: {
            codeSmells: ['Single letter variable names'],
            improvements: ['Use descriptive variable names'],
            complexity: 'low',
          },
          filesChanged: [
            {
              path: 'src/file1.ts',
              action: 'modify',
              content: 'const count = 1;',
            },
            {
              path: 'src/file2.ts',
              action: 'modify',
              content: 'const total = 2;',
            },
          ],
          explanation: 'Improved variable names',
        }),
        usage: { inputTokens: 150, outputTokens: 250, totalTokens: 400, cost: 0.002 },
      });

      // Mock file writing
      mockExecuteTool.mockResolvedValue({});

      const result = await agent.execute({
        task: 'Refactor variable names',
        files: ['src/file1.ts', 'src/file2.ts'],
      });

      expect(result.filesChanged).toHaveLength(2);
      expect(result.analysis.codeSmells).toContain('Single letter variable names');
    });

    test('should handle focus areas', async () => {
      mockExecuteTool.mockResolvedValueOnce({
        content: 'function test() { /* code */ }',
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          analysis: {
            codeSmells: [],
            improvements: ['Add error handling'],
            complexity: 'medium',
          },
          filesChanged: [
            {
              path: 'src/api.ts',
              action: 'modify',
              content: 'function test() { try { /* code */ } catch (e) { /* handle */ } }',
            },
          ],
          explanation: 'Added error handling',
        }),
        usage: { inputTokens: 120, outputTokens: 220, totalTokens: 340, cost: 0.0015 },
      });

      mockExecuteTool.mockResolvedValueOnce({});

      const result = await agent.execute({
        task: 'Improve error handling',
        files: ['src/api.ts'],
        focusAreas: ['Error handling', 'Input validation'],
      });

      expect(result.analysis.improvements).toContain('Add error handling');
      expect(llmClient.chat).toHaveBeenCalledWith(
        'claude-sonnet-4',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Fokussiere auf folgende Bereiche'),
          }),
        ])
      );
    });

    test('should handle file read errors gracefully', async () => {
      // Mock file read failure
      mockExecuteTool.mockRejectedValueOnce(new Error('File not found'));

      // Mock LLM should not be called since no files could be read
      const result = await agent.execute({
        task: 'Refactor this code',
        files: ['nonexistent.ts'],
      });

      expect(result.filesChanged).toHaveLength(0);
      expect(result.analysis.codeSmells).toHaveLength(0);
      expect(result.explanation).toBe('No files could be read for refactoring');
    });

    test('should identify code smells', async () => {
      mockExecuteTool.mockResolvedValueOnce({
        content: `
          function a(x) {
            if (x > 10) {
              if (x < 20) {
                if (x !== 15) {
                  return x * 2;
                }
              }
            }
            return x;
          }
        `,
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          analysis: {
            codeSmells: [
              'Deep nesting',
              'Single letter function name',
              'No type annotations',
              'Complex boolean logic',
            ],
            improvements: [
              'Reduce nesting with early returns',
              'Use descriptive function names',
              'Add TypeScript types',
              'Simplify conditional logic',
            ],
            complexity: 'high',
          },
          filesChanged: [
            {
              path: 'src/complex.ts',
              action: 'modify',
              content: `
                function calculateValue(input: number): number {
                  if (input <= 10 || input >= 20 || input === 15) {
                    return input;
                  }
                  return input * 2;
                }
              `,
            },
          ],
          explanation: 'Reduced nesting, improved naming, added types',
        }),
        usage: { inputTokens: 200, outputTokens: 300, totalTokens: 500, cost: 0.003 },
      });

      mockExecuteTool.mockResolvedValueOnce({});

      const result = await agent.execute({
        task: 'Refactor complex function',
        files: ['src/complex.ts'],
      });

      expect(result.analysis.codeSmells).toHaveLength(4);
      expect(result.analysis.complexity).toBe('high');
      expect(result.analysis.improvements).toContain('Reduce nesting with early returns');
    });

    test('should handle LLM parsing errors', async () => {
      mockExecuteTool.mockResolvedValueOnce({
        content: 'const test = 1;',
      });

      // Mock invalid JSON response
      llmClient.chat.mockResolvedValue({
        content: 'Invalid JSON response',
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      const result = await agent.execute({
        task: 'Refactor code',
        files: ['src/test.ts'],
      });

      expect(result.filesChanged).toHaveLength(0);
      expect(result.explanation).toContain('Error:');
    });

    test('should preserve file content structure', async () => {
      const originalContent = `
/**
 * Important function
 */
function original() {
  return 42;
}
      `.trim();

      mockExecuteTool.mockResolvedValueOnce({
        content: originalContent,
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          analysis: {
            codeSmells: [],
            improvements: ['Add return type'],
            complexity: 'low',
          },
          filesChanged: [
            {
              path: 'src/func.ts',
              action: 'modify',
              content: `
/**
 * Important function
 */
function original(): number {
  return 42;
}
              `.trim(),
            },
          ],
          explanation: 'Added return type annotation',
        }),
        usage: { inputTokens: 120, outputTokens: 180, totalTokens: 300, cost: 0.0015 },
      });

      mockExecuteTool.mockResolvedValueOnce({});

      const result = await agent.execute({
        task: 'Add type annotations',
        files: ['src/func.ts'],
      });

      expect(result.filesChanged[0].content).toContain('/**');
      expect(result.filesChanged[0].content).toContain('Important function');
      expect(result.filesChanged[0].content).toContain('(): number');
    });

    test('should use correct model', async () => {
      const budgetAgent = new RefactorAgent('deepseek-r1-0528');

      mockExecuteTool.mockResolvedValueOnce({
        content: 'const x = 1;',
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          analysis: {
            codeSmells: [],
            improvements: [],
            complexity: 'low',
          },
          filesChanged: [],
          explanation: 'No changes needed',
        }),
        usage: { inputTokens: 50, outputTokens: 50, totalTokens: 100, cost: 0.0005 },
      });

      await budgetAgent.execute({
        task: 'Check code quality',
        files: ['src/test.ts'],
      });

      expect(llmClient.chat).toHaveBeenCalledWith(
        'deepseek-r1-0528',
        expect.any(Array)
      );
    });

    test('should read files before refactoring', async () => {
      mockExecuteTool.mockResolvedValueOnce({
        content: 'const safe = true;',
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          analysis: {
            codeSmells: [],
            improvements: [],
            complexity: 'low',
          },
          filesChanged: [],
          explanation: 'No changes',
        }),
        usage: { inputTokens: 50, outputTokens: 50, totalTokens: 100, cost: 0.0005 },
      });

      await agent.execute({
        task: 'Refactor',
        files: ['src/safe.ts'],
      });

      // Should call file_read for each file
      expect(executeTool).toHaveBeenCalledWith('file_read', expect.any(Object));
    });

    test('should only modify files, not create or delete', async () => {
      mockExecuteTool.mockResolvedValueOnce({
        content: 'const test = 1;',
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          analysis: {
            codeSmells: [],
            improvements: [],
            complexity: 'low',
          },
          filesChanged: [
            {
              path: 'src/test.ts',
              action: 'modify',
              content: 'const test: number = 1;',
            },
          ],
          explanation: 'Added type annotation',
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.0012 },
      });

      mockExecuteTool.mockResolvedValueOnce({});

      const result = await agent.execute({
        task: 'Add types',
        files: ['src/test.ts'],
      });

      expect(result.filesChanged).toHaveLength(1);
      expect(result.filesChanged[0].action).toBe('modify');
      expect(executeTool).toHaveBeenCalledWith('file_write', {
        path: 'src/test.ts',
        content: 'const test: number = 1;',
      });
    });
  });
});
