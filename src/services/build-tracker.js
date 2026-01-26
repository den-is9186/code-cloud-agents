/**
 * Build Tracker Service
 *
 * Manages build lifecycle: creation, tracking, status updates, and completion.
 * Integrates with Redis schema and cost tracking.
 */

const crypto = require('crypto');
const {
  createBuild,
  getBuild,
  updateBuild,
  createAgentRun,
  updateAgentRun,
  addBuildToTeam,
  getTeamBuilds,
} = require('../database/redis-schema');

const { calculateBuildCost, generateBuildCostReport } = require('../utils/cost-tracker');

// ===================================================================
// BUILD LIFECYCLE
// ===================================================================

/**
 * Start a new build for a team
 *
 * @param {Object} redis - Redis client
 * @param {Object} options - Build options
 * @param {string} options.teamId - Team ID
 * @param {string} options.preset - Preset ID (A, B, C, D, etc.)
 * @param {string} options.phase - Build phase (prototype or premium)
 * @param {Object} options.metadata - Optional metadata
 * @returns {Promise<Object>} Created build
 */
async function startBuild(redis, { teamId, preset, phase, metadata = {} }) {
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
    completedAgents: JSON.parse(build.completedAgents),
  };
}

/**
 * Mark a build as running
 *
 * @param {Object} redis - Redis client
 * @param {string} buildId - Build ID
 * @param {string} currentAgent - Current agent name
 * @returns {Promise<void>}
 */
async function markBuildRunning(redis, buildId, currentAgent = null) {
  await updateBuild(redis, buildId, {
    status: 'running',
    currentAgent,
    startedAt: new Date().toISOString(),
  });
}

/**
 * Mark a build as completed
 *
 * @param {Object} redis - Redis client
 * @param {string} buildId - Build ID
 * @param {Object} options - Completion options
 * @returns {Promise<Object>} Build with cost info
 */
async function completeBuild(redis, buildId, { success = true, errorMessage = null } = {}) {
  const build = await getBuild(redis, buildId);

  if (!build) {
    throw new Error(`Build "${buildId}" not found`);
  }

  const completedAt = new Date().toISOString();
  const startedAt = new Date(build.startedAt);
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
    build: updatedBuild,
    cost: buildCost,
  };
}

/**
 * Mark a build as failed
 *
 * @param {Object} redis - Redis client
 * @param {string} buildId - Build ID
 * @param {string} errorMessage - Error message
 * @returns {Promise<Object>} Updated build
 */
async function failBuild(redis, buildId, errorMessage) {
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
 * @param {Object} redis - Redis client
 * @param {Object} options - Agent run options
 * @returns {Promise<Object>} Created agent run
 */
async function startAgentRun(
  redis,
  { buildId, teamId, agentName, model, modelVersion = null, metadata = {} }
) {
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

  return agentRun;
}

/**
 * Complete an agent run with results
 *
 * @param {Object} redis - Redis client
 * @param {string} runId - Agent run ID
 * @param {Object} results - Agent run results
 * @returns {Promise<Object>} Updated agent run
 */
async function completeAgentRun(
  redis,
  runId,
  {
    success = true,
    inputTokens = 0,
    outputTokens = 0,
    output = null,
    errorMessage = null,
  }
) {
  const agentRun = await require('../database/redis-schema').getAgentRun(redis, runId);

  if (!agentRun) {
    throw new Error(`Agent run "${runId}" not found`);
  }

  const completedAt = new Date().toISOString();
  const startedAt = new Date(agentRun.startedAt);
  const duration = Date.now() - startedAt.getTime();

  const totalTokens = inputTokens + outputTokens;

  // Calculate cost
  const { calculateAgentCost } = require('../utils/cost-tracker');
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
      console.error(`Failed to calculate cost for agent run ${runId}:`, error.message);
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
  const completedAgents = build.completedAgents || [];
  if (!completedAgents.includes(agentRun.agentName)) {
    completedAgents.push(agentRun.agentName);
    await updateBuild(redis, agentRun.buildId, {
      completedAgents,
    });
  }

  return await require('../database/redis-schema').getAgentRun(redis, runId);
}

/**
 * Fail an agent run
 *
 * @param {Object} redis - Redis client
 * @param {string} runId - Agent run ID
 * @param {string} errorMessage - Error message
 * @returns {Promise<Object>} Updated agent run
 */
async function failAgentRun(redis, runId, errorMessage) {
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
 * @param {Object} redis - Redis client
 * @param {string} buildId - Build ID
 * @returns {Promise<Object>} Build status
 */
async function getBuildStatus(redis, buildId) {
  const build = await getBuild(redis, buildId);

  if (!build) {
    throw new Error(`Build "${buildId}" not found`);
  }

  // Get agent runs
  const { getBuildAgentRuns, getAgentRun } = require('../database/redis-schema');
  const agentRunIds = await getBuildAgentRuns(redis, buildId);

  const agentRuns = [];
  for (const runId of agentRunIds) {
    const run = await getAgentRun(redis, runId);
    if (run) {
      agentRuns.push(run);
    }
  }

  // Calculate progress
  const totalAgents = agentRuns.length;
  const completedAgents = agentRuns.filter((run) => run.status === 'completed').length;
  const progress = totalAgents > 0 ? (completedAgents / totalAgents) * 100 : 0;

  // Get cost if build has started
  let cost = null;
  if (build.status !== 'pending') {
    try {
      cost = await calculateBuildCost(redis, buildId);
    } catch (error) {
      console.error(`Failed to calculate build cost: ${error.message}`);
    }
  }

  return {
    build: {
      ...build,
      completedAgents: build.completedAgents || [],
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
 * @param {Object} redis - Redis client
 * @param {string} teamId - Team ID
 * @param {number} limit - Maximum number of builds to return
 * @returns {Promise<Array>} Array of builds
 */
async function getTeamBuildHistory(redis, teamId, limit = 10) {
  const buildIds = await getTeamBuilds(redis, teamId, limit);

  const builds = [];
  for (const buildId of buildIds) {
    const build = await getBuild(redis, buildId);
    if (build) {
      builds.push({
        ...build,
        completedAgents: build.completedAgents || [],
      });
    }
  }

  return builds;
}

/**
 * Get latest build for a team
 *
 * @param {Object} redis - Redis client
 * @param {string} teamId - Team ID
 * @returns {Promise<Object|null>} Latest build or null
 */
async function getLatestTeamBuild(redis, teamId) {
  const builds = await getTeamBuildHistory(redis, teamId, 1);
  return builds.length > 0 ? builds[0] : null;
}

// ===================================================================
// STATISTICS
// ===================================================================

/**
 * Get build statistics
 *
 * @param {Object} redis - Redis client
 * @param {string} buildId - Build ID
 * @returns {Promise<Object>} Build statistics
 */
async function getBuildStatistics(redis, buildId) {
  const status = await getBuildStatus(redis, buildId);
  const { build, agentRuns, cost } = status;

  // Calculate timing stats
  const agentDurations = agentRuns
    .filter((run) => run.duration)
    .map((run) => run.duration);

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

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = {
  // Build lifecycle
  startBuild,
  markBuildRunning,
  completeBuild,
  failBuild,

  // Agent run tracking
  startAgentRun,
  completeAgentRun,
  failAgentRun,

  // Build queries
  getBuildStatus,
  getTeamBuildHistory,
  getLatestTeamBuild,

  // Statistics
  getBuildStatistics,
};
