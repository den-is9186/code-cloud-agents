/**
 * Export Service
 *
 * Provides export functionality for builds, costs, and reports:
 * - Build reports (JSON, CSV)
 * - Cost reports (monthly, per team, per project)
 * - Agent performance reports
 * - Budget status reports
 */

const { Parser } = require('json2csv');
const { logger } = require('../../dist/utils/logger');

/**
 * Export formats
 */
const ExportFormat = {
  JSON: 'json',
  CSV: 'csv',
  TEXT: 'text',
};

/**
 * Export build report
 *
 * @param {Object} redis - Redis client
 * @param {Object} options - Export options
 * @param {string} options.buildId - Build ID (optional, if not provided exports all)
 * @param {string} options.teamId - Team ID filter (optional)
 * @param {Date} options.startDate - Start date filter (optional)
 * @param {Date} options.endDate - End date filter (optional)
 * @param {string} options.format - Export format (json, csv)
 * @returns {Promise<string>} Exported data as string
 */
async function exportBuildReport(redis, options = {}) {
  const { buildId, teamId, startDate, endDate, format = ExportFormat.JSON } = options;

  let builds = [];

  if (buildId) {
    // Single build export
    const build = await getBuildDetails(redis, buildId);
    if (build) {
      builds.push(build);
    }
  } else {
    // Multiple builds export
    builds = await getBuilds(redis, { teamId, startDate, endDate });
  }

  // Format data
  if (format === ExportFormat.CSV) {
    return formatBuildReportCSV(builds);
  }

  return JSON.stringify(builds, null, 2);
}

/**
 * Export cost report
 *
 * @param {Object} redis - Redis client
 * @param {Object} options - Export options
 * @param {string} options.teamId - Team ID (required)
 * @param {string} options.period - Period (month, quarter, year)
 * @param {Date} options.startDate - Start date
 * @param {Date} options.endDate - End date
 * @param {string} options.format - Export format
 * @returns {Promise<string>} Exported cost data
 */
async function exportCostReport(redis, options = {}) {
  const { teamId, period = 'month', startDate, endDate, format = ExportFormat.JSON } = options;

  if (!teamId) {
    throw new Error('teamId is required for cost report');
  }

  // Calculate date range based on period
  const { start, end } = calculateDateRange(period, startDate, endDate);

  // Get builds in date range
  const builds = await getBuilds(redis, { teamId, startDate: start, endDate: end });

  // Calculate costs
  const costData = {
    teamId,
    period,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    totalBuilds: builds.length,
    totalCost: 0,
    totalTokens: 0,
    costByAgent: {},
    costByModel: {},
    buildDetails: [],
  };

  for (const build of builds) {
    costData.totalCost += build.totalCost || 0;
    costData.totalTokens += build.totalTokens || 0;

    // Cost by agent
    if (build.agentRuns) {
      for (const agentRun of build.agentRuns) {
        const agent = agentRun.agentName;
        if (!costData.costByAgent[agent]) {
          costData.costByAgent[agent] = { cost: 0, tokens: 0, runs: 0 };
        }
        costData.costByAgent[agent].cost += agentRun.cost || 0;
        costData.costByAgent[agent].tokens += agentRun.totalTokens || 0;
        costData.costByAgent[agent].runs += 1;
      }

      // Cost by model
      for (const agentRun of build.agentRuns) {
        const model = agentRun.model;
        if (!costData.costByModel[model]) {
          costData.costByModel[model] = { cost: 0, tokens: 0, runs: 0 };
        }
        costData.costByModel[model].cost += agentRun.cost || 0;
        costData.costByModel[model].tokens += agentRun.totalTokens || 0;
        costData.costByModel[model].runs += 1;
      }
    }

    costData.buildDetails.push({
      buildId: build.id,
      status: build.status,
      cost: build.totalCost,
      tokens: build.totalTokens,
      duration: build.duration,
      createdAt: build.createdAt,
    });
  }

  // Format data
  if (format === ExportFormat.CSV) {
    return formatCostReportCSV(costData);
  }

  return JSON.stringify(costData, null, 2);
}

/**
 * Export agent performance report
 *
 * @param {Object} redis - Redis client
 * @param {Object} options - Export options
 * @param {string} options.teamId - Team ID filter (optional)
 * @param {string} options.agentName - Agent name filter (optional)
 * @param {Date} options.startDate - Start date (optional)
 * @param {Date} options.endDate - End date (optional)
 * @param {string} options.format - Export format
 * @returns {Promise<string>} Agent performance data
 */
