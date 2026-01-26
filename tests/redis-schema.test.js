const Redis = require('ioredis');

// Mock Redis before requiring the schema
jest.mock('ioredis');

const {
  PREFIXES,
  getTeamKey,
  getBuildKey,
  getAgentRunKey,
  getUserTeamsKey,
  getRepoTeamsKey,
  getStatusTeamsKey,
  getTeamBuildsKey,
  getBuildAgentsKey,
  addTeamToIndexes,
  removeTeamFromIndexes,
  updateTeamStatusIndex,
  createBuild,
  getBuild,
  updateBuild,
  addBuildToTeam,
  getTeamBuilds,
  createAgentRun,
  getAgentRun,
  updateAgentRun,
  addAgentRunToBuild,
  getBuildAgentRuns,
} = require('../src/database/redis-schema');

describe('Redis Schema', () => {
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    Redis.mockStore.clear();

    // Create mock Redis client
    mockRedis = new Redis();
  });

  describe('Key Generators', () => {
    test('getTeamKey should generate correct team key', () => {
      expect(getTeamKey('team-123')).toBe('team:team-123');
    });

    test('getBuildKey should generate correct build key', () => {
      expect(getBuildKey('build-456')).toBe('build:build-456');
    });

    test('getAgentRunKey should generate correct agent run key', () => {
      expect(getAgentRunKey('run-789')).toBe('agent_run:run-789');
    });

    test('getUserTeamsKey should generate correct user teams key', () => {
      expect(getUserTeamsKey('user-123')).toBe('user:teams:user-123');
    });

    test('getRepoTeamsKey should normalize and generate correct repo key', () => {
      expect(getRepoTeamsKey('github.com/owner/repo')).toBe('teams:by_repo:github.com/owner/repo');
      expect(getRepoTeamsKey('https://github.com/owner/repo')).toBe('teams:by_repo:github.com/owner/repo');
      expect(getRepoTeamsKey('github.com/owner/repo.git')).toBe('teams:by_repo:github.com/owner/repo');
    });

    test('getStatusTeamsKey should generate correct status key', () => {
      expect(getStatusTeamsKey('pending')).toBe('teams:by_status:pending');
    });

    test('getTeamBuildsKey should generate correct team builds key', () => {
      expect(getTeamBuildsKey('team-123')).toBe('team:builds:team-123');
    });

    test('getBuildAgentsKey should generate correct build agents key', () => {
      expect(getBuildAgentsKey('build-456')).toBe('build:agents:build-456');
    });
  });

  describe('Team Index Management', () => {
    test('addTeamToIndexes should add team to all indexes', async () => {
      const team = {
        id: 'team-123',
        ownerId: 'user-456',
        repo: 'github.com/test/repo',
        status: 'pending',
      };

      await addTeamToIndexes(mockRedis, team);

      // Verify team added to main index
      const mainIndex = await mockRedis.smembers(PREFIXES.TEAMS_INDEX);
      expect(mainIndex).toContain('team-123');

      // Verify team added to user index
      const userIndex = await mockRedis.smembers(getUserTeamsKey('user-456'));
      expect(userIndex).toContain('team-123');

      // Verify team added to repo index
      const repoIndex = await mockRedis.smembers(getRepoTeamsKey('github.com/test/repo'));
      expect(repoIndex).toContain('team-123');

      // Verify team added to status index
      const statusIndex = await mockRedis.smembers(getStatusTeamsKey('pending'));
      expect(statusIndex).toContain('team-123');
    });

    test('addTeamToIndexes should handle teams without ownerId', async () => {
      const team = {
        id: 'team-123',
        repo: 'github.com/test/repo',
        status: 'pending',
      };

      await addTeamToIndexes(mockRedis, team);

      // Should not create user index
      const userIndex = await mockRedis.smembers(getUserTeamsKey('undefined'));
      expect(userIndex).toHaveLength(0);

      // Should still add to main index
      const mainIndex = await mockRedis.smembers(PREFIXES.TEAMS_INDEX);
      expect(mainIndex).toContain('team-123');
    });

    test('removeTeamFromIndexes should remove team from all indexes', async () => {
      const team = {
        id: 'team-123',
        ownerId: 'user-456',
        repo: 'github.com/test/repo',
        status: 'pending',
      };

      // Add first
      await addTeamToIndexes(mockRedis, team);

      // Then remove
      await removeTeamFromIndexes(mockRedis, team);

      // Verify removed from all indexes
      expect(await mockRedis.smembers(PREFIXES.TEAMS_INDEX)).not.toContain('team-123');
      expect(await mockRedis.smembers(getUserTeamsKey('user-456'))).not.toContain('team-123');
      expect(await mockRedis.smembers(getRepoTeamsKey('github.com/test/repo'))).not.toContain(
        'team-123'
      );
      expect(await mockRedis.smembers(getStatusTeamsKey('pending'))).not.toContain('team-123');
    });

    test('updateTeamStatusIndex should update status index', async () => {
      const teamId = 'team-123';

      // Add to pending
      await mockRedis.sadd(getStatusTeamsKey('pending'), teamId);

      // Update to approved
      await updateTeamStatusIndex(mockRedis, teamId, 'pending', 'approved');

      // Verify removed from pending
      const pendingIndex = await mockRedis.smembers(getStatusTeamsKey('pending'));
      expect(pendingIndex).not.toContain(teamId);

      // Verify added to approved
      const approvedIndex = await mockRedis.smembers(getStatusTeamsKey('approved'));
      expect(approvedIndex).toContain(teamId);
    });
  });

  describe('Build Operations', () => {
    test('createBuild should create build record', async () => {
      const buildData = {
        id: 'build-123',
        teamId: 'team-456',
        preset: 'IQ',
        phase: 'prototype',
      };

      const build = await createBuild(mockRedis, buildData);

      expect(build.id).toBe('build-123');
      expect(build.status).toBe('pending');
      expect(build.totalCost).toBe(0);
      expect(build.completedAgents).toBe('[]');

      // Verify stored in Redis
      const stored = await getBuild(mockRedis, 'build-123');
      expect(stored).toBeTruthy();
      expect(stored.teamId).toBe('team-456');
    });

    test('getBuild should return null for non-existent build', async () => {
      const build = await getBuild(mockRedis, 'nonexistent');
      expect(build).toBeNull();
    });

    test('getBuild should parse JSON fields correctly', async () => {
      const buildData = {
        id: 'build-123',
        teamId: 'team-456',
        preset: 'IQ',
        phase: 'prototype',
        completedAgents: ['supervisor', 'architect'],
        totalCost: 5.25,
        totalTokens: 10000,
      };

      await createBuild(mockRedis, buildData);
      const build = await getBuild(mockRedis, 'build-123');

      expect(build.completedAgents).toEqual(['supervisor', 'architect']);
      expect(build.totalCost).toBe(5.25);
      expect(build.totalTokens).toBe(10000);
    });

    test('updateBuild should update build fields', async () => {
      await createBuild(mockRedis, {
        id: 'build-123',
        teamId: 'team-456',
        preset: 'IQ',
        phase: 'prototype',
      });

      await updateBuild(mockRedis, 'build-123', {
        status: 'running',
        currentAgent: 'architect',
        totalCost: 2.5,
      });

      const build = await getBuild(mockRedis, 'build-123');
      expect(build.status).toBe('running');
      expect(build.currentAgent).toBe('architect');
      expect(build.totalCost).toBe(2.5);
    });

    test('updateBuild should auto-set completedAt when status is completed', async () => {
      await createBuild(mockRedis, {
        id: 'build-123',
        teamId: 'team-456',
        preset: 'IQ',
        phase: 'prototype',
      });

      await updateBuild(mockRedis, 'build-123', {
        status: 'completed',
      });

      const build = await getBuild(mockRedis, 'build-123');
      expect(build.completedAt).toBeDefined();
      expect(new Date(build.completedAt)).toBeInstanceOf(Date);
    });

    test('addBuildToTeam should add build to team sorted set', async () => {
      await addBuildToTeam(mockRedis, 'team-123', 'build-1', 1000);
      await addBuildToTeam(mockRedis, 'team-123', 'build-2', 2000);
      await addBuildToTeam(mockRedis, 'team-123', 'build-3', 3000);

      const builds = await getTeamBuilds(mockRedis, 'team-123');
      expect(builds).toEqual(['build-3', 'build-2', 'build-1']); // Newest first
    });

    test('getTeamBuilds should limit results', async () => {
      for (let i = 1; i <= 20; i++) {
        await addBuildToTeam(mockRedis, 'team-123', `build-${i}`, i * 1000);
      }

      const builds = await getTeamBuilds(mockRedis, 'team-123', 5);
      expect(builds).toHaveLength(5);
      expect(builds[0]).toBe('build-20'); // Newest
    });
  });

  describe('Agent Run Operations', () => {
    test('createAgentRun should create agent run record', async () => {
      const agentRunData = {
        id: 'run-123',
        buildId: 'build-456',
        teamId: 'team-789',
        agentName: 'supervisor',
        model: 'claude-sonnet-4-5',
      };

      const agentRun = await createAgentRun(mockRedis, agentRunData);

      expect(agentRun.id).toBe('run-123');
      expect(agentRun.status).toBe('pending');
      expect(agentRun.cost).toBe(0);

      // Verify stored in Redis
      const stored = await getAgentRun(mockRedis, 'run-123');
      expect(stored).toBeTruthy();
      expect(stored.agentName).toBe('supervisor');
    });

    test('getAgentRun should return null for non-existent run', async () => {
      const run = await getAgentRun(mockRedis, 'nonexistent');
      expect(run).toBeNull();
    });

    test('getAgentRun should parse JSON and numeric fields correctly', async () => {
      const agentRunData = {
        id: 'run-123',
        buildId: 'build-456',
        teamId: 'team-789',
        agentName: 'architect',
        model: 'claude-sonnet-4-5',
        inputTokens: 5000,
        outputTokens: 3000,
        totalTokens: 8000,
        cost: 0.85,
        output: { files: ['src/main.js', 'src/utils.js'] },
      };

      await createAgentRun(mockRedis, agentRunData);
      const run = await getAgentRun(mockRedis, 'run-123');

      expect(run.inputTokens).toBe(5000);
      expect(run.outputTokens).toBe(3000);
      expect(run.totalTokens).toBe(8000);
      expect(run.cost).toBe(0.85);
      expect(run.output).toEqual({ files: ['src/main.js', 'src/utils.js'] });
    });

    test('updateAgentRun should update run fields', async () => {
      await createAgentRun(mockRedis, {
        id: 'run-123',
        buildId: 'build-456',
        teamId: 'team-789',
        agentName: 'coach',
        model: 'claude-sonnet-4-5',
      });

      await updateAgentRun(mockRedis, 'run-123', {
        status: 'completed',
        inputTokens: 2000,
        outputTokens: 1500,
        cost: 0.42,
        success: true,
      });

      const run = await getAgentRun(mockRedis, 'run-123');
      expect(run.status).toBe('completed');
      expect(run.inputTokens).toBe(2000);
      expect(run.cost).toBe(0.42);
      expect(run.success).toBe(true);
    });

    test('updateAgentRun should auto-set completedAt when status is completed', async () => {
      await createAgentRun(mockRedis, {
        id: 'run-123',
        buildId: 'build-456',
        teamId: 'team-789',
        agentName: 'code',
        model: 'claude-sonnet-4-5',
      });

      await updateAgentRun(mockRedis, 'run-123', {
        status: 'completed',
      });

      const run = await getAgentRun(mockRedis, 'run-123');
      expect(run.completedAt).toBeDefined();
      expect(new Date(run.completedAt)).toBeInstanceOf(Date);
    });

    test('addAgentRunToBuild should add run to build list', async () => {
      await addAgentRunToBuild(mockRedis, 'build-123', 'run-1');
      await addAgentRunToBuild(mockRedis, 'build-123', 'run-2');
      await addAgentRunToBuild(mockRedis, 'build-123', 'run-3');

      const runs = await getBuildAgentRuns(mockRedis, 'build-123');
      expect(runs).toEqual(['run-1', 'run-2', 'run-3']); // Execution order
    });

    test('getBuildAgentRuns should return empty array for new build', async () => {
      const runs = await getBuildAgentRuns(mockRedis, 'nonexistent');
      expect(runs).toEqual([]);
    });
  });

  describe('Integration - Complete Build Flow', () => {
    test('should track complete build with agent runs', async () => {
      // Create build
      const build = await createBuild(mockRedis, {
        id: 'build-123',
        teamId: 'team-456',
        preset: 'IQ',
        phase: 'prototype',
      });

      expect(build.status).toBe('pending');

      // Start build
      await updateBuild(mockRedis, 'build-123', {
        status: 'running',
      });

      // Add agent runs
      const agents = ['supervisor', 'architect', 'coach', 'code'];
      for (const agent of agents) {
        const runId = `run-${agent}`;
        await createAgentRun(mockRedis, {
          id: runId,
          buildId: 'build-123',
          teamId: 'team-456',
          agentName: agent,
          model: 'claude-sonnet-4-5',
        });

        // Complete agent run
        await updateAgentRun(mockRedis, runId, {
          status: 'completed',
          inputTokens: 1000,
          outputTokens: 800,
          totalTokens: 1800,
          cost: 0.5,
          success: true,
        });
      }

      // Complete build
      await updateBuild(mockRedis, 'build-123', {
        status: 'completed',
        completedAgents: agents,
        totalCost: 2.0,
        totalTokens: 7200,
        success: true,
      });

      // Verify build
      const completedBuild = await getBuild(mockRedis, 'build-123');
      expect(completedBuild.status).toBe('completed');
      expect(completedBuild.totalCost).toBe(2.0);
      expect(completedBuild.completedAgents).toEqual(agents);

      // Verify agent runs
      const agentRuns = await getBuildAgentRuns(mockRedis, 'build-123');
      expect(agentRuns).toHaveLength(4);

      // Verify first agent
      const supervisorRun = await getAgentRun(mockRedis, 'run-supervisor');
      expect(supervisorRun.agentName).toBe('supervisor');
      expect(supervisorRun.status).toBe('completed');
      expect(supervisorRun.cost).toBe(0.5);
    });
  });

  describe('PREFIXES constant', () => {
    test('should have all required prefixes defined', () => {
      expect(PREFIXES.TEAM).toBe('team:');
      expect(PREFIXES.BUILD).toBe('build:');
      expect(PREFIXES.AGENT_RUN).toBe('agent_run:');
      expect(PREFIXES.TEAMS_INDEX).toBe('teams:index');
      expect(PREFIXES.USER_TEAMS).toBe('user:teams:');
      expect(PREFIXES.REPO_TEAMS).toBe('teams:by_repo:');
      expect(PREFIXES.STATUS_TEAMS).toBe('teams:by_status:');
      expect(PREFIXES.TEAM_BUILDS).toBe('team:builds:');
      expect(PREFIXES.BUILD_AGENTS).toBe('build:agents:');
    });
  });
});
