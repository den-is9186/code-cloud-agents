/**
 * Build Tracker Service
 *
 * Manages build lifecycle: creation, tracking, status updates, and completion.
 * Integrates with Redis schema and cost tracking.
 */

import crypto from 'crypto';
import type { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import {
  createBuild,
  getBuild,
  updateBuild,
  createAgentRun,
  updateAgentRun,
  getTeamBuilds,
  getBuildAgentRuns,
  getAgentRun,
} from '../database/redis-schema.js';
import { calculateBuildCost, calculateAgentCost } from '../utils/cost-tracker.js';

/**
 * Build creation options
 */
export interface BuildOptions {
  teamId: string;
  preset: string;
  phase: string;
  metadata?: Record<string, unknown>;
}

/**
 * Build structure (from Redis)
 */
export interface Build {
  id: string;
  teamId: string;
  preset: string;
  phase: string;
  status: string;
  completedAgents: string[];
  currentAgent?: string | null;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  totalCost?: number;
  totalTokens?: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
  createdAt: string;
  success?: boolean;
  errorMessage?: string | null;
}

/**
 * Build with cost info
 */
export interface BuildWithCost {
  build: Build;
  cost: {
    totalCost: number;
    totalTokens: number;
    totalInputTokens: number;
    totalOutputTokens: number;
  };
}

/**
 * Agent run creation options
 */
export interface AgentRunOptions {
  buildId: string;
  teamId: string;
  agentName: string;
  model: string;
  modelVersion?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Agent run structure (from Redis)
 */
export interface AgentRun {
  id: string;
  buildId: string;
  teamId: string;
  agentName: string;
  model: string;
  modelVersion?: string | null;
  status: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  output?: string | null;
  errorMessage?: string | null;
  success?: boolean;
}

/**
 * Agent run completion options
 */
export interface AgentRunResults {
  success?: boolean;
  inputTokens?: number;
  outputTokens?: number;
  output?: string | null;
  errorMessage?: string | null;
}

/**
 * Build status with details
 */
export interface BuildStatusDetails {
  build: Build;
  agentRuns: AgentRun[];
  progress: {
    percent: number;
    completed: number;
    total: number;
  };
  cost: {
    totalCost: number;
    totalTokens: number;
    totalInputTokens: number;
    totalOutputTokens: number;
  } | null;
}

/**
 * Build statistics
 */
export interface BuildStatistics {
  buildId: string;
  status: string;
  duration?: number;
  timing: {
    avgAgentDuration: number;
    maxAgentDuration: number;
    minAgentDuration: number;
  };
  agents: {
    total: number;
    completed: number;
    failed: number;
  };
  tokens: {
    input: number;
    output: number;
    total: number;
  };
  cost: number;
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Convert RedisBuild to Build type
 * Handles parsing of completedAgents from string to array
 */
import type { RedisBuild } from '../database/redis-schema.js';

function toBuild(redisBuild: RedisBuild): Build {
  const completedAgents =
    typeof redisBuild.completedAgents === 'string'
      ? JSON.parse(redisBuild.completedAgents)
      : redisBuild.completedAgents;

  return {
    ...redisBuild,
    completedAgents,
  } as Build;
}

// Note: toAgentRun helper available if needed
// function toAgentRun(redisRun: RedisAgentRun): AgentRun {
//   return redisRun as AgentRun;
// }

// ===================================================================
// BUILD LIFECYCLE
// ===================================================================

/**
 * Start a new build for a team
 *
 * @param redis - Redis client
 * @param options - Build options
 * @returns Created build
 */
export async function startBuild(redis: Redis, options: BuildOptions): Promise<Build> {
  const { teamId, preset, phase, metadata = {} } = options;
  const buildId = crypto.randomUUID();

  const build = await createBuild(redis, {
    id: buildId,
    teamId,
    preset,
    phase,
    status: 'pending',
    completedAgents: [],
    ...metadata,
  });

  return {
    ...build,
    completedAgents: JSON.parse(build.completedAgents as unknown as string),
  };
}

/**
 * Mark a build as running
 *
 * @param redis - Redis client
 * @param buildId - Build ID
 * @param currentAgent - Current agent name
 */
export async function markBuildRunning(
  redis: Redis,
  buildId: string,
  currentAgent: string | null = null
): Promise<void> {
  await updateBuild(redis, buildId, {
    status: 'running',
    currentAgent,
    startedAt: new Date().toISOString(),
  });
}

/**
 * Mark a build as completed
 *
 * @param redis - Redis client
 * @param buildId - Build ID
 * @param options - Completion options
 * @returns Build with cost info
 */
export async function completeBuild(
  redis: Redis,
  buildId: string,
  options: { success?: boolean; errorMessage?: string | null } = {}
): Promise<BuildWithCost> {
  const { success = true, errorMessage = null } = options;

  const build = await getBuild(redis, buildId);

  if (!build) {
    throw new Error(`Build "${buildId}" not found`);
  }

  const completedAt = new Date().toISOString();
  const startedAt = new Date(build.startedAt!);
  const duration = Date.now() - startedAt.getTime();

  // Calculate final cost
  const buildCost = await calculateBuildCost(redis, buildId);

  await updateBuild(redis, buildId, {
    status: 'completed',
    success,
    errorMessage,
    completedAt,
    duration,
    totalCost: buildCost.totalCost,
    totalTokens: buildCost.totalTokens,
    totalInputTokens: buildCost.totalInputTokens,
    totalOutputTokens: buildCost.totalOutputTokens,
    currentAgent: null,
  });

  const updatedBuild = await getBuild(redis, buildId);

  return {
    build: toBuild(updatedBuild!),
    cost: buildCost,
  };
}

/**
 * Mark a build as failed
 *
 * @param redis - Redis client
 * @param buildId - Build ID
 * @param errorMessage - Error message
 * @returns Updated build with cost
 */
export async function failBuild(
  redis: Redis,
  buildId: string,
  errorMessage: string
): Promise<BuildWithCost> {
  return completeBuild(redis, buildId, {
    success: false,
    errorMessage,
  });
}

// ===================================================================
// AGENT RUN TRACKING
// ===================================================================

/**
 * Start an agent run within a build
 *
 * @param redis - Redis client
 * @param options - Agent run options
 * @returns Created agent run
 */
export async function startAgentRun(redis: Redis, options: AgentRunOptions): Promise<AgentRun> {
  const { buildId, teamId, agentName, model, modelVersion = null, metadata = {} } = options;
  const runId = crypto.randomUUID();

  const agentRun = await createAgentRun(redis, {
    id: runId,
    buildId,
    teamId,
    agentName,
    model,
    modelVersion,
    status: 'running',
    startedAt: new Date().toISOString(),
    ...metadata,
  });

  // Update build's current agent
  await updateBuild(redis, buildId, {
    currentAgent: agentName,
  });

  return agentRun as AgentRun;
}

/**
 * Complete an agent run with results
 *
 * @param redis - Redis client
 * @param runId - Agent run ID
 * @param results - Agent run results
 * @returns Updated agent run
 */
export async function completeAgentRun(
  redis: Redis,
  runId: string,
  results: AgentRunResults
): Promise<AgentRun> {
  const {
    success = true,
    inputTokens = 0,
    outputTokens = 0,
    output = null,
    errorMessage = null,
  } = results;

  const agentRun = await getAgentRun(redis, runId);

  if (!agentRun) {
    throw new Error(`Agent run "${runId}" not found`);
  }

  const completedAt = new Date().toISOString();
  const startedAt = new Date(agentRun.startedAt);
  const duration = Date.now() - startedAt.getTime();

  const totalTokens = inputTokens + outputTokens;

  // Calculate cost
  let cost = 0;
  if (agentRun.model && inputTokens > 0) {
    try {
      const costCalc = calculateAgentCost({
        model: agentRun.model,
        inputTokens,
        outputTokens,
      });
      cost = costCalc.totalCost;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to calculate cost for agent run', {
        runId,
        error: errorMsg,
        model: agentRun.model,
        inputTokens,
        outputTokens,
      });
    }
  }

  await updateAgentRun(redis, runId, {
    status: 'completed',
    success,
    inputTokens,
    outputTokens,
    totalTokens,
    cost,
    output,
    errorMessage,
    completedAt,
    duration,
  });

  // Update build's completed agents list
  const build = await getBuild(redis, agentRun.buildId);
  if (build) {
    const completedAgents = (build.completedAgents as unknown as string[]) || [];
    if (!completedAgents.includes(agentRun.agentName)) {
      completedAgents.push(agentRun.agentName);
      await updateBuild(redis, agentRun.buildId, {
        completedAgents,
      });
    }
  }

  const updatedRun = await getAgentRun(redis, runId);
  return updatedRun as AgentRun;
}

/**
 * Fail an agent run
 *
 * @param redis - Redis client
 * @param runId - Agent run ID
 * @param errorMessage - Error message
 * @returns Updated agent run
 */
export async function failAgentRun(
  redis: Redis,
  runId: string,
  errorMessage: string
): Promise<AgentRun> {
  return completeAgentRun(redis, runId, {
    success: false,
    errorMessage,
  });
}

// ===================================================================
// BUILD QUERIES
// ===================================================================

/**
 * Get build status with detailed information
 *
 * @param redis - Redis client
 * @param buildId - Build ID
 * @returns Build status with details
 */
export async function getBuildStatus(redis: Redis, buildId: string): Promise<BuildStatusDetails> {
  const build = await getBuild(redis, buildId);

  if (!build) {
    throw new Error(`Build "${buildId}" not found`);
  }

  // Get agent runs
  const agentRunIds = await getBuildAgentRuns(redis, buildId);

  const agentRuns: AgentRun[] = [];
  for (const runId of agentRunIds) {
    const run = await getAgentRun(redis, runId);
    if (run) {
      agentRuns.push(run as AgentRun);
    }
  }

  // Calculate progress
  const totalAgents = agentRuns.length;
  const completedAgents = agentRuns.filter((run) => run.status === 'completed').length;
  const progress = totalAgents > 0 ? (completedAgents / totalAgents) * 100 : 0;

  // Get cost if build has started
  let cost: {
    totalCost: number;
    totalTokens: number;
    totalInputTokens: number;
    totalOutputTokens: number;
  } | null = null;

  if (build.status !== 'pending') {
    try {
      cost = await calculateBuildCost(redis, buildId);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to calculate build cost', {
        buildId,
        error: errorMsg,
        buildStatus: build.status,
      });
    }
  }

  return {
    build: {
      ...build,
      completedAgents: (build.completedAgents as unknown as string[]) || [],
    },
    agentRuns,
    progress: {
      percent: Math.round(progress),
      completed: completedAgents,
      total: totalAgents,
    },
    cost,
  };
}

