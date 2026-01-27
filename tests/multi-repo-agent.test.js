/**
 * Multi-Repo Agent Tests
 *
 * Tests for the Multi-Repo Agent that coordinates changes across multiple repositories
 */

const path = require('path');
const { promisify } = require('util');

jest.mock('../dist/llm/client');

// Mock child_process with explicit mock factory
const mockExecFile = jest.fn();
jest.mock('child_process', () => ({
  execFile: mockExecFile,
}));

const { execFile } = require('child_process');

// Mock fs/promises module
const mockAccess = jest.fn();
const mockStat = jest.fn();
const mockReaddir = jest.fn();
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn();
const mockMkdir = jest.fn();
const mockUnlink = jest.fn();

jest.mock('fs/promises', () => ({
  access: (...args) => mockAccess(...args),
  stat: (...args) => mockStat(...args),
  readdir: (...args) => mockReaddir(...args),
  readFile: (...args) => mockReadFile(...args),
  writeFile: (...args) => mockWriteFile(...args),
  mkdir: (...args) => mockMkdir(...args),
  unlink: (...args) => mockUnlink(...args),
}));

const { MultiRepoAgent } = require('../dist/agents/multi-repo');
const { llmClient } = require('../dist/llm/client');

const execFileAsync = promisify(execFile);

