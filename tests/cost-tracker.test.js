const Redis = require('ioredis');

// Mock Redis before requiring modules
jest.mock('ioredis');

const {
  calculateModelCost,
  calculateAgentCost,
  calculateBuildCost,
  checkBudget,
  getBuildBudgetStatus,
  estimatePresetCost,
  comparePresetCosts,
  generateBuildCostReport,
} = require('../src/utils/cost-tracker');

const { createBuild, createAgentRun, updateAgentRun } = require('../src/database/redis-schema');

describe('Cost Tracker', () => {
  let mockRedis;

  beforeEach(() => {
    jest.clearAllMocks();
    Redis.mockStore.clear();
    mockRedis = new Redis();
  });

  describe('Model Cost Calculation', () => {
    test('calculateModelCost should calculate cost for deepseek-v3.2', () => {
      const cost = calculateModelCost('deepseek-v3.2', 1000000, 500000);

      expect(cost.modelId).toBe('deepseek-v3.2');
      expect(cost.inputTokens).toBe(1000000);
      expect(cost.outputTokens).toBe(500000);
      expect(cost.totalTokens).toBe(1500000);

      // deepseek-v3.2: input $0.27/M, output $1.10/M
      expect(cost.inputCost).toBeCloseTo(0.27, 2);
      expect(cost.outputCost).toBeCloseTo(0.55, 2);
      expect(cost.totalCost).toBeCloseTo(0.82, 2);
      expect(cost.currency).toBe('USD');
    });

    test('calculateModelCost should calculate cost for claude-sonnet-4', () => {
      const cost = calculateModelCost('claude-sonnet-4', 1000000, 1000000);

      // claude-sonnet-4: input $3.00/M, output $15.00/M
      expect(cost.inputCost).toBeCloseTo(3.0, 2);
      expect(cost.outputCost).toBeCloseTo(15.0, 2);
      expect(cost.totalCost).toBeCloseTo(18.0, 2);
    });

    test('calculateModelCost should throw for non-existent model', () => {
      expect(() => calculateModelCost('nonexistent-model', 1000, 1000)).toThrow(
        'Model "nonexistent-model" not found'
      );
    });

    test('calculateModelCost should handle zero tokens', () => {
      const cost = calculateModelCost('deepseek-v3.2', 0, 0);

      expect(cost.inputCost).toBe(0);
      expect(cost.outputCost).toBe(0);
      expect(cost.totalCost).toBe(0);
    });
  });

  describe('Agent Cost Calculation', () => {
    test('calculateAgentCost should calculate cost from agent run', () => {
      const agentRun = {
        model: 'deepseek-v3.2',
        inputTokens: 5000,
        outputTokens: 3000,
      };

      const cost = calculateAgentCost(agentRun);

      expect(cost.totalCost).toBeGreaterThan(0);
      expect(cost.inputTokens).toBe(5000);
      expect(cost.outputTokens).toBe(3000);
    });
  });

  describe('Build Cost Calculation', () => {
    test('calculateBuildCost should sum costs from all agent runs', async () => {
      // Create build
      await createBuild(mockRedis, {
        id: 'build-123',
        teamId: 'team-456',
        preset: 'A',
        phase: 'prototype',
      });

      // Create agent runs
      const agents = [
        { name: 'supervisor', inputTokens: 10000, outputTokens: 5000 },
        { name: 'architect', inputTokens: 15000, outputTokens: 8000 },
        { name: 'code', inputTokens: 20000, outputTokens: 12000 },
      ];

      for (const agent of agents) {
        const runId = `run-${agent.name}`;
        await createAgentRun(mockRedis, {
          id: runId,
          buildId: 'build-123',
          teamId: 'team-456',
          agentName: agent.name,
          model: 'deepseek-v3.2',
        });

        await updateAgentRun(mockRedis, runId, {
          status: 'completed',
          inputTokens: agent.inputTokens,
          outputTokens: agent.outputTokens,
          totalTokens: agent.inputTokens + agent.outputTokens,
          success: true,
        });
      }

      // Calculate build cost
      const buildCost = await calculateBuildCost(mockRedis, 'build-123');

      expect(buildCost.buildId).toBe('build-123');
      expect(buildCost.agentCount).toBe(3);
      expect(buildCost.totalInputTokens).toBe(45000);
      expect(buildCost.totalOutputTokens).toBe(25000);
      expect(buildCost.totalTokens).toBe(70000);
      expect(buildCost.totalCost).toBeGreaterThan(0);
      expect(buildCost.agentCosts).toHaveLength(3);
    });

    test('calculateBuildCost should handle build with no agent runs', async () => {
      await createBuild(mockRedis, {
        id: 'build-empty',
        teamId: 'team-456',
        preset: 'A',
        phase: 'prototype',
      });

      const buildCost = await calculateBuildCost(mockRedis, 'build-empty');

      expect(buildCost.agentCount).toBe(0);
      expect(buildCost.totalCost).toBe(0);
      expect(buildCost.agentCosts).toHaveLength(0);
    });

    test('calculateBuildCost should throw for non-existent build', async () => {
      await expect(calculateBuildCost(mockRedis, 'nonexistent')).rejects.toThrow(
        'Build "nonexistent" not found'
      );
    });
  });

  describe('Budget Monitoring', () => {
    test('checkBudget should return ok status when under budget', () => {
      const buildCost = {
        totalCost: 5.0,
        totalTokens: 100000,
      };

      const status = checkBudget(buildCost, 10.0);

      expect(status.status).toBe('ok');
      expect(status.utilizationPercent).toBe(50);
      expect(status.spent).toBe(5.0);
      expect(status.limit).toBe(10.0);
      expect(status.remaining).toBe(5.0);
      expect(status.alert).toBeNull();
    });

    test('checkBudget should return warning at 75%', () => {
      const buildCost = {
        totalCost: 7.5,
      };

      const status = checkBudget(buildCost, 10.0);

      expect(status.status).toBe('warning');
      expect(status.utilizationPercent).toBe(75);
      expect(status.alert).toBeDefined();
      expect(status.alert.level).toBe('info');
    });

    test('checkBudget should return critical at 90%', () => {
      const buildCost = {
        totalCost: 9.0,
      };

      const status = checkBudget(buildCost, 10.0);

      expect(status.status).toBe('critical');
      expect(status.utilizationPercent).toBe(90);
      expect(status.alert).toBeDefined();
      expect(status.alert.level).toBe('warning');
    });

    test('checkBudget should return exceeded at 100%', () => {
      const buildCost = {
        totalCost: 12.0,
      };

      const status = checkBudget(buildCost, 10.0);

      expect(status.status).toBe('exceeded');
      expect(status.utilizationPercent).toBe(120);
      expect(status.alert).toBeDefined();
      expect(status.alert.level).toBe('critical');
      expect(status.remaining).toBeLessThan(0);
    });

    test('getBuildBudgetStatus should integrate build cost and budget check', async () => {
      // Create build with agent runs
      await createBuild(mockRedis, {
        id: 'build-budget',
        teamId: 'team-456',
        preset: 'A',
        phase: 'prototype',
      });

      await createAgentRun(mockRedis, {
        id: 'run-1',
        buildId: 'build-budget',
        teamId: 'team-456',
        agentName: 'supervisor',
        model: 'deepseek-v3.2',
      });

      await updateAgentRun(mockRedis, 'run-1', {
        inputTokens: 10000,
        outputTokens: 5000,
      });

      const status = await getBuildBudgetStatus(mockRedis, 'build-budget', 10.0);

      expect(status.status).toBeDefined();
      expect(status.spent).toBeGreaterThan(0);
      expect(status.limit).toBe(10.0);
    });
  });

  describe('Preset Cost Estimation', () => {
    test('estimatePresetCost should return preset estimated cost', () => {
      const estimate = estimatePresetCost('A');

      expect(estimate.presetId).toBe('A');
      expect(estimate.presetName).toBe('Budget');
      expect(estimate.estimatedCost).toBe(8);
      expect(estimate.source).toBe('preset_configuration');
      expect(estimate.currency).toBe('USD');
    });

    test('estimatePresetCost should calculate from tokens if provided', () => {
      const estimate = estimatePresetCost('A', 100000);

      expect(estimate.presetId).toBe('A');
      expect(estimate.estimatedCost).toBeGreaterThan(0);
      expect(estimate.estimatedTokens).toBe(100000);
      expect(estimate.source).toBe('calculated');
    });

    test('comparePresetCosts should sort presets by cost', () => {
      const comparison = comparePresetCosts(['C', 'A', 'B']);

      expect(comparison).toHaveLength(3);
      // Should be sorted by cost: A < B < C
      expect(comparison[0].presetId).toBe('A');
      expect(comparison[1].presetId).toBe('B');
      expect(comparison[2].presetId).toBe('C');
      expect(comparison[0].estimatedCost).toBeLessThan(comparison[1].estimatedCost);
      expect(comparison[1].estimatedCost).toBeLessThan(comparison[2].estimatedCost);
    });
  });

  describe('Cost Reporting', () => {
    test('generateBuildCostReport should create detailed report', async () => {
      // Create build with multiple agent runs
      await createBuild(mockRedis, {
        id: 'build-report',
        teamId: 'team-456',
        preset: 'A',
        phase: 'prototype',
        status: 'completed',
      });

      const agents = [
        { name: 'supervisor', input: 5000, output: 3000 },
        { name: 'architect', input: 10000, output: 7000 },
        { name: 'code', input: 15000, output: 10000 },
      ];

      for (const agent of agents) {
        const runId = `run-${agent.name}`;
        await createAgentRun(mockRedis, {
          id: runId,
          buildId: 'build-report',
          teamId: 'team-456',
          agentName: agent.name,
          model: 'deepseek-v3.2',
        });

        await updateAgentRun(mockRedis, runId, {
          inputTokens: agent.input,
          outputTokens: agent.output,
          duration: 5000,
        });
      }

      const report = await generateBuildCostReport(mockRedis, 'build-report');

      expect(report.build).toBeDefined();
      expect(report.build.id).toBe('build-report');

      expect(report.summary).toBeDefined();
      expect(report.summary.totalCost).toBeGreaterThan(0);
      expect(report.summary.agentCount).toBe(3);
      expect(report.summary.avgCostPerAgent).toBeGreaterThan(0);

      expect(report.agents).toHaveLength(3);
      // Agents should be sorted by cost (descending)
      expect(report.agents[0].cost).toBeGreaterThanOrEqual(report.agents[1].cost);
      expect(report.agents[1].cost).toBeGreaterThanOrEqual(report.agents[2].cost);

      // Each agent should have cost percent
      report.agents.forEach((agent) => {
        expect(agent.costPercent).toBeDefined();
        expect(agent.costPercent).toBeGreaterThan(0);
        expect(agent.costPercent).toBeLessThanOrEqual(100);
      });

      expect(report.insights).toBeDefined();
      expect(report.insights.mostExpensiveAgent).toBeDefined();
      expect(report.insights.avgTokensPerAgent).toBeGreaterThan(0);
    });

    test('generateBuildCostReport should handle build with no agents', async () => {
      await createBuild(mockRedis, {
        id: 'build-no-agents',
        teamId: 'team-456',
        preset: 'A',
        phase: 'prototype',
      });

      const report = await generateBuildCostReport(mockRedis, 'build-no-agents');

      expect(report.summary.agentCount).toBe(0);
      expect(report.summary.totalCost).toBe(0);
      expect(report.agents).toHaveLength(0);
      expect(report.insights.mostExpensiveAgent).toBeNull();
    });
  });
});