async function exportAgentPerformanceReport(redis, options = {}) {
  const { teamId, agentName, startDate, endDate, format = ExportFormat.JSON } = options;

  const builds = await getBuilds(redis, { teamId, startDate, endDate });

  const performanceData = {
    period: {
      startDate: startDate ? startDate.toISOString() : 'all',
      endDate: endDate ? endDate.toISOString() : 'all',
    },
    totalBuilds: builds.length,
    agentStats: {},
  };

  for (const build of builds) {
    if (!build.agentRuns) continue;

    for (const agentRun of build.agentRuns) {
      // Filter by agent name if specified
      if (agentName && agentRun.agentName !== agentName) {
        continue;
      }

      const agent = agentRun.agentName;

      if (!performanceData.agentStats[agent]) {
        performanceData.agentStats[agent] = {
          totalRuns: 0,
          successfulRuns: 0,
          failedRuns: 0,
          totalCost: 0,
          totalTokens: 0,
          avgDuration: 0,
          avgCost: 0,
          totalDuration: 0,
        };
      }

      const stats = performanceData.agentStats[agent];
      stats.totalRuns += 1;

      if (agentRun.status === 'completed') {
        stats.successfulRuns += 1;
      } else if (agentRun.status === 'failed') {
        stats.failedRuns += 1;
      }

      stats.totalCost += agentRun.cost || 0;
      stats.totalTokens += agentRun.totalTokens || 0;
      stats.totalDuration += agentRun.duration || 0;
    }
  }

  // Calculate averages
  for (const agent in performanceData.agentStats) {
    const stats = performanceData.agentStats[agent];
    stats.avgDuration = stats.totalRuns > 0 ? stats.totalDuration / stats.totalRuns : 0;
    stats.avgCost = stats.totalRuns > 0 ? stats.totalCost / stats.totalRuns : 0;
    stats.successRate = stats.totalRuns > 0 ? (stats.successfulRuns / stats.totalRuns) * 100 : 0;
  }

  if (format === ExportFormat.CSV) {
    return formatAgentPerformanceCSV(performanceData);
  }

  return JSON.stringify(performanceData, null, 2);
}

/**
 * Export budget report
 *
 * @param {Object} redis - Redis client
 * @param {string} teamId - Team ID
 * @param {string} format - Export format
 * @returns {Promise<string>} Budget report data
 */
async function exportBudgetReport(redis, teamId, format = ExportFormat.JSON) {
  const { getBudgetStatus } = require('./budget-alert-service');

  const budgetStatus = await getBudgetStatus(redis, teamId);

  if (!budgetStatus) {
    throw new Error(`No budget data found for team ${teamId}`);
  }

  const reportData = {
    teamId: budgetStatus.teamId,
    generatedAt: new Date().toISOString(),
    budgetLimits: budgetStatus.budgetLimits,
    currentSpending: {
      monthly: budgetStatus.monthlySpending,
      percentage: budgetStatus.percentage,
      remaining: budgetStatus.remaining,
      status: budgetStatus.status,
    },
    alertHistory: budgetStatus.alertHistory || [],
  };

  if (format === ExportFormat.CSV) {
    return formatBudgetReportCSV(reportData);
  }

  return JSON.stringify(reportData, null, 2);
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Get build details
 */
async function getBuildDetails(redis, buildId) {
  const { getBuildStatus } = require('./build-tracker');

  try {
    const status = await getBuildStatus(redis, buildId);
    return {
      id: status.build.id,
      teamId: status.build.teamId,
      status: status.build.status,
      preset: status.build.preset,
      phase: status.build.phase,
      totalCost: status.cost.totalCost,
      totalTokens: status.cost.totalTokens,
      duration: status.build.duration,
      createdAt: status.build.createdAt,
      completedAt: status.build.completedAt,
      agentRuns: status.agentRuns,
    };
  } catch (error) {
    logger.error('Failed to get build for export', {
      buildId,
      error: error.message,
    });
    return null;
  }
}

/**
 * Get builds with filters
 */
async function getBuilds(redis, filters = {}) {
  const { teamId, startDate, endDate } = filters;

  // Get team builds
  if (!teamId) {
    return [];
  }

  const buildIds = await redis.zrange(`team:${teamId}:builds`, 0, -1);

  const builds = [];
  for (const buildId of buildIds) {
    const build = await getBuildDetails(redis, buildId);
    if (!build) continue;

    // Apply date filters
    if (startDate && new Date(build.createdAt) < startDate) {
      continue;
    }
    if (endDate && new Date(build.createdAt) > endDate) {
      continue;
    }

    builds.push(build);
  }

  return builds;
}

/**
 * Calculate date range based on period
 */
function calculateDateRange(period, startDate, endDate) {
  const now = new Date();

  if (startDate && endDate) {
    return { start: new Date(startDate), end: new Date(endDate) };
  }

  let start, end;

  switch (period) {
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      break;

    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), quarter * 3, 1);
      end = new Date(now.getFullYear(), quarter * 3 + 3, 0, 23, 59, 59);
      break;

    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
      break;

    default:
      // Default to current month
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  return { start, end };
}

