/**
 * Budget Alert Service Tests
 *
 * Tests for budget monitoring and alert system
 */

const Redis = require('ioredis');

// Mock dependencies - must be before require
jest.mock('ioredis');
jest.mock('../dist/services/notification-service', () => ({
  sendNotification: jest.fn(),
  getTeamNotificationChannels: jest.fn(),
  NotificationType: {
    BUILD_STARTED: 'build.started',
    BUILD_COMPLETED: 'build.completed',
    BUILD_FAILED: 'build.failed',
    APPROVAL_REQUIRED: 'approval.required',
    APPROVAL_APPROVED: 'approval.approved',
    APPROVAL_REJECTED: 'approval.rejected',
    AGENT_COMPLETED: 'agent.completed',
    AGENT_FAILED: 'agent.failed',
  },
}));

// Import after mocks are set up
const {
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
} = require('../dist/services/budget-alert-service');

// Import mocked module - must be after jest.mock
const notificationService = require('../dist/services/notification-service');
const { sendNotification, getTeamNotificationChannels } = notificationService;

describe('Budget Alert Service', () => {
  let redis;

  beforeEach(() => {
    jest.clearAllMocks();
    Redis.mockStore.clear();
    redis = new Redis();

    // Spy on Redis methods
    jest.spyOn(redis, 'get');
    jest.spyOn(redis, 'set');
    jest.spyOn(redis, 'setex');
    jest.spyOn(redis, 'zadd');
    jest.spyOn(redis, 'zrevrange');
    jest.spyOn(redis, 'zrangebyscore');
    jest.spyOn(redis, 'hgetall');
    jest.spyOn(redis, 'del');
  });

  describe('BudgetThreshold', () => {
    test('should have correct threshold values', () => {
      expect(BudgetThreshold.WARNING).toBe(0.8);
      expect(BudgetThreshold.CRITICAL).toBe(0.95);
      expect(BudgetThreshold.EXCEEDED).toBe(1.0);
    });
  });

  describe('checkBudgetThreshold', () => {
    test('should not alert when under warning threshold', async () => {
      const result = await checkBudgetThreshold(redis, 'team-123', 50, 100);

      expect(result.shouldAlert).toBe(false);
      expect(result.level).toBeNull();
      expect(result.percentage).toBe(0.5);
    });

    test('should alert at warning threshold (80%)', async () => {
      const result = await checkBudgetThreshold(redis, 'team-123', 80, 100);

      expect(result.shouldAlert).toBe(true);
      expect(result.level).toBe('warning');
      expect(result.percentage).toBe(0.8);
      expect(result.remaining).toBe(20);
    });

    test('should alert at critical threshold (95%)', async () => {
      const result = await checkBudgetThreshold(redis, 'team-123', 95, 100);

      expect(result.shouldAlert).toBe(true);
      expect(result.level).toBe('critical');
      expect(result.percentage).toBe(0.95);
    });

    test('should alert when budget exceeded (100%)', async () => {
      const result = await checkBudgetThreshold(redis, 'team-123', 100, 100);

      expect(result.shouldAlert).toBe(true);
      expect(result.level).toBe('exceeded');
      expect(result.percentage).toBe(1.0);
      expect(result.remaining).toBe(0);
    });

    test('should not alert twice for same level', async () => {
      // Store that warning was already sent
      Redis.mockStore.set('team:team-123:budget:last_alert', 'warning');

      const result = await checkBudgetThreshold(redis, 'team-123', 85, 100);

      expect(result.shouldAlert).toBe(false);
    });

    test('should alert when escalating from warning to critical', async () => {
      Redis.mockStore.set('team:team-123:budget:last_alert', 'warning');

      const result = await checkBudgetThreshold(redis, 'team-123', 96, 100);

      expect(result.shouldAlert).toBe(true);
      expect(result.level).toBe('critical');
    });

    test('should handle no budget limit', async () => {
      const result = await checkBudgetThreshold(redis, 'team-123', 50, 0);

      expect(result.shouldAlert).toBe(false);
      expect(result.level).toBeNull();
    });
  });

  describe('sendBudgetAlert', () => {
    beforeEach(() => {
      // Mock team data
      Redis.mockStore.set(
        'team:team-123',
        JSON.stringify({
          id: 'team-123',
          name: 'Test Team',
        })
      );

      // Mock notification channels
      getTeamNotificationChannels.mockResolvedValue([
        { type: 'webhook', url: 'https://example.com/hook' },
      ]);

      sendNotification.mockResolvedValue([{ success: true }]);
    });

    test('should send warning alert', async () => {
      const alertInfo = {
        level: 'warning',
        percentage: 0.8,
        currentCost: 80,
        budgetLimit: 100,
        remaining: 20,
      };

      const results = await sendBudgetAlert(redis, 'team-123', alertInfo);

      expect(sendNotification).toHaveBeenCalled();
      const notificationArgs = sendNotification.mock.calls[0][1];
      expect(notificationArgs.message).toContain('Budget Warning');
      expect(notificationArgs.message).toContain('80.0%');
      expect(results).toHaveLength(1);
    });

    test('should send critical alert', async () => {
      const alertInfo = {
        level: 'critical',
        percentage: 0.95,
        currentCost: 95,
        budgetLimit: 100,
        remaining: 5,
      };

      await sendBudgetAlert(redis, 'team-123', alertInfo);

      const notificationArgs = sendNotification.mock.calls[0][1];
      expect(notificationArgs.message).toContain('BUDGET CRITICAL');
      expect(notificationArgs.message).toContain('95.0%');
    });

    test('should send exceeded alert', async () => {
      const alertInfo = {
        level: 'exceeded',
        percentage: 1.05,
        currentCost: 105,
        budgetLimit: 100,
        remaining: -5,
      };

      await sendBudgetAlert(redis, 'team-123', alertInfo);

      const notificationArgs = sendNotification.mock.calls[0][1];
      expect(notificationArgs.message).toContain('BUDGET EXCEEDED');
      expect(notificationArgs.message).toContain('105.0%');
    });

    test('should handle missing team', async () => {
      const alertInfo = {
        level: 'warning',
        percentage: 0.8,
        currentCost: 80,
        budgetLimit: 100,
        remaining: 20,
      };

      const results = await sendBudgetAlert(redis, 'team-999', alertInfo);

      expect(results).toEqual([]);
      expect(sendNotification).not.toHaveBeenCalled();
    });

    test('should handle no notification channels', async () => {
      getTeamNotificationChannels.mockResolvedValue([]);

      const alertInfo = {
        level: 'warning',
        percentage: 0.8,
        currentCost: 80,
        budgetLimit: 100,
        remaining: 20,
      };

      const results = await sendBudgetAlert(redis, 'team-123', alertInfo);

      expect(results).toEqual([]);
      expect(sendNotification).not.toHaveBeenCalled();
    });
  });

  describe('setTeamBudgetLimit', () => {
    test('should set monthly budget limit', async () => {
      Redis.mockStore.set(
        'team:team-123',
        JSON.stringify({
          id: 'team-123',
          name: 'Test Team',
        })
      );

      const limits = await setTeamBudgetLimit(redis, 'team-123', 1000);

      expect(limits.monthly).toBe(1000);
      expect(limits.perBuild).toBeNull();
      expect(limits.updatedAt).toBeDefined();
    });

    test('should set both monthly and per-build limits', async () => {
      Redis.mockStore.set(
        'team:team-123',
        JSON.stringify({
          id: 'team-123',
          name: 'Test Team',
        })
      );

      const limits = await setTeamBudgetLimit(redis, 'team-123', 1000, 50);

      expect(limits.monthly).toBe(1000);
      expect(limits.perBuild).toBe(50);
    });

    test('should reset alert state when budget updated', async () => {
      Redis.mockStore.set(
        'team:team-123',
        JSON.stringify({
          id: 'team-123',
          name: 'Test Team',
        })
      );

      await setTeamBudgetLimit(redis, 'team-123', 1000);

      expect(redis.del).toHaveBeenCalledWith('team:team-123:budget:last_alert');
    });

    test('should throw error for non-existent team', async () => {
      await expect(setTeamBudgetLimit(redis, 'team-999', 1000)).rejects.toThrow(
        'Team team-999 not found'
      );
    });
  });

  describe('getTeamBudgetLimit', () => {
    test('should return budget limits', async () => {
      Redis.mockStore.set(
        'team:team-123',
        JSON.stringify({
          id: 'team-123',
          name: 'Test Team',
          budgetLimits: {
            monthly: 1000,
            perBuild: 50,
            updatedAt: '2026-01-26T00:00:00Z',
          },
        })
      );

      const limits = await getTeamBudgetLimit(redis, 'team-123');

      expect(limits.monthly).toBe(1000);
      expect(limits.perBuild).toBe(50);
    });

    test('should return null for team without limits', async () => {
      Redis.mockStore.set(
        'team:team-123',
        JSON.stringify({
          id: 'team-123',
          name: 'Test Team',
        })
      );

      const limits = await getTeamBudgetLimit(redis, 'team-123');

      expect(limits).toBeNull();
    });

    test('should return null for non-existent team', async () => {
      const limits = await getTeamBudgetLimit(redis, 'team-999');

      expect(limits).toBeNull();
    });
  });

  describe('getCurrentMonthSpending', () => {
    test('should calculate current month spending', async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      // Mock builds in current month
      redis.zrangebyscore.mockResolvedValue(['build-1', 'build-2']);

      // Mock build costs
      redis.hgetall
        .mockResolvedValueOnce({ totalCost: '50.00' })
        .mockResolvedValueOnce({ totalCost: '75.50' });

      const spending = await getCurrentMonthSpending(redis, 'team-123');

      expect(spending).toBe(125.5);
      expect(redis.zrangebyscore).toHaveBeenCalledWith(
        'team:team-123:builds',
        monthStart,
        '+inf'
      );
    });

    test('should handle no builds', async () => {
      redis.zrangebyscore.mockResolvedValue([]);

      const spending = await getCurrentMonthSpending(redis, 'team-123');

      expect(spending).toBe(0);
    });
  });

  describe('checkBudgetAfterBuild', () => {
    test('should check budget and send alert', async () => {
      // Mock budget limits
      Redis.mockStore.set(
        'team:team-123',
        JSON.stringify({
          id: 'team-123',
          name: 'Test Team',
          budgetLimits: {
            monthly: 100,
            perBuild: null,
          },
        })
      );

      // Mock current spending
      redis.zrangebyscore.mockResolvedValue(['build-1']);
      redis.hgetall.mockResolvedValue({ totalCost: '75.00' });

      // Mock notification channels
      getTeamNotificationChannels.mockResolvedValue([
        { type: 'webhook', url: 'https://example.com/hook' },
      ]);
      sendNotification.mockResolvedValue([{ success: true }]);

      const result = await checkBudgetAfterBuild(redis, 'team-123', 10);

      expect(result.checked).toBe(true);
      expect(result.monthlySpending).toBe(75);
      expect(result.budgetLimit).toBe(100);
      expect(result.percentage).toBeGreaterThan(0);
    });

    test('should handle no budget limits', async () => {
      Redis.mockStore.set(
        'team:team-123',
        JSON.stringify({
          id: 'team-123',
          name: 'Test Team',
        })
      );

      const result = await checkBudgetAfterBuild(redis, 'team-123', 10);

      expect(result.checked).toBe(false);
      expect(result.reason).toBe('No budget limits configured');
    });
  });

  describe('getBudgetStatus', () => {
    test('should return complete budget status', async () => {
      // Mock team with budget limits
      Redis.mockStore.set(
        'team:team-123',
        JSON.stringify({
          id: 'team-123',
          name: 'Test Team',
          budgetLimits: {
            monthly: 100,
            perBuild: 10,
          },
        })
      );

      // Mock spending
      redis.zrangebyscore.mockResolvedValue(['build-1']);
      redis.hgetall.mockResolvedValue({ totalCost: '80.00' });

      // Mock alert history
      redis.zrevrange.mockResolvedValue(['alert-1']);
      Redis.mockStore.set(
        'team:team-123:budget:alert:alert-1',
        JSON.stringify({
          level: 'warning',
          percentage: 0.8,
          timestamp: '2026-01-26T00:00:00Z',
        })
      );

      const status = await getBudgetStatus(redis, 'team-123');

      expect(status.teamId).toBe('team-123');
      expect(status.monthlySpending).toBe(80);
      expect(status.budgetLimits.monthly).toBe(100);
      expect(status.percentage).toBe('80.0');
      expect(status.remaining).toBe(20);
      expect(status.status).toBe('warning');
      expect(status.alertHistory).toHaveLength(1);
    });

    test('should handle exceeded budget', async () => {
      Redis.mockStore.set(
        'team:team-123',
        JSON.stringify({
          id: 'team-123',
          name: 'Test Team',
          budgetLimits: { monthly: 100 },
        })
      );

      redis.zrangebyscore.mockResolvedValue(['build-1']);
      redis.hgetall.mockResolvedValue({ totalCost: '105.00' });
      redis.zrevrange.mockResolvedValue([]);

      const status = await getBudgetStatus(redis, 'team-123');

      expect(status.status).toBe('exceeded');
      expect(status.percentage).toBe('105.0');
    });
  });

  describe('getBudgetAlertHistory', () => {
    test('should return alert history', async () => {
      redis.zrevrange.mockResolvedValue(['alert-1', 'alert-2']);

      Redis.mockStore.set(
        'team:team-123:budget:alert:alert-1',
        JSON.stringify({
          level: 'critical',
          percentage: 0.95,
          timestamp: '2026-01-26T12:00:00Z',
        })
      );

      Redis.mockStore.set(
        'team:team-123:budget:alert:alert-2',
        JSON.stringify({
          level: 'warning',
          percentage: 0.8,
          timestamp: '2026-01-26T10:00:00Z',
        })
      );

      const history = await getBudgetAlertHistory(redis, 'team-123', 10);

      expect(history).toHaveLength(2);
      expect(history[0].level).toBe('critical');
      expect(history[1].level).toBe('warning');
    });

    test('should handle no alerts', async () => {
      redis.zrevrange.mockResolvedValue([]);

      const history = await getBudgetAlertHistory(redis, 'team-123', 10);

      expect(history).toEqual([]);
    });

    test('should respect limit parameter', async () => {
      const history = await getBudgetAlertHistory(redis, 'team-123', 5);

      expect(redis.zrevrange).toHaveBeenCalledWith(
        'team:team-123:budget:alerts',
        0,
        4
      );
    });
  });
});
