/**
 * Export Service
 *
 * Provides export functionality for builds, costs, and reports:
 * - Build reports (JSON, CSV)
 * - Cost reports (monthly, per team, per project)
 * - Agent performance reports
 * - Budget status reports
 */

import { Parser } from 'json2csv';
import type { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import type { BudgetStatus } from './budget-alert-service.js';

/**
 * Export formats
 */
export const ExportFormat = {
  JSON: 'json',
  CSV: 'csv',
  TEXT: 'text',
} as const;

export type ExportFormatValue = (typeof ExportFormat)[keyof typeof ExportFormat];

/**
 * Agent run data structure
 */
interface AgentRun {
  id: string;
  agentName: string;
  status: string;
  cost?: number;
  totalTokens?: number;
  duration?: number;
  model: string;
}

/**
 * Build details structure
 */
interface BuildDetails {
  id: string;
  teamId: string;
  status: string;
  preset: string;
  phase: string;
  totalCost: number;
  totalTokens: number;
  duration?: number;
  createdAt: string;
  completedAt?: string;
  agentRuns?: AgentRun[];
}

/**
 * Build export options
 */
export interface BuildExportOptions {
  buildId?: string;
  teamId?: string;
  startDate?: Date;
  endDate?: Date;
  format?: ExportFormatValue;
}

/**
 * Cost export options
 */
export interface CostExportOptions {
  teamId: string;
  period?: 'month' | 'quarter' | 'year';
  startDate?: Date;
  endDate?: Date;
  format?: ExportFormatValue;
}

/**
 * Agent performance export options
 */
export interface AgentPerformanceOptions {
  teamId?: string;
  agentName?: string;
  startDate?: Date;
  endDate?: Date;
  format?: ExportFormatValue;
}

/**
 * Cost data structure
 */
interface CostData {
  teamId: string;
  period: string;
  startDate: string;
  endDate: string;
  totalBuilds: number;
  totalCost: number;
  totalTokens: number;
  costByAgent: Record<string, { cost: number; tokens: number; runs: number }>;
  costByModel: Record<string, { cost: number; tokens: number; runs: number }>;
  buildDetails: Array<{
    buildId: string;
    status: string;
    cost: number;
    tokens: number;
    duration?: number;
    createdAt: string;
  }>;
}

/**
 * Agent stats structure
 */
interface AgentStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalCost: number;
  totalTokens: number;
  avgDuration: number;
  avgCost: number;
  totalDuration: number;
  successRate?: number;
}

/**
 * Performance data structure
 */
interface PerformanceData {
  period: {
    startDate: string;
    endDate: string;
  };
  totalBuilds: number;
  agentStats: Record<string, AgentStats>;
}

/**
 * Budget report data structure
 */
interface BudgetReportData {
  teamId: string;
  generatedAt: string;
  budgetLimits: BudgetStatus['budgetLimits'];
  currentSpending: {
    monthly: number;
    percentage?: string;
    remaining?: number;
    status?: string;
  };
  alertHistory: BudgetStatus['alertHistory'];
}

/**
 * Export build report
 *
 * @param redis - Redis client
 * @param options - Export options
 * @returns Exported data as string
 */
