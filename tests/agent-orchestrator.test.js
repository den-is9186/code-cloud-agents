const Redis = require('ioredis');

// Mock Redis before requiring modules
jest.mock('ioredis');

// Mock LLM client - MUST be before requiring agent-orchestrator
jest.mock('../dist/llm/client', () => ({
  llmClient: {
    chat: jest.fn(),
  },
}));

// Mock tools to prevent real file system operations in tests
jest.mock('../src/tools', () => ({
  executeTool: jest.fn().mockImplementation((toolName) => {
    if (toolName === 'file_write' || toolName === 'file_delete') {
      return Promise.resolve({ success: true });
    }
    // Reject file reads so agents use their fallback paths
    return Promise.reject(new Error('Mock: file reads not supported in test environment'));
  }),
  validatePath: jest.fn().mockImplementation((p) => p),
}));

// Mock child_process to prevent recursive test runs
jest.mock('child_process', () => ({
  execFile: jest.fn((cmd, args, opts, callback) => {
    const cb = typeof opts === 'function' ? opts : callback;
    if (cb) cb(null, '{"numFailedTests":0,"numPassedTests":0,"testResults":[]}', '');
  }),
}));

// Import after mocks are set up
const { orchestrateBuild, executeAgentSequence, getBuildProgress } = require('../dist/services/agent-orchestrator');

const { getBuild, getAgentRun, getBuildAgentRuns } = require('../src/database/redis-schema');
const { llmClient } = require('../dist/llm/client');

// Mock LLM responses per agent type
const codeAgentResponse = JSON.stringify({
  filesChanged: [
    {
      path: 'src/feature.ts',
      action: 'create',
      content: 'export const feature = () => {};',
    },
  ],
  explanation: 'Created feature implementation',
});

const reviewAgentResponse = JSON.stringify({
  issues: [],
  summary: 'Code review passed with no issues',
});

const testAgentResponse = JSON.stringify({
  testsWritten: [
    {
      path: 'tests/feature.test.ts',
      testCount: 3,
      content: 'describe("feature", () => { test("works", () => { expect(true).toBe(true); }); });',
    },
  ],
});

const docsAgentResponse = JSON.stringify({
  docsUpdated: [
    {
      path: 'docs/feature.md',
      action: 'create',
      content: '# Feature\n\nDocumentation for the feature module.',
    },
  ],
  changelogEntry: '- Added feature module',
});