/**
 * Get all builds for a team
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @param limit - Maximum number of builds to return
 * @returns Array of builds
 */
export async function getTeamBuildHistory(
  redis: Redis,
  teamId: string,
  limit: number = 10
): Promise<Build[]> {
  const buildIds = await getTeamBuilds(redis, teamId, limit);

  const builds: Build[] = [];
  for (const buildId of buildIds) {
    const build = await getBuild(redis, buildId);
    if (build) {
      builds.push({
        ...build,
        completedAgents: (build.completedAgents as unknown as string[]) || [],
      });
    }
  }

  return builds;
}

/**
 * Get latest build for a team
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @returns Latest build or null
 */
export async function getLatestTeamBuild(redis: Redis, teamId: string): Promise<Build | null> {
  const builds = await getTeamBuildHistory(redis, teamId, 1);
  return builds.length > 0 ? (builds[0] ?? null) : null;
}

// ===================================================================
// STATISTICS
// ===================================================================

/**
 * Get build statistics
 *
 * @param redis - Redis client
 * @param buildId - Build ID
 * @returns Build statistics
 */
export async function getBuildStatistics(redis: Redis, buildId: string): Promise<BuildStatistics> {
  const status = await getBuildStatus(redis, buildId);
  const { build, agentRuns, cost } = status;

  // Calculate timing stats
  const agentDurations = agentRuns
    .filter((run) => run.duration !== undefined)
    .map((run) => run.duration!);

  const avgDuration =
    agentDurations.length > 0
      ? agentDurations.reduce((sum, d) => sum + d, 0) / agentDurations.length
      : 0;

  const maxDuration = agentDurations.length > 0 ? Math.max(...agentDurations) : 0;
  const minDuration = agentDurations.length > 0 ? Math.min(...agentDurations) : 0;

  // Calculate token stats
  const totalInputTokens = agentRuns.reduce((sum, run) => sum + (run.inputTokens || 0), 0);
  const totalOutputTokens = agentRuns.reduce((sum, run) => sum + (run.outputTokens || 0), 0);

  return {
    buildId: build.id,
    status: build.status,
    duration: build.duration,
    timing: {
      avgAgentDuration: Math.round(avgDuration),
      maxAgentDuration: maxDuration,
      minAgentDuration: minDuration,
    },
    agents: {
      total: agentRuns.length,
      completed: agentRuns.filter((run) => run.status === 'completed').length,
      failed: agentRuns.filter((run) => !run.success && run.status === 'completed').length,
    },
    tokens: {
      input: totalInputTokens,
      output: totalOutputTokens,
      total: totalInputTokens + totalOutputTokens,
    },
    cost: cost ? cost.totalCost : 0,
  };
}
