/**
 * Budget Alert Service
 *
 * Monitors team budgets and sends alerts when thresholds are exceeded:
 * - Alert at 80% budget reached
 * - Alert at 100% budget reached
 * - Monthly budget limits per team
 * - Integration with notification service
 */

import type { Redis } from 'ioredis';
import { logger } from '../utils/logger';
import {
  sendNotification,
  NotificationType,
  getTeamNotificationChannels,
  type NotificationTypeValue,
} from './notification-service.js';

/**
 * Budget threshold levels
 */
export const BudgetThreshold = {
  WARNING: 0.8, // 80%
  CRITICAL: 0.95, // 95%
  EXCEEDED: 1.0, // 100%
} as const;

/**
 * Alert levels
 */
export type AlertLevel = 'warning' | 'critical' | 'exceeded';

/**
 * Alert status structure
 */
export interface AlertStatus {
  shouldAlert: boolean;
  level: AlertLevel | null;
  percentage: number;
  currentCost?: number;
  budgetLimit?: number;
  remaining?: number;
}

/**
 * Budget limits structure
 */
export interface BudgetLimits {
  monthly: number;
  perBuild?: number | null;
  updatedAt: string;
}

/**
 * Alert data structure
 */
export interface AlertData {
  level: AlertLevel;
  percentage: number;
  currentCost: number;
  budgetLimit: number;
  remaining: number;
  timestamp: string;
}

/**
 * Budget status structure
 */
export interface BudgetStatus {
  teamId: string;
  monthlySpending: number;
  budgetLimits: BudgetLimits | null;
  alertHistory: Array<AlertData & { id: string }>;
  percentage?: string;
  remaining?: number;
  status?: 'ok' | 'warning' | 'critical' | 'exceeded';
}

/**
 * Budget check result structure
 */
export interface BudgetCheckResult {
  checked: boolean;
  monthlySpending?: number;
  budgetLimit?: number | null;
  percentage?: number;
  alertSent?: boolean;
  alertLevel?: AlertLevel | null;
  reason?: string;
}

/**
 * Check if team budget has reached any threshold
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @param currentCost - Current cost for this period
 * @param budgetLimit - Budget limit
 * @returns Alert status and level
 */
export async function checkBudgetThreshold(
  redis: Redis,
  teamId: string,
  currentCost: number,
  budgetLimit: number
): Promise<AlertStatus> {
  if (!budgetLimit || budgetLimit <= 0) {
    return {
      shouldAlert: false,
      level: null,
      percentage: 0,
    };
  }

  const percentage = currentCost / budgetLimit;
  const alertKey = `team:${teamId}:budget:last_alert`;

  // Get last alert level
  const lastAlert = await redis.get(alertKey);

  let shouldAlert = false;
  let level: AlertLevel | null = null;

  if (percentage >= BudgetThreshold.EXCEEDED && lastAlert !== 'exceeded') {
    shouldAlert = true;
    level = 'exceeded';
  } else if (
    percentage >= BudgetThreshold.CRITICAL &&
    lastAlert !== 'critical' &&
    lastAlert !== 'exceeded'
  ) {
    shouldAlert = true;
    level = 'critical';
  } else if (
    percentage >= BudgetThreshold.WARNING &&
    !lastAlert &&
    lastAlert !== 'warning' &&
    lastAlert !== 'critical' &&
    lastAlert !== 'exceeded'
  ) {
    shouldAlert = true;
    level = 'warning';
  }

  if (shouldAlert && level) {
    // Update last alert level with 24h TTL
    await redis.setex(alertKey, 24 * 60 * 60, level);
  }

  return {
    shouldAlert,
    level,
    percentage,
    currentCost,
    budgetLimit,
    remaining: budgetLimit - currentCost,
  };
}

/**
 * Send budget alert notification
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @param alertInfo - Alert information
 * @returns Array of notification results
 */