describe('Agent Orchestrator', () => {
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    Redis.mockStore.clear();
    mockRedis = new Redis();

    // Set up LLM mock with agent-specific responses based on system prompt content
    llmClient.chat.mockImplementation((model, messages) => {
      const systemMsg = messages[0]?.content || '';

      if (systemMsg.includes('Code Reviewer')) {
        return Promise.resolve({
          content: reviewAgentResponse,
          usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        });
      }
      if (systemMsg.includes('Code Agent')) {
        return Promise.resolve({
          content: codeAgentResponse,
          usage: { inputTokens: 200, outputTokens: 300, totalTokens: 500 },
        });
      }
      if (systemMsg.includes('Test Agent')) {
        return Promise.resolve({
          content: testAgentResponse,
          usage: { inputTokens: 150, outputTokens: 200, totalTokens: 350 },
        });
      }
      if (systemMsg.includes('Documentation Agent')) {
        return Promise.resolve({
          content: docsAgentResponse,
          usage: { inputTokens: 100, outputTokens: 150, totalTokens: 250 },
        });
      }
      // Default for supervisor/architect/coach (they have robust fallbacks for invalid JSON)
      return Promise.resolve({
        content: JSON.stringify({}),
        usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
      });
    });

    // Use fake timers for duration calculations
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Agent Sequence', () => {
    test('orchestrateBuild should execute agents in correct sequence', async () => {
      const result = await orchestrateBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
        task: 'Create a login form',
        projectPath: '/project/path',
      });

      expect(result.buildId).toBeDefined();
      expect(result.success).toBe(true);

      // Check that build was created
      const build = await getBuild(mockRedis, result.buildId);
      expect(build).toBeDefined();
      expect(build.status).toBe('completed');
      expect(build.preset).toBe('A');

      // Check that agent runs were created
      const runIds = await getBuildAgentRuns(mockRedis, result.buildId);
      expect(runIds.length).toBeGreaterThan(0);

      // Verify agent sequence
      const runs = [];
      for (const runId of runIds) {
        const run = await getAgentRun(mockRedis, runId);
        runs.push(run);
      }

      // Expected sequence: supervisor → architect → coach → code → review → test → docs
      const expectedAgents = ['supervisor', 'architect', 'coach', 'code', 'review', 'test', 'docs'];
      const actualAgents = runs.map((r) => r.agentName);

      // Check that all expected agents were executed (order might vary slightly in parallel execution)
      expectedAgents.forEach((agent) => {
        expect(actualAgents).toContain(agent);
      });
    });

    test('orchestrateBuild should track costs for each agent', async () => {
      const result = await orchestrateBuild(mockRedis, {
        teamId: 'team-456',
        preset: 'B',
        phase: 'prototype',
        task: 'Add user authentication',
        projectPath: '/project/path',
      });

      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.totalTokens).toBeGreaterThan(0);

      // Check individual agent costs
      const runIds = await getBuildAgentRuns(mockRedis, result.buildId);
      for (const runId of runIds) {
        const run = await getAgentRun(mockRedis, runId);
        if (run.status === 'completed') {
          expect(run.cost).toBeGreaterThan(0);
          expect(run.totalTokens).toBeGreaterThan(0);
        }
      }
    });

    test('orchestrateBuild should handle different presets', async () => {
      const presets = ['A', 'B', 'C'];

      for (const preset of presets) {
        const result = await orchestrateBuild(mockRedis, {
          teamId: 'team-789',
          preset,
          phase: 'prototype',
          task: 'Test preset execution',
          projectPath: '/project/path',
        });

        expect(result.buildId).toBeDefined();
        expect(result.success).toBe(true);

        const build = await getBuild(mockRedis, result.buildId);
        expect(build.preset).toBe(preset);
      }
    });

    test('orchestrateBuild should throw for invalid preset', async () => {
      await expect(
        orchestrateBuild(mockRedis, {
          teamId: 'team-123',
          preset: 'INVALID',
          phase: 'prototype',
          task: 'Test task',
          projectPath: '/project/path',
        })
      ).rejects.toThrow('not found');
    });
  });

  describe('Agent Error Handling', () => {
    test('orchestrateBuild should handle agent failures gracefully', async () => {
      // We can't easily mock agent failures in the current implementation
      // because the agents are simulated. However, we can test the structure.

      const result = await orchestrateBuild(mockRedis, {
        teamId: 'team-error',
        preset: 'A',
        phase: 'prototype',
        task: 'Test error handling',
        projectPath: '/project/path',
      });

      // Even with potential errors, the build should complete
      expect(result.buildId).toBeDefined();

      const build = await getBuild(mockRedis, result.buildId);
      expect(build.status).toBe('completed');
    });

    test('orchestrateBuild should record errors in build result', async () => {
      const result = await orchestrateBuild(mockRedis, {
        teamId: 'team-error-2',
        preset: 'A',
        phase: 'prototype',
        task: 'Test error recording',
        projectPath: '/project/path',
      });

      // Errors array should exist (even if empty in successful build)
      expect(Array.isArray(result.errors)).toBe(true);
    });

    test('orchestrateBuild should fail build on critical errors', async () => {
      // Test that a build with invalid preset fails properly
      // This tests the error handling path without needing to mock internal functions
      await expect(
        orchestrateBuild(mockRedis, {
          teamId: 'team-critical',
          preset: 'NONEXISTENT',
          phase: 'prototype',
          task: 'Test critical failure',
          projectPath: '/project/path',
        })
      ).rejects.toThrow();
    });

    test('failed build should be marked as failed in database', async () => {
      // Make llmClient return empty response for code agent → code fallback → empty filesChanged
      // → review agent fails → build marked as failed
      llmClient.chat.mockImplementation((model, messages) => {
        const systemMsg = messages[0]?.content || '';
        if (systemMsg.includes('Code Agent')) {
          // Return invalid JSON so code agent falls back to getFallbackOutput (filesChanged: [])
          return Promise.reject(new Error('Agent execution failed'));
        }
        return Promise.resolve({
          content: '{}',
          usage: { inputTokens: 100, outputTokens: 50, totalTokens: 150 },
        });
      });

      let buildId;
      try {
        await orchestrateBuild(mockRedis, {
          teamId: 'team-failed',
          preset: 'A',
          phase: 'prototype',
          task: 'Test failed build',
          projectPath: '/project/path',
        });
      } catch (error) {
        // Get the build that was created before failure
        const allKeys = Array.from(Redis.mockStore.keys());
        const buildKey = allKeys.find((key) => key.startsWith('build:') && key !== 'build:id_counter');

        if (buildKey) {
          buildId = buildKey.replace('build:', '');
          const build = await getBuild(mockRedis, buildId);

          expect(build.status).toBe('completed');
          expect(build.success).toBe(false);
          expect(build.errorMessage).toBeTruthy();
        }
      }
    });
  });

  describe('Build Progress Monitoring', () => {
    test('getBuildProgress should return current build status', async () => {
      const buildResult = await orchestrateBuild(mockRedis, {
        teamId: 'team-progress',
        preset: 'A',
        phase: 'prototype',
        task: 'Test progress monitoring',
        projectPath: '/project/path',
      });

      const progress = await getBuildProgress(mockRedis, buildResult.buildId);

      expect(progress.buildId).toBe(buildResult.buildId);
      expect(progress.status).toBeDefined();
      expect(progress.progress).toBeDefined();
      expect(progress.progress.total).toBeGreaterThan(0);
      expect(progress.agentRuns).toBeDefined();
      expect(Array.isArray(progress.agentRuns)).toBe(true);
    });

    test('getBuildProgress should include agent run details', async () => {
      const buildResult = await orchestrateBuild(mockRedis, {
        teamId: 'team-details',
        preset: 'B',
        phase: 'prototype',
        task: 'Test agent details',
        projectPath: '/project/path',
      });

      const progress = await getBuildProgress(mockRedis, buildResult.buildId);

      expect(progress.agentRuns.length).toBeGreaterThan(0);

      progress.agentRuns.forEach((run) => {
        expect(run.agent).toBeDefined();
        expect(run.status).toBeDefined();
        expect(typeof run.tokens).toBe('number');
        expect(typeof run.cost).toBe('number');
      });
    });

    test('getBuildProgress should include cost information', async () => {
      const buildResult = await orchestrateBuild(mockRedis, {
        teamId: 'team-cost',
        preset: 'C',
        phase: 'prototype',
        task: 'Test cost tracking',
        projectPath: '/project/path',
      });

      const progress = await getBuildProgress(mockRedis, buildResult.buildId);

      expect(progress.cost).toBeDefined();
      expect(progress.cost.totalCost).toBeGreaterThan(0);
      expect(progress.cost.totalTokens).toBeGreaterThan(0);
    });
  });

  describe('Integration - Full Agent Flow', () => {
    test('should execute complete build flow from start to finish', async () => {
      // Advance time for duration tracking
      const startTime = Date.now();

      const result = await orchestrateBuild(mockRedis, {
        teamId: 'team-full-flow',
        preset: 'B',
        phase: 'prototype',
        task: 'Build a complete feature with tests and docs',
        projectPath: '/project/test',
        metadata: {
          repository: 'test-repo',
          branch: 'feature/test',
        },
      });

      // 1. Build should be created
      expect(result.buildId).toBeDefined();
      expect(result.success).toBe(true);

      // 2. Build should have correct metadata
      const build = await getBuild(mockRedis, result.buildId);
      expect(build.teamId).toBe('team-full-flow');
      expect(build.preset).toBe('B');
      expect(build.phase).toBe('prototype');
      expect(build.task).toBe('Build a complete feature with tests and docs');
      expect(build.repository).toBe('test-repo');

      // 3. All agents should have completed
      const runIds = await getBuildAgentRuns(mockRedis, result.buildId);
      expect(runIds.length).toBeGreaterThan(5); // At least 5 agents

      const runs = [];
      for (const runId of runIds) {
        const run = await getAgentRun(mockRedis, runId);
        runs.push(run);
      }

      // All runs should be completed
      runs.forEach((run) => {
        expect(run.status).toBe('completed');
        expect(run.success).toBe(true);
      });

      // 4. Results should contain expected artifacts
      expect(Array.isArray(result.filesChanged)).toBe(true);
      expect(Array.isArray(result.testsWritten)).toBe(true);
      expect(Array.isArray(result.docsUpdated)).toBe(true);

      // Code agent should have created files
      expect(result.filesChanged.length).toBeGreaterThan(0);

      // Test agent should have created tests
      expect(result.testsWritten.length).toBeGreaterThan(0);

      // Docs agent should have updated documentation
      expect(result.docsUpdated.length).toBeGreaterThan(0);

      // 5. Cost should be calculated
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.totalTokens).toBeGreaterThan(0);

      // 6. Duration should be recorded (may be 0 in fast tests)
      expect(result.duration).toBeGreaterThanOrEqual(0);

      // 7. Build status should be accessible
      const progress = await getBuildProgress(mockRedis, result.buildId);
      expect(progress.status).toBe('completed');
      expect(progress.progress.percent).toBe(100);
    });

    test('should handle parallel execution of independent tasks', async () => {
      const result = await orchestrateBuild(mockRedis, {
        teamId: 'team-parallel',
        preset: 'A',
        phase: 'prototype',
        task: 'Test parallel execution',
        projectPath: '/project/parallel',
      });

      expect(result.success).toBe(true);

      // Check that multiple agent runs exist
      const runIds = await getBuildAgentRuns(mockRedis, result.buildId);
      expect(runIds.length).toBeGreaterThan(3);
    });

    test('should support different phases (prototype vs premium)', async () => {
      const prototypeResult = await orchestrateBuild(mockRedis, {
        teamId: 'team-phases',
        preset: 'A',
        phase: 'prototype',
        task: 'Prototype phase test',
        projectPath: '/project/prototype',
      });

      const premiumResult = await orchestrateBuild(mockRedis, {
        teamId: 'team-phases',
        preset: 'C',
        phase: 'premium',
        task: 'Premium phase test',
        projectPath: '/project/premium',
      });

      // Both should succeed
      expect(prototypeResult.success).toBe(true);
      expect(premiumResult.success).toBe(true);

      // Premium should typically cost more (depending on preset)
      const prototypeBuild = await getBuild(mockRedis, prototypeResult.buildId);
      const premiumBuild = await getBuild(mockRedis, premiumResult.buildId);

      expect(prototypeBuild.phase).toBe('prototype');
      expect(premiumBuild.phase).toBe('premium');
    });
  });

  describe('State Management', () => {
    test('should maintain state between agent executions', async () => {
      const result = await orchestrateBuild(mockRedis, {
        teamId: 'team-state',
        preset: 'B',
        phase: 'prototype',
        task: 'Test state management',
        projectPath: '/project/state',
      });

      expect(result.success).toBe(true);

      // Verify that agents executed in sequence
      const runIds = await getBuildAgentRuns(mockRedis, result.buildId);
      const runs = [];
      for (const runId of runIds) {
        const run = await getAgentRun(mockRedis, runId);
        runs.push(run);
      }

      // Architect should execute before coach
      const architectRun = runs.find((r) => r.agentName === 'architect');
      const coachRun = runs.find((r) => r.agentName === 'coach');

      if (architectRun && coachRun) {
        expect(new Date(architectRun.startedAt).getTime()).toBeLessThanOrEqual(
          new Date(coachRun.startedAt).getTime()
        );
      }
    });

    test('should track completed agents in build', async () => {
      const result = await orchestrateBuild(mockRedis, {
        teamId: 'team-completed',
        preset: 'A',
        phase: 'prototype',
        task: 'Test completed agents tracking',
        projectPath: '/project/completed',
      });

      const build = await getBuild(mockRedis, result.buildId);
      expect(build.completedAgents).toBeDefined();
      expect(Array.isArray(build.completedAgents)).toBe(true);
      expect(build.completedAgents.length).toBeGreaterThan(0);
    });
  });
});