// ===================================================================
// CSV FORMATTING FUNCTIONS
// ===================================================================

/**
 * Format build report as CSV
 */
function formatBuildReportCSV(builds) {
  const fields = [
    'id',
    'teamId',
    'status',
    'preset',
    'phase',
    'totalCost',
    'totalTokens',
    'duration',
    'createdAt',
    'completedAt',
  ];

  const parser = new Parser({ fields });
  return parser.parse(builds);
}

/**
 * Format cost report as CSV
 */
function formatCostReportCSV(costData) {
  const lines = [];

  // Summary
  lines.push('Cost Report Summary');
  lines.push(`Team ID,${costData.teamId}`);
  lines.push(`Period,${costData.period}`);
  lines.push(`Start Date,${costData.startDate}`);
  lines.push(`End Date,${costData.endDate}`);
  lines.push(`Total Builds,${costData.totalBuilds}`);
  lines.push(`Total Cost,${costData.totalCost.toFixed(2)}`);
  lines.push(`Total Tokens,${costData.totalTokens}`);
  lines.push('');

  // Cost by Agent
  lines.push('Cost by Agent');
  lines.push('Agent,Cost,Tokens,Runs');
  for (const [agent, data] of Object.entries(costData.costByAgent)) {
    lines.push(`${agent},${data.cost.toFixed(2)},${data.tokens},${data.runs}`);
  }
  lines.push('');

  // Cost by Model
  lines.push('Cost by Model');
  lines.push('Model,Cost,Tokens,Runs');
  for (const [model, data] of Object.entries(costData.costByModel)) {
    lines.push(`${model},${data.cost.toFixed(2)},${data.tokens},${data.runs}`);
  }
  lines.push('');

  // Build Details
  lines.push('Build Details');
  const parser = new Parser({
    fields: ['buildId', 'status', 'cost', 'tokens', 'duration', 'createdAt'],
  });
  lines.push(parser.parse(costData.buildDetails));

  return lines.join('\n');
}

/**
 * Format agent performance as CSV
 */
function formatAgentPerformanceCSV(performanceData) {
  const lines = [];

  lines.push('Agent Performance Report');
  lines.push(`Period,${performanceData.period.startDate} to ${performanceData.period.endDate}`);
  lines.push(`Total Builds,${performanceData.totalBuilds}`);
  lines.push('');

  lines.push(
    'Agent,Total Runs,Successful,Failed,Success Rate %,Total Cost,Avg Cost,Total Tokens,Avg Duration (ms)'
  );

  for (const [agent, stats] of Object.entries(performanceData.agentStats)) {
    lines.push(
      `${agent},${stats.totalRuns},${stats.successfulRuns},${stats.failedRuns},${stats.successRate.toFixed(2)},${stats.totalCost.toFixed(2)},${stats.avgCost.toFixed(4)},${stats.totalTokens},${Math.round(stats.avgDuration)}`
    );
  }

  return lines.join('\n');
}

/**
 * Format budget report as CSV
 */
function formatBudgetReportCSV(reportData) {
  const lines = [];

  lines.push('Budget Report');
  lines.push(`Team ID,${reportData.teamId}`);
  lines.push(`Generated At,${reportData.generatedAt}`);
  lines.push('');

  lines.push('Budget Limits');
  if (reportData.budgetLimits) {
    lines.push(`Monthly Limit,${reportData.budgetLimits.monthly || 'N/A'}`);
    lines.push(`Per Build Limit,${reportData.budgetLimits.perBuild || 'N/A'}`);
  }
  lines.push('');

  lines.push('Current Spending');
  lines.push(`Monthly Spending,${reportData.currentSpending.monthly}`);
  lines.push(`Percentage,${reportData.currentSpending.percentage}%`);
  lines.push(`Remaining,${reportData.currentSpending.remaining}`);
  lines.push(`Status,${reportData.currentSpending.status}`);
  lines.push('');

  if (reportData.alertHistory && reportData.alertHistory.length > 0) {
    lines.push('Alert History');
    lines.push('Timestamp,Level,Percentage');
    for (const alert of reportData.alertHistory) {
      lines.push(`${alert.timestamp},${alert.level},${(alert.percentage * 100).toFixed(1)}%`);
    }
  }

  return lines.join('\n');
}

module.exports = {
  ExportFormat,
  exportBuildReport,
  exportCostReport,
  exportAgentPerformanceReport,
  exportBudgetReport,
};