export async function sendBudgetAlert(
  redis: Redis,
  teamId: string,
  alertInfo: AlertStatus
): Promise<Array<{ channel: string; success: boolean; error?: string }>> {
  const { level, percentage, currentCost, budgetLimit, remaining } = alertInfo;

  if (!level) {
    return [];
  }

  // Get team info
  const teamKey = `team:${teamId}`;
  const teamData = await redis.get(teamKey);

  if (!teamData) {
    logger.error('Team not found for budget alert', {
      teamId,
      level: alertInfo.level,
      percentage: alertInfo.percentage,
    });
    return [];
  }

  const team = JSON.parse(teamData) as { name: string };

  // Get notification channels
  const channels = await getTeamNotificationChannels(redis, teamId);

  if (channels.length === 0) {
    logger.warn('No notification channels configured for team', {
      teamId,
      teamName: team.name,
      level: alertInfo.level,
    });
    return [];
  }

  // Build alert message
  const percentageFormatted = (percentage * 100).toFixed(1);
  const currentCostFormatted = currentCost?.toFixed(2) ?? '0.00';
  const budgetLimitFormatted = budgetLimit?.toFixed(2) ?? '0.00';
  const remainingFormatted = (remaining ?? 0).toFixed(2);

  let message: string;
  let notificationType: NotificationTypeValue;

  if (level === 'exceeded') {
    message = `🚨 BUDGET EXCEEDED! Team "${team.name}" has spent $${currentCostFormatted} (${percentageFormatted}%) of $${budgetLimitFormatted} budget. Remaining: -$${Math.abs(remaining ?? 0).toFixed(2)}`;
    notificationType = NotificationType.AGENT_FAILED; // Reuse for budget exceeded
  } else if (level === 'critical') {
    message = `⚠️ BUDGET CRITICAL! Team "${team.name}" has spent $${currentCostFormatted} (${percentageFormatted}%) of $${budgetLimitFormatted} budget. Only $${remainingFormatted} remaining!`;
    notificationType = NotificationType.AGENT_FAILED;
  } else {
    message = `⏰ Budget Warning: Team "${team.name}" has spent $${currentCostFormatted} (${percentageFormatted}%) of $${budgetLimitFormatted} budget. $${remainingFormatted} remaining.`;
    notificationType = NotificationType.APPROVAL_REQUIRED; // Reuse for warning
  }

  // Send notification
  const results = await sendNotification(
    redis,
    {
      type: notificationType,
      teamId,
      teamName: team.name,
      status: level,
      message,
      metadata: {
        budgetAlert: true,
        level,
        percentage: percentageFormatted,
        currentCost: currentCostFormatted,
        budgetLimit: budgetLimitFormatted,
        remaining: remainingFormatted,
      },
    },
    channels
  );

  // Store alert in history
  await storeBudgetAlert(redis, teamId, {
    level,
    percentage,
    currentCost: currentCost ?? 0,
    budgetLimit: budgetLimit ?? 0,
    remaining: remaining ?? 0,
    timestamp: new Date().toISOString(),
  });

  return results;
}

/**
 * Store budget alert in history
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @param alertData - Alert data
 */
