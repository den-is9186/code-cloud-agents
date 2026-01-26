const Redis = require('ioredis');

// Mock Redis before requiring modules
jest.mock('ioredis');

const {
  startBuild,
  markBuildRunning,
  completeBuild,
  failBuild,
  startAgentRun,
  completeAgentRun,
  failAgentRun,
  getBuildStatus,
  getTeamBuildHistory,
  getLatestTeamBuild,
  getBuildStatistics,
} = require('../src/services/build-tracker');

const { getBuild, getAgentRun } = require('../src/database/redis-schema');

describe('Build Tracker', () => {
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    Redis.mockStore.clear();
    mockRedis = new Redis();
  });

  describe('Build Lifecycle', () => {
    test('startBuild should create a new build', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      expect(build.id).toBeDefined();
      expect(build.teamId).toBe('team-123');
      expect(build.preset).toBe('A');
      expect(build.phase).toBe('prototype');
      expect(build.status).toBe('pending');
      expect(build.completedAgents).toEqual([]);
    });

    test('startBuild should accept metadata', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'B',
        phase: 'premium',
        metadata: {
          task: 'Test task',
          ownerId: 'user-456',
        },
      });

      expect(build.task).toBe('Test task');
      expect(build.ownerId).toBe('user-456');
    });

    test('markBuildRunning should update build status', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      await markBuildRunning(mockRedis, build.id, 'supervisor');

      const updated = await getBuild(mockRedis, build.id);
      expect(updated.status).toBe('running');
      expect(updated.currentAgent).toBe('supervisor');
      expect(updated.startedAt).toBeDefined();
    });

    test('completeBuild should mark build as completed and calculate cost', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      await markBuildRunning(mockRedis, build.id);

      // Add agent run with costs
      const run = await startAgentRun(mockRedis, {
        buildId: build.id,
        teamId: 'team-123',
        agentName: 'supervisor',
        model: 'deepseek-v3.2',
      });

      await completeAgentRun(mockRedis, run.id, {
        success: true,
        inputTokens: 10000,
        outputTokens: 5000,
      });

      const result = await completeBuild(mockRedis, build.id);

      expect(result.build.status).toBe('completed');
      expect(result.build.success).toBe(true);
      expect(result.build.completedAt).toBeDefined();
      expect(result.build.duration).toBeGreaterThan(0);
      expect(result.cost).toBeDefined();
      expect(result.cost.totalCost).toBeGreaterThan(0);
    });

    test('completeBuild should handle builds with no agent runs', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      await markBuildRunning(mockRedis, build.id);

      const result = await completeBuild(mockRedis, build.id);

      expect(result.build.status).toBe('completed');
      expect(result.cost.totalCost).toBe(0);
    });

    test('failBuild should mark build as failed', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      await markBuildRunning(mockRedis, build.id);

      const result = await failBuild(mockRedis, build.id, 'Agent supervisor failed');

      expect(result.build.status).toBe('completed');
      expect(result.build.success).toBe(false);
      expect(result.build.errorMessage).toBe('Agent supervisor failed');
    });

    test('completeBuild should throw for non-existent build', async () => {
      await expect(completeBuild(mockRedis, 'nonexistent')).rejects.toThrow(
        'Build "nonexistent" not found'
      );
    });
  });

  describe('Agent Run Tracking', () => {
    test('startAgentRun should create agent run and update build', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      const run = await startAgentRun(mockRedis, {
        buildId: build.id,
        teamId: 'team-123',
        agentName: 'supervisor',
        model: 'deepseek-r1-0528',
      });

      expect(run.id).toBeDefined();
      expect(run.buildId).toBe(build.id);
      expect(run.agentName).toBe('supervisor');
      expect(run.model).toBe('deepseek-r1-0528');
      expect(run.status).toBe('running');
      expect(run.startedAt).toBeDefined();

      // Build should be updated
      const updatedBuild = await getBuild(mockRedis, build.id);
      expect(updatedBuild.currentAgent).toBe('supervisor');
    });

    test('startAgentRun should accept metadata', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      const run = await startAgentRun(mockRedis, {
        buildId: build.id,
        teamId: 'team-123',
        agentName: 'architect',
        model: 'claude-sonnet-4',
        modelVersion: '20250514',
        metadata: {
          task: 'Design architecture',
        },
      });

      expect(run.modelVersion).toBe('20250514');
      expect(run.task).toBe('Design architecture');
    });

    test('completeAgentRun should update run with results and calculate cost', async () => {
      // Use fake timers to control time
      jest.useFakeTimers();
      const startTime = new Date('2025-01-01T00:00:00.000Z');
      jest.setSystemTime(startTime);

      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      const run = await startAgentRun(mockRedis, {
        buildId: build.id,
        teamId: 'team-123',
        agentName: 'code',
        model: 'deepseek-v3.2',
      });

      // Simulate 5 seconds passing
      jest.advanceTimersByTime(5000);

      const completed = await completeAgentRun(mockRedis, run.id, {
        success: true,
        inputTokens: 15000,
        outputTokens: 10000,
        output: { files: ['src/index.js', 'src/utils.js'] },
      });

      expect(completed.status).toBe('completed');
      expect(completed.success).toBe(true);
      expect(completed.inputTokens).toBe(15000);
      expect(completed.outputTokens).toBe(10000);
      expect(completed.totalTokens).toBe(25000);
      expect(completed.cost).toBeGreaterThan(0);
      expect(completed.completedAt).toBeDefined();
      expect(completed.duration).toBe(5000);
      expect(completed.output).toEqual({ files: ['src/index.js', 'src/utils.js'] });

      // Build should have agent in completed list
      const updatedBuild = await getBuild(mockRedis, build.id);
      expect(updatedBuild.completedAgents).toContain('code');

      // Restore real timers
      jest.useRealTimers();
    });

    test('completeAgentRun should handle zero tokens', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      const run = await startAgentRun(mockRedis, {
        buildId: build.id,
        teamId: 'team-123',
        agentName: 'supervisor',
        model: 'deepseek-r1-0528',
      });

      const completed = await completeAgentRun(mockRedis, run.id, {
        success: true,
        inputTokens: 0,
        outputTokens: 0,
      });

      expect(completed.cost).toBe(0);
    });

    test('failAgentRun should mark run as failed', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      const run = await startAgentRun(mockRedis, {
        buildId: build.id,
        teamId: 'team-123',
        agentName: 'test',
        model: 'deepseek-v3.2',
      });

      const failed = await failAgentRun(mockRedis, run.id, 'Tests failed');

      expect(failed.status).toBe('completed');
      expect(failed.success).toBe(false);
      expect(failed.errorMessage).toBe('Tests failed');
    });

    test('completeAgentRun should throw for non-existent run', async () => {
      await expect(
        completeAgentRun(mockRedis, 'nonexistent', { success: true })
      ).rejects.toThrow('Agent run "nonexistent" not found');
    });

    test('multiple agent runs should be tracked correctly', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      const agents = ['supervisor', 'architect', 'coach'];

      for (const agentName of agents) {
        const run = await startAgentRun(mockRedis, {
          buildId: build.id,
          teamId: 'team-123',
          agentName,
          model: 'deepseek-v3.2',
        });

        await completeAgentRun(mockRedis, run.id, {
          success: true,
          inputTokens: 5000,
          outputTokens: 3000,
        });
      }

      const updatedBuild = await getBuild(mockRedis, build.id);
      expect(updatedBuild.completedAgents).toEqual(agents);
    });
  });

  describe('Build Queries', () => {
    test('getBuildStatus should return detailed build information', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      await markBuildRunning(mockRedis, build.id);

      // Add some agent runs
      const run1 = await startAgentRun(mockRedis, {
        buildId: build.id,
        teamId: 'team-123',
        agentName: 'supervisor',
        model: 'deepseek-r1-0528',
      });

      await completeAgentRun(mockRedis, run1.id, {
        success: true,
        inputTokens: 5000,
        outputTokens: 3000,
      });

      const run2 = await startAgentRun(mockRedis, {
        buildId: build.id,
        teamId: 'team-123',
        agentName: 'architect',
        model: 'deepseek-r1-0528',
      });

      const status = await getBuildStatus(mockRedis, build.id);

      expect(status.build).toBeDefined();
      expect(status.build.id).toBe(build.id);

      expect(status.agentRuns).toHaveLength(2);
      expect(status.agentRuns[0].agentName).toBe('supervisor');
      expect(status.agentRuns[1].agentName).toBe('architect');

      expect(status.progress).toBeDefined();
      expect(status.progress.total).toBe(2);
      expect(status.progress.completed).toBe(1);
      expect(status.progress.percent).toBe(50);

      expect(status.cost).toBeDefined();
      expect(status.cost.totalCost).toBeGreaterThan(0);
    });

    test('getBuildStatus should handle pending builds', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      const status = await getBuildStatus(mockRedis, build.id);

      expect(status.build.status).toBe('pending');
      expect(status.agentRuns).toHaveLength(0);
      expect(status.progress.percent).toBe(0);
      expect(status.cost).toBeNull();
    });

    test('getBuildStatus should throw for non-existent build', async () => {
      await expect(getBuildStatus(mockRedis, 'nonexistent')).rejects.toThrow(
        'Build "nonexistent" not found'
      );
    });

    test('getTeamBuildHistory should return builds for a team', async () => {
      // Create multiple builds
      const build1 = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      const build2 = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'C',
        phase: 'premium',
      });

      const build3 = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'B',
        phase: 'prototype',
      });

      const history = await getTeamBuildHistory(mockRedis, 'team-123');

      expect(history).toHaveLength(3);
      // Should be newest first
      expect(history[0].id).toBe(build3.id);
      expect(history[1].id).toBe(build2.id);
      expect(history[2].id).toBe(build1.id);
    });

    test('getTeamBuildHistory should respect limit', async () => {
      // Create 5 builds
      for (let i = 0; i < 5; i++) {
        await startBuild(mockRedis, {
          teamId: 'team-123',
          preset: 'A',
          phase: 'prototype',
        });
      }

      const history = await getTeamBuildHistory(mockRedis, 'team-123', 3);

      expect(history).toHaveLength(3);
    });

    test('getTeamBuildHistory should return empty array for team with no builds', async () => {
      const history = await getTeamBuildHistory(mockRedis, 'team-nonexistent');

      expect(history).toEqual([]);
    });

    test('getLatestTeamBuild should return most recent build', async () => {
      const build1 = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      const build2 = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'B',
        phase: 'prototype',
      });

      const latest = await getLatestTeamBuild(mockRedis, 'team-123');

      expect(latest.id).toBe(build2.id);
    });

    test('getLatestTeamBuild should return null for team with no builds', async () => {
      const latest = await getLatestTeamBuild(mockRedis, 'team-nonexistent');

      expect(latest).toBeNull();
    });
  });

  describe('Build Statistics', () => {
    test('getBuildStatistics should calculate comprehensive stats', async () => {
      // Use fake timers to control time
      jest.useFakeTimers();
      const startTime = new Date('2025-01-01T00:00:00.000Z');
      jest.setSystemTime(startTime);

      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      jest.advanceTimersByTime(1000); // Build created, 1s passes

      await markBuildRunning(mockRedis, build.id);

      // Add multiple agent runs with varying stats
      const agents = [
        { name: 'supervisor', input: 5000, output: 3000, duration: 3000 },
        { name: 'architect', input: 10000, output: 7000, duration: 5000 },
        { name: 'code', input: 15000, output: 10000, duration: 7000 },
      ];

      for (const agent of agents) {
        const run = await startAgentRun(mockRedis, {
          buildId: build.id,
          teamId: 'team-123',
          agentName: agent.name,
          model: 'deepseek-v3.2',
        });

        // Simulate agent execution time
        jest.advanceTimersByTime(agent.duration);

        await completeAgentRun(mockRedis, run.id, {
          success: true,
          inputTokens: agent.input,
          outputTokens: agent.output,
        });
      }

      jest.advanceTimersByTime(1000); // 1s before completion

      await completeBuild(mockRedis, build.id);

      const stats = await getBuildStatistics(mockRedis, build.id);

      expect(stats.buildId).toBe(build.id);
      expect(stats.status).toBe('completed');
      expect(stats.duration).toBeGreaterThan(0);

      expect(stats.timing).toBeDefined();
      expect(stats.timing.avgAgentDuration).toBe(5000); // (3000 + 5000 + 7000) / 3
      expect(stats.timing.maxAgentDuration).toBe(7000);
      expect(stats.timing.minAgentDuration).toBe(3000);

      expect(stats.agents).toBeDefined();
      expect(stats.agents.total).toBe(3);
      expect(stats.agents.completed).toBe(3);
      expect(stats.agents.failed).toBe(0);

      expect(stats.tokens).toBeDefined();
      expect(stats.tokens.input).toBe(30000);
      expect(stats.tokens.output).toBe(20000);
      expect(stats.tokens.total).toBe(50000);

      expect(stats.cost).toBeGreaterThan(0);

      // Restore real timers
      jest.useRealTimers();
    });

    test('getBuildStatistics should handle failed agents', async () => {
      const build = await startBuild(mockRedis, {
        teamId: 'team-123',
        preset: 'A',
        phase: 'prototype',
      });

      await markBuildRunning(mockRedis, build.id);

      // One successful, one failed
      const run1 = await startAgentRun(mockRedis, {
        buildId: build.id,
        teamId: 'team-123',
        agentName: 'supervisor',
        model: 'deepseek-v3.2',
      });

      await completeAgentRun(mockRedis, run1.id, {
        success: true,
        inputTokens: 5000,
        outputTokens: 3000,
      });

      const run2 = await startAgentRun(mockRedis, {
        buildId: build.id,
        teamId: 'team-123',
        agentName: 'code',
        model: 'deepseek-v3.2',
      });

      await failAgentRun(mockRedis, run2.id, 'Syntax error');

      const stats = await getBuildStatistics(mockRedis, build.id);

      expect(stats.agents.total).toBe(2);
      expect(stats.agents.completed).toBe(2);
      expect(stats.agents.failed).toBe(1);
    });
  });

  describe('Integration - Complete Build Flow', () => {
    test('should track complete build from start to finish', async () => {
      // 1. Start build
      const build = await startBuild(mockRedis, {
        teamId: 'team-456',
        preset: 'A',
        phase: 'prototype',
      });

      expect(build.status).toBe('pending');

      // 2. Mark as running
      await markBuildRunning(mockRedis, build.id, 'supervisor');

      // 3. Run agents sequentially
      const agentSequence = ['supervisor', 'architect', 'coach', 'code'];

      for (const agentName of agentSequence) {
        const run = await startAgentRun(mockRedis, {
          buildId: build.id,
          teamId: 'team-456',
          agentName,
          model: 'deepseek-v3.2',
        });

        await completeAgentRun(mockRedis, run.id, {
          success: true,
          inputTokens: 10000,
          outputTokens: 5000,
        });
      }

      // 4. Check status mid-build
      const midStatus = await getBuildStatus(mockRedis, build.id);
      expect(midStatus.progress.completed).toBe(4);
      expect(midStatus.progress.total).toBe(4);

      // 5. Complete build
      const result = await completeBuild(mockRedis, build.id);

      expect(result.build.status).toBe('completed');
      expect(result.build.success).toBe(true);
      expect(result.cost.agentCount).toBe(4);
      expect(result.cost.totalCost).toBeGreaterThan(0);

      // 6. Get final statistics
      const stats = await getBuildStatistics(mockRedis, build.id);

      expect(stats.agents.total).toBe(4);
      expect(stats.agents.completed).toBe(4);
      expect(stats.tokens.total).toBe(60000); // 4 agents * 15000 tokens
    });
  });
});