export async function exportBuildReport(
  redis: Redis,
  options: BuildExportOptions = {}
): Promise<string> {
  const { buildId, teamId, startDate, endDate, format = ExportFormat.JSON } = options;

  let builds: BuildDetails[] = [];

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
 * @param redis - Redis client
 * @param options - Export options
 * @returns Exported cost data
 */
export async function exportCostReport(redis: Redis, options: CostExportOptions): Promise<string> {
  const { teamId, period = 'month', startDate, endDate, format = ExportFormat.JSON } = options;

  if (!teamId) {
    throw new Error('teamId is required for cost report');
  }

  // Calculate date range based on period
  const { start, end } = calculateDateRange(period, startDate, endDate);

  // Get builds in date range
  const builds = await getBuilds(redis, { teamId, startDate: start, endDate: end });

  // Calculate costs
  const costData: CostData = {
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
 * @param redis - Redis client
 * @param options - Export options
 * @returns Agent performance data
 */
export async function exportAgentPerformanceReport(
  redis: Redis,
  options: AgentPerformanceOptions = {}
): Promise<string> {
  const { teamId, agentName, startDate, endDate, format = ExportFormat.JSON } = options;

  const builds = await getBuilds(redis, { teamId, startDate, endDate });

  const performanceData: PerformanceData = {
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
    if (stats) {
      stats.avgDuration = stats.totalRuns > 0 ? stats.totalDuration / stats.totalRuns : 0;
      stats.avgCost = stats.totalRuns > 0 ? stats.totalCost / stats.totalRuns : 0;
      stats.successRate = stats.totalRuns > 0 ? (stats.successfulRuns / stats.totalRuns) * 100 : 0;
    }
  }

  if (format === ExportFormat.CSV) {
    return formatAgentPerformanceCSV(performanceData);
  }

  return JSON.stringify(performanceData, null, 2);
}

/**
 * Export budget report
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @param format - Export format
 * @returns Budget report data
 */
export async function exportBudgetReport(
  redis: Redis,
  teamId: string,
  format: ExportFormatValue = ExportFormat.JSON
): Promise<string> {
  const { getBudgetStatus } = await import('./budget-alert-service.js');

  const budgetStatus = await getBudgetStatus(redis, teamId);

  if (!budgetStatus) {
    throw new Error(`No budget data found for team ${teamId}`);
  }

  const reportData: BudgetReportData = {
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
 *
 * @param redis - Redis client
 * @param buildId - Build ID
 * @returns Build details or null
 */
async function getBuildDetails(redis: Redis, buildId: string): Promise<BuildDetails | null> {
  const { getBuildStatus } = await import('./build-tracker.js');

  try {
    const status = await getBuildStatus(redis, buildId);
    return {
      id: status.build.id,
      teamId: status.build.teamId,
      status: status.build.status,
      preset: status.build.preset,
      phase: status.build.phase,
      totalCost: status.cost?.totalCost ?? 0,
      totalTokens: status.cost?.totalTokens ?? 0,
      duration: status.build.duration,
      createdAt: status.build.createdAt,
      completedAt: status.build.completedAt,
      agentRuns: status.agentRuns,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get build for export', {
      buildId,
      error: errorMessage,
    });
    return null;
  }
}

/**
 * Get builds with filters
 *
 * @param redis - Redis client
 * @param filters - Filter options
 * @returns Array of builds
 */
async function getBuilds(
  redis: Redis,
  filters: { teamId?: string; startDate?: Date; endDate?: Date } = {}
): Promise<BuildDetails[]> {
  const { teamId, startDate, endDate } = filters;

  // Get team builds
  if (!teamId) {
    return [];
  }

  const buildIds = await redis.zrange(`team:${teamId}:builds`, 0, -1);

  const builds: BuildDetails[] = [];
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
 *
 * @param period - Time period
 * @param startDate - Start date override
 * @param endDate - End date override
 * @returns Start and end dates
 */
function calculateDateRange(
  period: 'month' | 'quarter' | 'year',
  startDate?: Date,
  endDate?: Date
): { start: Date; end: Date } {
  const now = new Date();

  if (startDate && endDate) {
    return { start: new Date(startDate), end: new Date(endDate) };
  }

  let start: Date;
  let end: Date;

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
 *
 * @param builds - Array of builds
 * @returns CSV string
 */
function formatBuildReportCSV(builds: BuildDetails[]): string {
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
 *
 * @param costData - Cost data
 * @returns CSV string
 */
function formatCostReportCSV(costData: CostData): string {
  const lines: string[] = [];

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
 *
 * @param performanceData - Performance data
 * @returns CSV string
 */
function formatAgentPerformanceCSV(performanceData: PerformanceData): string {
  const lines: string[] = [];

  lines.push('Agent Performance Report');
  lines.push(`Period,${performanceData.period.startDate} to ${performanceData.period.endDate}`);
  lines.push(`Total Builds,${performanceData.totalBuilds}`);
  lines.push('');

  lines.push(
    'Agent,Total Runs,Successful,Failed,Success Rate %,Total Cost,Avg Cost,Total Tokens,Avg Duration (ms)'
  );

  for (const [agent, stats] of Object.entries(performanceData.agentStats)) {
    lines.push(
      `${agent},${stats.totalRuns},${stats.successfulRuns},${stats.failedRuns},${(stats.successRate ?? 0).toFixed(2)},${stats.totalCost.toFixed(2)},${stats.avgCost.toFixed(4)},${stats.totalTokens},${Math.round(stats.avgDuration)}`
    );
  }

  return lines.join('\n');
}

/**
 * Format budget report as CSV
 *
 * @param reportData - Budget report data
 * @returns CSV string
 */
function formatBudgetReportCSV(reportData: BudgetReportData): string {
  const lines: string[] = [];

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
