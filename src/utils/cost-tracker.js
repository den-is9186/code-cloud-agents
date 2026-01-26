/**
 * Cost Tracker Utility
 *
 * Calculates costs for model usage, agent runs, and builds.
 * Provides budget monitoring and alerts.
 */

const { getModel, modelExists } = require('../config/presets');
const { getBuild, getBuildAgentRuns, getAgentRun } = require('../database/redis-schema');

// ===================================================================
// COST CALCULATION
// ===================================================================

/**
 * Calculate cost for a specific model based on token usage
 *
 * @param {string} modelId - Model identifier
 * @param {number} inputTokens - Number of input tokens
 * @param {number} outputTokens - Number of output tokens
 * @returns {Object} Cost breakdown
 */
function calculateModelCost(modelId, inputTokens, outputTokens) {
  if (!modelExists(modelId)) {
    throw new Error(`Model "${modelId}" not found`);
  }

  const model = getModel(modelId);
  const pricing = model.pricing;

  // Calculate costs per million tokens
  const inputCost = (inputTokens / 1_000_000) * pricing.input_per_million;
  const outputCost = (outputTokens / 1_000_000) * pricing.output_per_million;
  const totalCost = inputCost + outputCost;

  return {
    modelId,
    modelName: model.display_name,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCost: parseFloat(inputCost.toFixed(6)),
    outputCost: parseFloat(outputCost.toFixed(6)),
    totalCost: parseFloat(totalCost.toFixed(6)),
    currency: pricing.currency || 'USD',
  };
}

/**
 * Calculate cost for an agent run
 *
 * @param {Object} agentRun - Agent run object with model and token info
 * @returns {Object} Cost calculation result
 */
function calculateAgentCost(agentRun) {
  return calculateModelCost(agentRun.model, agentRun.inputTokens, agentRun.outputTokens);
}

/**
 * Calculate total cost for a build by summing all agent runs
 *
 * @param {Object} redis - Redis client
 * @param {string} buildId - Build identifier
 * @returns {Promise<Object>} Build cost breakdown
 */
async function calculateBuildCost(redis, buildId) {
  const build = await getBuild(redis, buildId);

  if (!build) {
    throw new Error(`Build "${buildId}" not found`);
  }

  // Get all agent runs for this build
  const agentRunIds = await getBuildAgentRuns(redis, buildId);

  const agentCosts = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCost = 0;

  for (const runId of agentRunIds) {
    const agentRun = await getAgentRun(redis, runId);

    if (agentRun && agentRun.inputTokens && agentRun.outputTokens && agentRun.model) {
      const cost = calculateAgentCost(agentRun);

      agentCosts.push({
        runId: agentRun.id,
        agentName: agentRun.agentName,
        model: agentRun.model,
        inputTokens: agentRun.inputTokens,
        outputTokens: agentRun.outputTokens,
        totalTokens: agentRun.totalTokens,
        cost: cost.totalCost,
        duration: agentRun.duration,
      });

      totalInputTokens += agentRun.inputTokens;
      totalOutputTokens += agentRun.outputTokens;
      totalCost += cost.totalCost;
    }
  }

  return {
    buildId: build.id,
    teamId: build.teamId,
    preset: build.preset,
    phase: build.phase,
    agentCosts,
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalCost: parseFloat(totalCost.toFixed(6)),
    currency: 'USD',
    agentCount: agentCosts.length,
  };
}

// ===================================================================
// BUDGET MONITORING
// ===================================================================

/**
 * Check if a build is approaching or exceeding its budget
 *
 * @param {Object} buildCost - Build cost breakdown
 * @param {number} budgetLimit - Budget limit in USD
 * @returns {Object} Budget status
 */
function checkBudget(buildCost, budgetLimit) {
  const utilizationPercent = (buildCost.totalCost / budgetLimit) * 100;
  const remaining = budgetLimit - buildCost.totalCost;

  let status = 'ok';
  let alert = null;

  if (utilizationPercent >= 100) {
    status = 'exceeded';
    alert = {
      level: 'critical',
      message: `Budget exceeded! Cost: $${buildCost.totalCost}, Limit: $${budgetLimit}`,
    };
  } else if (utilizationPercent >= 90) {
    status = 'critical';
    alert = {
      level: 'warning',
      message: `Budget at ${utilizationPercent.toFixed(0)}%! Only $${remaining.toFixed(2)} remaining`,
    };
  } else if (utilizationPercent >= 75) {
    status = 'warning';
    alert = {
      level: 'info',
      message: `Budget at ${utilizationPercent.toFixed(0)}%`,
    };
  }

  return {
    status,
    utilizationPercent: parseFloat(utilizationPercent.toFixed(2)),
    spent: buildCost.totalCost,
    limit: budgetLimit,
    remaining: parseFloat(remaining.toFixed(6)),
    alert,
  };
}

/**
 * Get budget status for a build
 *
 * @param {Object} redis - Redis client
 * @param {string} buildId - Build identifier
 * @param {number} budgetLimit - Budget limit in USD
 * @returns {Promise<Object>} Budget status
 */