describe('MultiRepoAgent', () => {
  let agent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new MultiRepoAgent('claude-sonnet-4');

    // Default mock implementations
    mockAccess.mockResolvedValue(undefined);
    mockStat.mockResolvedValue({ isDirectory: () => true });
    mockReaddir.mockResolvedValue([]);
    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
    mockReadFile.mockResolvedValue('{}');
    mockUnlink.mockResolvedValue(undefined);

    mockExecFile.mockImplementation((cmd, args, options, callback) => {
      if (!callback && typeof options === 'function') {
        callback = options;
      }
      callback(null, { stdout: 'abc123\n', stderr: '' });
    });
  });

  describe('Agent Properties', () => {
    test('should have correct role', () => {
      expect(agent.role).toBe('multi-repo');
    });

    test('should have correct model', () => {
      expect(agent.model).toBe('claude-sonnet-4');
    });

    test('should have idle status', () => {
      expect(agent.status).toBe('idle');
    });
  });

  describe('execute()', () => {
    test('should process multiple repositories successfully', async () => {
      const mockRepos = [
        { path: '/repos/repo1', name: 'repo1', remote: 'origin' },
        { path: '/repos/repo2', name: 'repo2', remote: 'origin' },
      ];

      mockReaddir.mockResolvedValue([
        { name: 'src', isDirectory: () => true },
        { name: 'index.js', isDirectory: () => false },
      ]);

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          files: [
            {
              path: 'src/config.js',
              action: 'modify',
              content: 'export const API_URL = "https://api.example.com";',
            },
          ],
          explanation: 'Updated API URL',
        }),
        usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250, cost: 0.001 },
      });

      const result = await agent.execute({
        repos: mockRepos,
        task: 'Update API URL',
        changes: 'Change API URL to https://api.example.com',
        createPRs: false,
      });

      expect(result.success).toBe(true);
      expect(result.reposProcessed).toBe(2);
      expect(result.reposFailed).toBe(0);
      expect(result.changes).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    test('should handle repository validation errors', async () => {
      mockAccess.mockRejectedValue(new Error('Directory not found'));

      const mockRepos = [{ path: '/nonexistent/repo', name: 'repo1' }];

      await expect(
        agent.execute({
          repos: mockRepos,
          task: 'Update config',
          changes: 'Change config',
          createPRs: false,
        })
      ).rejects.toThrow('Repository validation failed');
    });

    test('should continue processing other repos if one fails', async () => {
      const mockRepos = [
        { path: '/repos/repo1', name: 'repo1' },
        { path: '/repos/repo2', name: 'repo2' },
        { path: '/repos/repo3', name: 'repo3' },
      ];

      mockReaddir.mockResolvedValue([]);

      llmClient.chat
        .mockResolvedValueOnce({
          content: JSON.stringify({
            files: [{ path: 'file1.js', action: 'modify', content: 'content1' }],
          }),
          usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
        })
        .mockRejectedValueOnce(new Error('LLM failed'))
        .mockResolvedValueOnce({
          content: JSON.stringify({
            files: [{ path: 'file3.js', action: 'modify', content: 'content3' }],
          }),
          usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
        });

      const result = await agent.execute({
        repos: mockRepos,
        task: 'Update files',
        changes: 'Change files',
        createPRs: false,
      });

      expect(result.success).toBe(false);
      expect(result.reposProcessed).toBe(2);
      expect(result.reposFailed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].repo).toBe('repo2');
    });

    test('should create PRs when requested', async () => {
      const mockRepos = [{ path: '/repos/repo1', name: 'repo1', remote: 'origin' }];

      mockReaddir.mockResolvedValue([]);

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          files: [{ path: 'README.md', action: 'modify', content: '# Updated README' }],
        }),
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      execFile.mockImplementation((cmd, args, options, callback) => {
        if (!callback && typeof options === 'function') {
          callback = options;
        }
        if (cmd === 'gh' && args[0] === 'pr') {
          callback(null, { stdout: 'https://github.com/owner/repo1/pull/1\n', stderr: '' });
        } else {
          callback(null, { stdout: 'abc123\n', stderr: '' });
        }
      });

      const result = await agent.execute({
        repos: mockRepos,
        task: 'Update README',
        changes: 'Improve documentation',
        createPRs: true,
      });

      expect(result.success).toBe(true);
      expect(result.changes[0].prUrl).toBe('https://github.com/owner/repo1/pull/1');
    });

    test('should use custom branch names', async () => {
      const mockRepos = [{ path: '/repos/repo1', name: 'repo1' }];

      mockReaddir.mockResolvedValue([]);

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          files: [{ path: 'config.js', action: 'modify', content: 'config' }],
        }),
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      const result = await agent.execute({
        repos: mockRepos,
        task: 'Update config',
        changes: 'Change config',
        createPRs: false,
        targetBranch: 'feature/custom-branch',
      });

      expect(result.success).toBe(true);
      expect(result.changes[0].branch).toBe('feature/custom-branch');
    });

    test('should handle file creation', async () => {
      const mockRepos = [{ path: '/repos/repo1', name: 'repo1' }];

      mockReaddir.mockResolvedValue([]);

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          files: [
            { path: 'newfile.js', action: 'create', content: 'console.log("new file");' },
          ],
        }),
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      const result = await agent.execute({
        repos: mockRepos,
        task: 'Add new file',
        changes: 'Create newfile.js',
        createPRs: false,
      });

      expect(result.success).toBe(true);
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('should handle file deletion', async () => {
      const mockRepos = [{ path: '/repos/repo1', name: 'repo1' }];

      mockReaddir.mockResolvedValue([]);

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          files: [{ path: 'oldfile.js', action: 'delete' }],
        }),
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      const result = await agent.execute({
        repos: mockRepos,
        task: 'Remove old file',
        changes: 'Delete oldfile.js',
        createPRs: false,
      });

      expect(result.success).toBe(true);
      expect(mockUnlink).toHaveBeenCalled();
    });

    test('should detect repository language and framework', async () => {
      const mockRepos = [{ path: '/repos/repo1', name: 'repo1' }];

      mockReaddir
        .mockResolvedValueOnce([
          { name: 'src', isDirectory: () => true },
          { name: 'package.json', isDirectory: () => false },
        ])
        .mockResolvedValueOnce([
          { name: 'index.ts', isDirectory: () => false },
          { name: 'app.tsx', isDirectory: () => false },
        ]);

      mockReadFile.mockResolvedValue(
        JSON.stringify({
          dependencies: {
            react: '^18.0.0',
          },
        })
      );

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          files: [],
        }),
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      await agent.execute({
        repos: mockRepos,
        task: 'Test',
        changes: 'Test',
        createPRs: false,
      });

      expect(llmClient.chat).toHaveBeenCalledWith(
        'claude-sonnet-4',
        expect.arrayContaining([
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('typescript'),
          }),
        ])
      );
    });

    test('should track total cost and tokens', async () => {
      const mockRepos = [
        { path: '/repos/repo1', name: 'repo1' },
        { path: '/repos/repo2', name: 'repo2' },
      ];

      mockReaddir.mockResolvedValue([]);

      llmClient.chat.mockResolvedValue({
        content: JSON.stringify({
          files: [{ path: 'file.js', action: 'modify', content: 'content' }],
        }),
        usage: { inputTokens: 1000, outputTokens: 500, totalTokens: 1500, cost: 0.05 },
      });

      const result = await agent.execute({
        repos: mockRepos,
        task: 'Update',
        changes: 'Changes',
        createPRs: false,
      });

      expect(result.totalCost).toBe(0.1); // 0.05 * 2 repos
      expect(result.totalTokens).toBe(3000); // 1500 * 2 repos
    });

    test('should handle invalid LLM response', async () => {
      const mockRepos = [{ path: '/repos/repo1', name: 'repo1' }];

      mockReaddir.mockResolvedValue([]);

      llmClient.chat.mockResolvedValue({
        content: 'Invalid JSON response',
        usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
      });

      const result = await agent.execute({
        repos: mockRepos,
        task: 'Update',
        changes: 'Changes',
        createPRs: false,
      });

      expect(result.success).toBe(true);
      expect(result.changes[0].filesChanged).toHaveLength(0);
    });

    test('should generate summary', async () => {
      const mockRepos = [
        { path: '/repos/repo1', name: 'repo1' },
        { path: '/repos/repo2', name: 'repo2' },
      ];

      mockReaddir.mockResolvedValue([]);

      llmClient.chat
        .mockResolvedValueOnce({
          content: JSON.stringify({
            files: [{ path: 'file1.js', action: 'modify', content: 'content1' }],
          }),
          usage: { inputTokens: 100, outputTokens: 100, totalTokens: 200, cost: 0.001 },
        })
        .mockRejectedValueOnce(new Error('Failed'));

      const result = await agent.execute({
        repos: mockRepos,
        task: 'Update',
        changes: 'Changes',
        createPRs: false,
      });

      expect(result.summary).toContain('Successfully processed: 1');
      expect(result.summary).toContain('Failed: 1');
      expect(result.summary).toContain('repo1');
      expect(result.summary).toContain('repo2');
    });

    test('should use different models', async () => {
      const budgetAgent = new MultiRepoAgent('deepseek-r1');
      const premiumAgent = new MultiRepoAgent('claude-opus-4');

      expect(budgetAgent.model).toBe('deepseek-r1');
      expect(premiumAgent.model).toBe('claude-opus-4');
    });
  });
});
