/**
 * Merge Agent Tests
 *
 * Tests for the Merge Agent that intelligently merges code from different branches
 */

const { MergeAgent } = require('../dist/agents/merge');
const { llmClient } = require('../dist/llm/client');
const { executeTool } = require('../dist/tools');

jest.mock('../dist/llm/client');
jest.mock('../dist/tools');

describe('MergeAgent', () => {
  let agent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new MergeAgent('claude-sonnet-4');
  });

  describe('Agent Properties', () => {
    test('should have correct role', () => {
      expect(agent.role).toBe('merge');
    });

    test('should have correct model', () => {
      expect(agent.model).toBe('claude-sonnet-4');
    });

    test('should have idle status', () => {
      expect(agent.status).toBe('idle');
    });
  });

  describe('execute()', () => {
    test('should merge files without conflicts', async () => {
      // Mock file reading
      executeTool.mockResolvedValueOnce({
        content: 'function hello() { return "Hello World"; }',
      });

      // Mock LLM response
      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          conflicts: [],
          filesChanged: [
            {
              path: 'src/greet.ts',
              action: 'modify',
              content: 'function hello() { return "Hello World"; }',
            },
          ],
          summary: 'No conflicts, clean merge',
          requiresManualReview: false,
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.001 },
      });

      // Mock file writing
      executeTool.mockResolvedValueOnce({});

      const result = await agent.execute({
        task: 'Merge feature branch',
        sourceBranch: 'feature/greeting',
        files: ['src/greet.ts'],
      });

      expect(result.filesChanged).toHaveLength(1);
      expect(result.conflicts).toHaveLength(0);
      expect(result.requiresManualReview).toBe(false);
      expect(result.summary).toBe('No conflicts, clean merge');
    });

    test('should detect and resolve content conflicts', async () => {
      executeTool
        .mockResolvedValueOnce({
          content: 'const value = 1;',
        })
        .mockResolvedValueOnce({
          content: 'const value = 2;',
        });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          conflicts: [
            {
              file: 'src/config.ts',
              conflictType: 'content',
              baseContent: 'const value = 0;',
              ourContent: 'const value = 1;',
              theirContent: 'const value = 2;',
              resolution: 'const value = 2;',
              confidence: 'medium',
            },
          ],
          filesChanged: [
            {
              path: 'src/config.ts',
              action: 'modify',
              content: 'const value = 2;',
            },
          ],
          summary: '1 content conflict resolved',
          requiresManualReview: false,
        }),
        usage: { inputTokens: 120, outputTokens: 180, totalTokens: 300, cost: 0.0015 },
      });

      executeTool.mockResolvedValueOnce({});

      const result = await agent.execute({
        task: 'Merge with conflict resolution',
        baseBranch: 'main',
        sourceBranch: 'feature/config',
        files: ['src/config.ts'],
      });

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].conflictType).toBe('content');
      expect(result.conflicts[0].confidence).toBe('medium');
      expect(result.filesChanged).toHaveLength(1);
    });

    test('should handle "ours" strategy', async () => {
      executeTool.mockResolvedValueOnce({
        content: 'const ours = true;',
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          conflicts: [],
          filesChanged: [
            {
              path: 'src/strategy.ts',
              action: 'modify',
              content: 'const ours = true;',
            },
          ],
          summary: 'Used "ours" strategy, kept our changes',
          requiresManualReview: false,
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.001 },
      });

      executeTool.mockResolvedValueOnce({});

      const result = await agent.execute({
        task: 'Merge keeping our changes',
        sourceBranch: 'feature/ours',
        files: ['src/strategy.ts'],
        strategy: 'ours',
      });

      expect(llmClient.chat).toHaveBeenCalledWith(
        'claude-sonnet-4',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Merge Strategy: ours'),
          }),
        ])
      );
      expect(result.summary).toContain('ours');
    });

    test('should handle "theirs" strategy', async () => {
      executeTool.mockResolvedValueOnce({
        content: 'const theirs = true;',
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          conflicts: [],
          filesChanged: [
            {
              path: 'src/strategy.ts',
              action: 'modify',
              content: 'const theirs = true;',
            },
          ],
          summary: 'Used "theirs" strategy, accepted their changes',
          requiresManualReview: false,
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.001 },
      });

      executeTool.mockResolvedValueOnce({});

      const result = await agent.execute({
        task: 'Merge accepting their changes',
        sourceBranch: 'feature/theirs',
        files: ['src/strategy.ts'],
        strategy: 'theirs',
      });

      expect(llmClient.chat).toHaveBeenCalledWith(
        'claude-sonnet-4',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Merge Strategy: theirs'),
          }),
        ])
      );
    });

    test('should handle "smart" strategy (default)', async () => {
      executeTool.mockResolvedValueOnce({
        content: 'const smart = true;',
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          conflicts: [],
          filesChanged: [
            {
              path: 'src/strategy.ts',
              action: 'modify',
              content: 'const smart = true;',
            },
          ],
          summary: 'Smart merge completed',
          requiresManualReview: false,
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.001 },
      });

      executeTool.mockResolvedValueOnce({});

      const result = await agent.execute({
        task: 'Smart merge',
        sourceBranch: 'feature/smart',
        files: ['src/strategy.ts'],
      });

      expect(llmClient.chat).toHaveBeenCalledWith(
        'claude-sonnet-4',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('Merge Strategy: smart'),
          }),
        ])
      );
    });

    test('should handle "manual" strategy requiring review', async () => {
      executeTool.mockResolvedValueOnce({
        content: 'const manual = true;',
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          conflicts: [
            {
              file: 'src/strategy.ts',
              conflictType: 'content',
              ourContent: 'const manual = true;',
              theirContent: 'const manual = false;',
              resolution: 'const manual = true; // CONFLICT: Requires manual review',
              confidence: 'low',
            },
          ],
          filesChanged: [],
          summary: 'Manual review required for conflicts',
          requiresManualReview: true,
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.001 },
      });

      const result = await agent.execute({
        task: 'Merge with manual review',
        sourceBranch: 'feature/manual',
        files: ['src/strategy.ts'],
        strategy: 'manual',
      });

      expect(result.requiresManualReview).toBe(true);
      expect(result.conflicts).toHaveLength(1);
    });

    test('should handle structural conflicts', async () => {
      executeTool.mockResolvedValueOnce({
        content: 'class MyClass { method1() {} }',
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          conflicts: [
            {
              file: 'src/class.ts',
              conflictType: 'structure',
              ourContent: 'class MyClass { method1() {} }',
              theirContent: 'class MyClass { method2() {} }',
              resolution: 'class MyClass { method1() {} method2() {} }',
              confidence: 'high',
            },
          ],
          filesChanged: [
            {
              path: 'src/class.ts',
              action: 'modify',
              content: 'class MyClass { method1() {} method2() {} }',
            },
          ],
          summary: 'Structural conflict resolved by combining methods',
          requiresManualReview: false,
        }),
        usage: { inputTokens: 150, outputTokens: 200, totalTokens: 350, cost: 0.002 },
      });

      executeTool.mockResolvedValueOnce({});

      const result = await agent.execute({
        task: 'Merge class changes',
        sourceBranch: 'feature/class',
        files: ['src/class.ts'],
      });

      expect(result.conflicts[0].conflictType).toBe('structure');
      expect(result.conflicts[0].confidence).toBe('high');
    });

    test('should handle deletion conflicts', async () => {
      executeTool.mockResolvedValueOnce({
        content: 'function removed() { return "exists"; }',
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          conflicts: [
            {
              file: 'src/deleted.ts',
              conflictType: 'deletion',
              ourContent: '',
              theirContent: 'function removed() { return "exists"; }',
              resolution: '',
              confidence: 'low',
            },
          ],
          filesChanged: [
            {
              path: 'src/deleted.ts',
              action: 'delete',
            },
          ],
          summary: 'Deletion conflict: file removed in our branch but modified in theirs',
          requiresManualReview: true,
        }),
        usage: { inputTokens: 120, outputTokens: 170, totalTokens: 290, cost: 0.0015 },
      });

      const result = await agent.execute({
        task: 'Handle deletion conflict',
        sourceBranch: 'feature/delete',
        files: ['src/deleted.ts'],
      });

      expect(result.conflicts[0].conflictType).toBe('deletion');
      expect(result.requiresManualReview).toBe(true);
    });

    test('should handle multiple files', async () => {
      executeTool
        .mockResolvedValueOnce({ content: 'file1 content' })
        .mockResolvedValueOnce({ content: 'file2 content' });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          conflicts: [],
          filesChanged: [
            { path: 'src/file1.ts', action: 'modify', content: 'file1 merged' },
            { path: 'src/file2.ts', action: 'modify', content: 'file2 merged' },
          ],
          summary: 'Merged 2 files successfully',
          requiresManualReview: false,
        }),
        usage: { inputTokens: 200, outputTokens: 250, totalTokens: 450, cost: 0.002 },
      });

      executeTool.mockResolvedValue({});

      const result = await agent.execute({
        task: 'Merge multiple files',
        sourceBranch: 'feature/multi',
        files: ['src/file1.ts', 'src/file2.ts'],
      });

      expect(result.filesChanged).toHaveLength(2);
      expect(result.summary).toContain('2 files');
    });

    test('should handle file read errors gracefully', async () => {
      executeTool.mockRejectedValueOnce(new Error('File not found'));

      const result = await agent.execute({
        task: 'Merge non-existent file',
        sourceBranch: 'feature/missing',
        files: ['nonexistent.ts'],
      });

      expect(result.filesChanged).toHaveLength(0);
      expect(result.conflicts).toHaveLength(0);
      expect(result.summary).toBe('No files could be read for merging');
    });

    test('should handle LLM parsing errors', async () => {
      executeTool.mockResolvedValueOnce({
        content: 'const test = 1;',
      });

      llmClient.chat.mockResolvedValue({
        content: 'Invalid JSON response',
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      const result = await agent.execute({
        task: 'Merge with error',
        sourceBranch: 'feature/error',
        files: ['src/test.ts'],
      });

      expect(result.requiresManualReview).toBe(true);
      expect(result.summary).toContain('Error:');
    });

    test('should use different models', async () => {
      const budgetAgent = new MergeAgent('deepseek-r1-0528');

      executeTool.mockResolvedValueOnce({
        content: 'const budget = true;',
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          conflicts: [],
          filesChanged: [],
          summary: 'Budget merge',
          requiresManualReview: false,
        }),
        usage: { inputTokens: 50, outputTokens: 50, totalTokens: 100, cost: 0.0005 },
      });

      await budgetAgent.execute({
        task: 'Budget merge',
        sourceBranch: 'feature/budget',
        files: ['src/test.ts'],
      });

      expect(llmClient.chat).toHaveBeenCalledWith('deepseek-r1-0528', expect.any(Array));
    });

    test('should provide confidence levels', async () => {
      executeTool.mockResolvedValueOnce({
        content: 'const test = 1;',
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          conflicts: [
            {
              file: 'src/test.ts',
              conflictType: 'content',
              ourContent: 'const test = 1;',
              theirContent: 'const test = 2;',
              resolution: 'const test = 2;',
              confidence: 'high',
            },
          ],
          filesChanged: [
            {
              path: 'src/test.ts',
              action: 'modify',
              content: 'const test = 2;',
            },
          ],
          summary: 'High confidence merge',
          requiresManualReview: false,
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.001 },
      });

      executeTool.mockResolvedValueOnce({});

      const result = await agent.execute({
        task: 'Merge with confidence',
        sourceBranch: 'feature/confidence',
        files: ['src/test.ts'],
      });

      expect(result.conflicts[0].confidence).toBe('high');
    });

    test('should create new files', async () => {
      executeTool.mockResolvedValueOnce({
        content: 'const newFile = true;',
      });

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          conflicts: [],
          filesChanged: [
            {
              path: 'src/new.ts',
              action: 'create',
              content: 'const newFile = true;',
            },
          ],
          summary: 'Created new file from merge',
          requiresManualReview: false,
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.001 },
      });

      executeTool.mockResolvedValueOnce({});

      const result = await agent.execute({
        task: 'Merge new file',
        sourceBranch: 'feature/new',
        files: ['src/new.ts'],
      });

      expect(result.filesChanged[0].action).toBe('create');
      expect(executeTool).toHaveBeenCalledWith('file_write', expect.any(Object));
    });
  });
});
