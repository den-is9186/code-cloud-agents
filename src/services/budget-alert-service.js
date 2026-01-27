/**
 * Budget Alert Service
 *
 * Monitors team budgets and sends alerts when thresholds are exceeded:
 * - Alert at 80% budget reached
 * - Alert at 100% budget reached
 * - Monthly budget limits per team
 * - Integration with notification service
 */

const { logger } = require('../../dist/utils/logger');
const {
  sendNotification,
  NotificationType,
  getTeamNotificationChannels,
} = require('./notification-service');

/**
 * Budget threshold levels
 */
const BudgetThreshold = {
  WARNING: 0.8, // 80%
  CRITICAL: 0.95, // 95%
  EXCEEDED: 1.0, // 100%
};

/**
 * Check if team budget has reached any threshold
 *
 * @param {Object} redis - Redis client
 * @param {string} teamId - Team ID
 * @param {number} currentCost - Current cost for this period
 * @param {number} budgetLimit - Budget limit
 * @returns {Promise<Object>} Alert status and level
 */
async function checkBudgetThreshold(redis, teamId, currentCost, budgetLimit) {
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
  let level = null;

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

  if (shouldAlert) {
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
 * @param {Object} redis - Redis client
 * @param {string} teamId - Team ID
 * @param {Object} alertInfo - Alert information
 * @returns {Promise<Array>} Notification results
 */
async function sendBudgetAlert(redis, teamId, alertInfo) {
  const { level, percentage, currentCost, budgetLimit, remaining } = alertInfo;

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

  const team = JSON.parse(teamData);

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
  const currentCostFormatted = currentCost.toFixed(2);
  const budgetLimitFormatted = budgetLimit.toFixed(2);
  const remainingFormatted = remaining.toFixed(2);

  let message;
  let notificationType;

  if (level === 'exceeded') {
    message = `🚨 BUDGET EXCEEDED! Team "${team.name}" has spent $${currentCostFormatted} (${percentageFormatted}%) of $${budgetLimitFormatted} budget. Remaining: -$${Math.abs(remaining).toFixed(2)}`;
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
    currentCost,
    budgetLimit,
    remaining,
    timestamp: new Date().toISOString(),
  });

  return results;
}

/**
 * Store budget alert in history
 *
 * @param {Object} redis - Redis client
 * @param {string} teamId - Team ID
 * @param {Object} alertData - Alert data
 */
async function storeBudgetAlert(redis, teamId, alertData) {
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
 * @param {Object} redis - Redis client
 * @param {string} teamId - Team ID
 * @param {number} limit - Max number of alerts to return
 * @returns {Promise<Array>} Alert history
 */
async function getBudgetAlertHistory(redis, teamId, limit = 10) {
  // Get recent alert IDs
  const alertIds = await redis.zrevrange(`team:${teamId}:budget:alerts`, 0, limit - 1);

  const alerts = [];
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
 * @param {Object} redis - Redis client
 * @param {string} teamId - Team ID
 * @param {number} monthlyLimit - Monthly budget limit in USD
 * @param {number} buildLimit - Per-build budget limit in USD (optional)
 */
async function setTeamBudgetLimit(redis, teamId, monthlyLimit, buildLimit = null) {
  const teamKey = `team:${teamId}`;
  const teamData = await redis.get(teamKey);

  if (!teamData) {
    throw new Error(`Team ${teamId} not found`);
  }

  const team = JSON.parse(teamData);
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
 * @param {Object} redis - Redis client
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Budget limits
 */
async function getTeamBudgetLimit(redis, teamId) {
  const teamKey = `team:${teamId}`;
  const teamData = await redis.get(teamKey);

  if (!teamData) {
    return null;
  }

  const team = JSON.parse(teamData);
  return team.budgetLimits || null;
}

/**
 * Get current month's spending for team
 *
 * @param {Object} redis - Redis client
 * @param {string} teamId - Team ID
 * @returns {Promise<number>} Total cost for current month
 */
async function getCurrentMonthSpending(redis, teamId) {
  // Get current month start timestamp
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  // Get all builds for this team in current month
  const buildIds = await redis.zrangebyscore(
    `team:${teamId}:builds`,
    monthStart,
    '+inf'
  );

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
 * @param {Object} redis - Redis client
 * @param {string} teamId - Team ID
 * @param {number} buildCost - Cost of the completed build
 */
async function checkBudgetAfterBuild(redis, teamId, buildCost) {
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
 * @param {Object} redis - Redis client
 * @param {string} teamId - Team ID
 * @returns {Promise<Object>} Budget status
 */
async function getBudgetStatus(redis, teamId) {
  const budgetLimits = await getTeamBudgetLimit(redis, teamId);
  const monthlySpending = await getCurrentMonthSpending(redis, teamId);
  const alertHistory = await getBudgetAlertHistory(redis, teamId, 5);

  const status = {
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
      percentage >= 1.0 ? 'exceeded' : percentage >= 0.95 ? 'critical' : percentage >= 0.8 ? 'warning' : 'ok';
  }

  return status;
}

module.exports = {
  BudgetThreshold,
  checkBudgetThreshold,
  sendBudgetAlert,
  storeBudgetAlert,
  getBudgetAlertHistory,
  setTeamBudgetLimit,
  getTeamBudgetLimit,
  getCurrentMonthSpending,
  checkBudgetAfterBuild,
  getBudgetStatus,
};