async function getBuildBudgetStatus(redis, buildId, budgetLimit) {
  const buildCost = await calculateBuildCost(redis, buildId);
  return checkBudget(buildCost, budgetLimit);
}

// ===================================================================
// PRESET COST ESTIMATION
// ===================================================================

/**
 * Estimate cost for a preset based on average token usage
 *
 * @param {string} presetId - Preset identifier
 * @param {number} estimatedTokens - Estimated total tokens (default: based on preset)
 * @returns {Object} Cost estimation
 */
function estimatePresetCost(presetId, estimatedTokens = null) {
  const { getPreset, getPresetModels } = require('../config/presets');

  const preset = getPreset(presetId);
  const models = getPresetModels(presetId);

  // Use preset's estimated cost if available
  if (preset.estimated_cost_per_build && !estimatedTokens) {
    return {
      presetId,
      presetName: preset.name,
      estimatedCost: preset.estimated_cost_per_build,
      source: 'preset_configuration',
      currency: 'USD',
    };
  }

  // Calculate from models if tokens provided
  if (estimatedTokens) {
    const agentNames = Object.keys(preset.agents || {});
    const tokensPerAgent = Math.floor(estimatedTokens / agentNames.length);
    const inputTokens = Math.floor(tokensPerAgent * 0.3); // 30% input
    const outputTokens = Math.floor(tokensPerAgent * 0.7); // 70% output

    let totalCost = 0;

    for (const agentName of agentNames) {
      const model = models[agentName];
      if (model) {
        const cost = calculateModelCost(model.id, inputTokens, outputTokens);
        totalCost += cost.totalCost;
      }
    }

    return {
      presetId,
      presetName: preset.name,
      estimatedCost: parseFloat(totalCost.toFixed(2)),
      estimatedTokens,
      agentCount: agentNames.length,
      source: 'calculated',
      currency: 'USD',
    };
  }

  return {
    presetId,
    presetName: preset.name,
    estimatedCost: null,
    source: 'unknown',
    currency: 'USD',
  };
}

/**
 * Compare costs between multiple presets
 *
 * @param {Array<string>} presetIds - Array of preset IDs
 * @param {number} estimatedTokens - Estimated total tokens
 * @returns {Array<Object>} Cost comparison
 */
function comparePresetCosts(presetIds, estimatedTokens = null) {
  return presetIds
    .map((presetId) => estimatePresetCost(presetId, estimatedTokens))
    .sort((a, b) => (a.estimatedCost || 0) - (b.estimatedCost || 0));
}

// ===================================================================
// COST REPORTING
// ===================================================================

/**
 * Generate a detailed cost report for a build
 *
 * @param {Object} redis - Redis client
 * @param {string} buildId - Build identifier
 * @returns {Promise<Object>} Detailed cost report
 */
async function generateBuildCostReport(redis, buildId) {
  const buildCost = await calculateBuildCost(redis, buildId);
  const build = await getBuild(redis, buildId);

  // Sort agents by cost
  const agentsByCost = [...buildCost.agentCosts].sort((a, b) => b.cost - a.cost);

  // Calculate percentages
  const agentsWithPercent = agentsByCost.map((agent) => ({
    ...agent,
    costPercent: parseFloat(((agent.cost / buildCost.totalCost) * 100).toFixed(2)),
  }));

  // Get most expensive agent
  const mostExpensive = agentsByCost[0];

  // Calculate average cost per agent
  const avgCostPerAgent =
    buildCost.agentCount > 0 ? buildCost.totalCost / buildCost.agentCount : 0;

  return {
    build: {
      id: build.id,
      teamId: build.teamId,
      preset: build.preset,
      phase: build.phase,
      status: build.status,
    },
    summary: {
      totalCost: buildCost.totalCost,
      totalTokens: buildCost.totalTokens,
      totalInputTokens: buildCost.totalInputTokens,
      totalOutputTokens: buildCost.totalOutputTokens,
      agentCount: buildCost.agentCount,
      avgCostPerAgent: parseFloat(avgCostPerAgent.toFixed(6)),
      currency: 'USD',
    },
    agents: agentsWithPercent,
    insights: {
      mostExpensiveAgent: mostExpensive
        ? {
            name: mostExpensive.agentName,
            cost: mostExpensive.cost,
            percent: parseFloat(((mostExpensive.cost / buildCost.totalCost) * 100).toFixed(2)),
          }
        : null,
      avgTokensPerAgent:
        buildCost.agentCount > 0
          ? Math.floor(buildCost.totalTokens / buildCost.agentCount)
          : 0,
    },
  };
}

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = {
  // Cost calculation
  calculateModelCost,
  calculateAgentCost,
  calculateBuildCost,

  // Budget monitoring
  checkBudget,
  getBuildBudgetStatus,

  // Preset estimation
  estimatePresetCost,
  comparePresetCosts,

  // Reporting
  generateBuildCostReport,
};