export async function storeBudgetAlert(
  redis: Redis,
  teamId: string,
  alertData: AlertData
): Promise<void> {
  const alertId = `budget-alert:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  const key = `team:${teamId}:budget:alert:${alertId}`;

  // Store alert with 30 days TTL
  await redis.setex(key, 30 * 24 * 60 * 60, JSON.stringify(alertData));

  // Add to team's alert history (sorted set by timestamp)
  await redis.zadd(`team:${teamId}:budget:alerts`, Date.now(), alertId);
}

/**
 * Get team budget alerts history
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @param limit - Max number of alerts to return
 * @returns Array of alert history
 */
export async function getBudgetAlertHistory(
  redis: Redis,
  teamId: string,
  limit: number = 10
): Promise<Array<AlertData & { id: string }>> {
  // Get recent alert IDs
  const alertIds = await redis.zrevrange(`team:${teamId}:budget:alerts`, 0, limit - 1);

  const alerts: Array<AlertData & { id: string }> = [];
  for (const alertId of alertIds) {
    const key = `team:${teamId}:budget:alert:${alertId}`;
    const alertData = await redis.get(key);
    if (alertData) {
      alerts.push({
        id: alertId,
        ...JSON.parse(alertData),
      });
    }
  }

  return alerts;
}

/**
 * Set team budget limit
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @param monthlyLimit - Monthly budget limit in USD
 * @param buildLimit - Per-build budget limit in USD (optional)
 * @returns Updated budget limits
 */
export async function setTeamBudgetLimit(
  redis: Redis,
  teamId: string,
  monthlyLimit: number,
  buildLimit: number | null = null
): Promise<BudgetLimits> {
  const teamKey = `team:${teamId}`;
  const teamData = await redis.get(teamKey);

  if (!teamData) {
    throw new Error(`Team ${teamId} not found`);
  }

  const team = JSON.parse(teamData) as { budgetLimits?: BudgetLimits };
  team.budgetLimits = {
    monthly: monthlyLimit,
    perBuild: buildLimit,
    updatedAt: new Date().toISOString(),
  };

  await redis.set(teamKey, JSON.stringify(team));

  // Reset alert state when budget is updated
  await redis.del(`team:${teamId}:budget:last_alert`);

  return team.budgetLimits;
}

/**
 * Get team budget limit
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @returns Budget limits or null
 */
export async function getTeamBudgetLimit(
  redis: Redis,
  teamId: string
): Promise<BudgetLimits | null> {
  const teamKey = `team:${teamId}`;
  const teamData = await redis.get(teamKey);

  if (!teamData) {
    return null;
  }

  const team = JSON.parse(teamData) as { budgetLimits?: BudgetLimits };
  return team.budgetLimits || null;
}

/**
 * Get current month's spending for team
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @returns Total cost for current month
 */
export async function getCurrentMonthSpending(redis: Redis, teamId: string): Promise<number> {
  // Get current month start timestamp
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Get all builds for this team in current month
  const buildIds = await redis.zrangebyscore(`team:${teamId}:builds`, monthStart, '+inf');

  let totalCost = 0;

  // Sum up costs from all builds
  for (const buildId of buildIds) {
    const buildData = await redis.hgetall(`build:${buildId}`);
    if (buildData && buildData.totalCost) {
      totalCost += parseFloat(buildData.totalCost);
    }
  }

  return totalCost;
}

/**
 * Check and alert budget after build completion
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @param buildCost - Cost of the completed build
 * @returns Budget check result
 */
export async function checkBudgetAfterBuild(
  redis: Redis,
  teamId: string,
  buildCost: number
): Promise<BudgetCheckResult> {
  // Get budget limits
  const budgetLimits = await getTeamBudgetLimit(redis, teamId);

  if (!budgetLimits) {
    return {
      checked: false,
      reason: 'No budget limits configured',
    };
  }

  // Check per-build limit
  if (budgetLimits.perBuild && buildCost > budgetLimits.perBuild) {
    logger.warn('Build exceeded per-build limit', {
      teamId,
      buildCost,
      perBuildLimit: budgetLimits.perBuild,
      overage: buildCost - budgetLimits.perBuild,
    });
  }

  // Get current month spending
  const monthlySpending = await getCurrentMonthSpending(redis, teamId);

  // Check monthly limit
  if (budgetLimits.monthly) {
    const alertStatus = await checkBudgetThreshold(
      redis,
      teamId,
      monthlySpending,
      budgetLimits.monthly
    );

    if (alertStatus.shouldAlert) {
      await sendBudgetAlert(redis, teamId, alertStatus);
    }

    return {
      checked: true,
      monthlySpending,
      budgetLimit: budgetLimits.monthly,
      percentage: alertStatus.percentage,
      alertSent: alertStatus.shouldAlert,
      alertLevel: alertStatus.level,
    };
  }

  return {
    checked: true,
    monthlySpending,
    budgetLimit: null,
  };
}

/**
 * Get budget status for team
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @returns Budget status
 */
export async function getBudgetStatus(redis: Redis, teamId: string): Promise<BudgetStatus> {
  const budgetLimits = await getTeamBudgetLimit(redis, teamId);
  const monthlySpending = await getCurrentMonthSpending(redis, teamId);
  const alertHistory = await getBudgetAlertHistory(redis, teamId, 5);

  const status: BudgetStatus = {
    teamId,
    monthlySpending,
    budgetLimits,
    alertHistory,
  };

  if (budgetLimits && budgetLimits.monthly) {
    const percentage = monthlySpending / budgetLimits.monthly;
    status.percentage = (percentage * 100).toFixed(1);
    status.remaining = budgetLimits.monthly - monthlySpending;
    status.status =
      percentage >= 1.0
        ? 'exceeded'
        : percentage >= 0.95
          ? 'critical'
          : percentage >= 0.8
            ? 'warning'
            : 'ok';
  }

  return status;
}
