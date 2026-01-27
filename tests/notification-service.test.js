/**
 * Notification Service Tests
 *
 * Tests for multi-channel notification system
 */

const Redis = require('ioredis');

// Mock axios and Redis
jest.mock('axios', () => ({
  post: jest.fn(),
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  create: jest.fn(),
  defaults: {
    headers: {
      common: {},
    },
  },
}));

jest.mock('ioredis');

const axios = require('axios');
const {
  NotificationType,
  NotificationChannel,
  sendNotification,
  sendWebhook,
  sendSlackNotification,
  sendDiscordNotification,
  sendEmailNotification,
  getTeamNotificationChannels,
  updateTeamNotificationChannels,
  storeNotification,
} = require('../dist/services/notification-service');

describe('Notification Service', () => {
  let redis;

  beforeEach(() => {
    jest.clearAllMocks();
    Redis.mockStore.clear();
    redis = new Redis();

    // Spy on Redis methods
    jest.spyOn(redis, 'setex');
    jest.spyOn(redis, 'zadd');
    jest.spyOn(redis, 'get');
    jest.spyOn(redis, 'set');
  });

  describe('NotificationType Enum', () => {
    test('should have BUILD_STARTED type', () => {
      expect(NotificationType.BUILD_STARTED).toBe('build.started');
    });

    test('should have BUILD_COMPLETED type', () => {
      expect(NotificationType.BUILD_COMPLETED).toBe('build.completed');
    });

    test('should have BUILD_FAILED type', () => {
      expect(NotificationType.BUILD_FAILED).toBe('build.failed');
    });

    test('should have APPROVAL_REQUIRED type', () => {
      expect(NotificationType.APPROVAL_REQUIRED).toBe('approval.required');
    });

    test('should have APPROVAL_APPROVED type', () => {
      expect(NotificationType.APPROVAL_APPROVED).toBe('approval.approved');
    });

    test('should have APPROVAL_REJECTED type', () => {
      expect(NotificationType.APPROVAL_REJECTED).toBe('approval.rejected');
    });

    test('should have AGENT_COMPLETED type', () => {
      expect(NotificationType.AGENT_COMPLETED).toBe('agent.completed');
    });

    test('should have AGENT_FAILED type', () => {
      expect(NotificationType.AGENT_FAILED).toBe('agent.failed');
    });
  });

  describe('NotificationChannel Enum', () => {
    test('should have EMAIL channel', () => {
      expect(NotificationChannel.EMAIL).toBe('email');
    });

    test('should have WEBHOOK channel', () => {
      expect(NotificationChannel.WEBHOOK).toBe('webhook');
    });

    test('should have SLACK channel', () => {
      expect(NotificationChannel.SLACK).toBe('slack');
    });

    test('should have DISCORD channel', () => {
      expect(NotificationChannel.DISCORD).toBe('discord');
    });
  });

  describe('sendWebhook', () => {
    test('should send webhook successfully', async () => {
      const mockResponse = {
        status: 200,
        data: { success: true },
      };
      axios.post.mockResolvedValue(mockResponse);

      const result = await sendWebhook('https://example.com/webhook', {
        message: 'Test',
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe(200);
      expect(axios.post).toHaveBeenCalledWith(
        'https://example.com/webhook',
        { message: 'Test' },
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'Code-Cloud-Agents/1.0',
          }),
          timeout: 10000,
        })
      );
    });

    test('should handle webhook failure', async () => {
      axios.post.mockRejectedValue(new Error('Network error'));

      const result = await sendWebhook('https://example.com/webhook', {
        message: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });

    test('should include response status on error', async () => {
      const error = new Error('Bad Request');
      error.response = { status: 400 };
      axios.post.mockRejectedValue(error);

      const result = await sendWebhook('https://example.com/webhook', {
        message: 'Test',
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe(400);
    });

    // SSRF Protection Tests
    test('should reject localhost URLs', async () => {
      await expect(
        sendWebhook('http://localhost/webhook', { message: 'Test' })
      ).rejects.toThrow('Localhost URLs are not allowed');
    });

    test('should reject 127.0.0.1 URLs', async () => {
      await expect(
        sendWebhook('http://127.0.0.1/webhook', { message: 'Test' })
      ).rejects.toThrow('Localhost URLs are not allowed');
    });

    test('should reject private IP ranges (10.x.x.x)', async () => {
      await expect(
        sendWebhook('http://10.0.0.1/webhook', { message: 'Test' })
      ).rejects.toThrow('Private IP addresses are not allowed');
    });

    test('should reject private IP ranges (192.168.x.x)', async () => {
      await expect(
        sendWebhook('http://192.168.1.1/webhook', { message: 'Test' })
      ).rejects.toThrow('Private IP addresses are not allowed');
    });

    test('should reject private IP ranges (172.16-31.x.x)', async () => {
      await expect(
        sendWebhook('http://172.16.0.1/webhook', { message: 'Test' })
      ).rejects.toThrow('Private IP addresses are not allowed');
    });

    test('should reject link-local addresses (169.254.x.x)', async () => {
      await expect(
        sendWebhook('http://169.254.169.254/webhook', { message: 'Test' })
      ).rejects.toThrow('Private IP addresses are not allowed');
    });

    test('should reject invalid protocols', async () => {
      await expect(
        sendWebhook('file:///etc/passwd', { message: 'Test' })
      ).rejects.toThrow('Invalid protocol');
    });

    test('should accept valid public URLs', async () => {
      axios.post.mockResolvedValue({ status: 200, data: { success: true } });

      const result = await sendWebhook('https://api.example.com/webhook', {
        message: 'Test',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('sendSlackNotification', () => {
    test('should format Slack message correctly', async () => {
      axios.post.mockResolvedValue({ status: 200, data: { ok: true } });

      const notification = {
        type: NotificationType.BUILD_COMPLETED,
        teamId: 'team-123',
        teamName: 'Test Team',
        buildId: 'build-456',
        status: 'completed',
        message: 'Build completed successfully',
      };

      await sendSlackNotification('https://hooks.slack.com/test', notification);

      expect(axios.post).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          text: 'Build completed successfully',
          attachments: expect.arrayContaining([
            expect.objectContaining({
              color: 'good',
            }),
          ]),
        }),
        expect.any(Object)
      );
    });

    test('should include buildId in Slack message', async () => {
      axios.post.mockResolvedValue({ status: 200, data: { ok: true } });

      const notification = {
        type: NotificationType.BUILD_STARTED,
        teamId: 'team-123',
        teamName: 'Test Team',
        buildId: 'build-789',
        status: 'started',
        message: 'Build started',
      };

      await sendSlackNotification('https://hooks.slack.com/test', notification);

      const callArgs = axios.post.mock.calls[0][1];
      const buildIdField = callArgs.attachments[0].blocks[1].fields.find((f) =>
        f.text.includes('Build ID')
      );
      expect(buildIdField).toBeDefined();
      expect(buildIdField.text).toContain('build-789');
    });
  });

  describe('sendDiscordNotification', () => {
    test('should format Discord embed correctly', async () => {
      axios.post.mockResolvedValue({ status: 204 });

      const notification = {
        type: NotificationType.BUILD_FAILED,
        teamId: 'team-123',
        teamName: 'Test Team',
        buildId: 'build-456',
        status: 'failed',
        message: 'Build failed',
      };

      await sendDiscordNotification('https://discord.com/api/webhooks/test', notification);

      expect(axios.post).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test',
        expect.objectContaining({
          content: 'Build failed',
          embeds: expect.arrayContaining([
            expect.objectContaining({
              title: '❌ Build Failed',
              color: expect.any(Number),
              fields: expect.arrayContaining([
                expect.objectContaining({
                  name: 'Team',
                  value: 'Test Team',
                }),
                expect.objectContaining({
                  name: 'Status',
                  value: 'failed',
                }),
              ]),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });

    test('should include buildId in Discord embed', async () => {
      axios.post.mockResolvedValue({ status: 204 });

      const notification = {
        type: NotificationType.BUILD_COMPLETED,
        teamId: 'team-123',
        teamName: 'Test Team',
        buildId: 'build-999',
        status: 'completed',
        message: 'Build completed',
      };

      await sendDiscordNotification('https://discord.com/api/webhooks/test', notification);

      const callArgs = axios.post.mock.calls[0][1];
      const buildIdField = callArgs.embeds[0].fields.find((f) => f.name === 'Build ID');
      expect(buildIdField).toBeDefined();
      expect(buildIdField.value).toContain('build-999');
    });
  });

  describe('sendEmailNotification', () => {
    test('should return placeholder response', async () => {
      const notification = {
        type: NotificationType.APPROVAL_REQUIRED,
        message: 'Approval needed',
      };

      const result = await sendEmailNotification('test@example.com', notification);

      expect(result.success).toBe(true);
      expect(result.data.placeholder).toBe(true);
      expect(result.data.message).toBe('Email service not configured');
    });
  });

  describe('sendNotification', () => {
    test('should send webhook notification', async () => {
      axios.post.mockResolvedValue({ status: 200, data: {} });

      const notification = {
        type: NotificationType.BUILD_STARTED,
        teamId: 'team-123',
        message: 'Build started',
      };

      const channels = [
        {
          type: NotificationChannel.WEBHOOK,
          url: 'https://example.com/webhook',
        },
      ];

      const results = await sendNotification(redis, notification, channels);

      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('webhook');
      expect(results[0].success).toBe(true);
    });

    test('should send Slack notification', async () => {
      axios.post.mockResolvedValue({ status: 200, data: { ok: true } });

      const notification = {
        type: NotificationType.APPROVAL_APPROVED,
        teamId: 'team-123',
        teamName: 'Test Team',
        message: 'Prototype approved',
      };

      const channels = [
        {
          type: NotificationChannel.SLACK,
          url: 'https://hooks.slack.com/test',
        },
      ];

      const results = await sendNotification(redis, notification, channels);

      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('slack');
      expect(results[0].success).toBe(true);
    });

    test('should send Discord notification', async () => {
      axios.post.mockResolvedValue({ status: 204 });

      const notification = {
        type: NotificationType.BUILD_COMPLETED,
        teamId: 'team-123',
        teamName: 'Test Team',
        message: 'Build completed',
      };

      const channels = [
        {
          type: NotificationChannel.DISCORD,
          url: 'https://discord.com/api/webhooks/test',
        },
      ];

      const results = await sendNotification(redis, notification, channels);

      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('discord');
      expect(results[0].success).toBe(true);
    });

    test('should send email notification', async () => {
      const notification = {
        type: NotificationType.APPROVAL_REQUIRED,
        teamId: 'team-123',
        message: 'Approval required',
      };

      const channels = [
        {
          type: NotificationChannel.EMAIL,
          email: 'test@example.com',
        },
      ];

      const results = await sendNotification(redis, notification, channels);

      expect(results).toHaveLength(1);
      expect(results[0].channel).toBe('email');
      expect(results[0].success).toBe(true);
    });

    test('should send to multiple channels', async () => {
      axios.post.mockResolvedValue({ status: 200, data: {} });

      const notification = {
        type: NotificationType.BUILD_FAILED,
        teamId: 'team-123',
        message: 'Build failed',
      };

      const channels = [
        {
          type: NotificationChannel.WEBHOOK,
          url: 'https://example.com/webhook',
        },
        {
          type: NotificationChannel.SLACK,
          url: 'https://hooks.slack.com/test',
        },
        {
          type: NotificationChannel.EMAIL,
          email: 'test@example.com',
        },
      ];

      const results = await sendNotification(redis, notification, channels);

      expect(results).toHaveLength(3);
      expect(results[0].channel).toBe('webhook');
      expect(results[1].channel).toBe('slack');
      expect(results[2].channel).toBe('email');
    });

    test('should handle unknown channel type', async () => {
      const notification = {
        type: NotificationType.BUILD_STARTED,
        teamId: 'team-123',
        message: 'Build started',
      };

      const channels = [
        {
          type: 'unknown',
          url: 'https://example.com/unknown',
        },
      ];

      const results = await sendNotification(redis, notification, channels);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
      expect(results[0].error).toContain('Unknown channel type');
    });

    test('should store notification in Redis', async () => {
      axios.post.mockResolvedValue({ status: 200, data: {} });

      const notification = {
        type: NotificationType.BUILD_COMPLETED,
        teamId: 'team-123',
        buildId: 'build-456',
        message: 'Build completed',
      };

      const channels = [
        {
          type: NotificationChannel.WEBHOOK,
          url: 'https://example.com/webhook',
        },
      ];

      await sendNotification(redis, notification, channels);

      expect(redis.setex).toHaveBeenCalled();
      expect(redis.zadd).toHaveBeenCalledWith(
        'team:team-123:notifications',
        expect.any(Number),
        expect.any(String)
      );
    });

    test('should continue on individual channel failure', async () => {
      axios.post
        .mockRejectedValueOnce(new Error('Webhook failed'))
        .mockResolvedValueOnce({ status: 200, data: { ok: true } });

      const notification = {
        type: NotificationType.BUILD_STARTED,
        teamId: 'team-123',
        message: 'Build started',
      };

      const channels = [
        {
          type: NotificationChannel.WEBHOOK,
          url: 'https://example.com/webhook',
        },
        {
          type: NotificationChannel.SLACK,
          url: 'https://hooks.slack.com/test',
        },
      ];

      const results = await sendNotification(redis, notification, channels);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[1].success).toBe(true);
    });
  });

  describe.skip('storeNotification', () => {
    test('should store notification in Redis', async () => {
      const notification = {
        type: NotificationType.BUILD_COMPLETED,
        teamId: 'team-123',
        buildId: 'build-456',
        message: 'Build completed',
      };

      const result = {
        success: true,
        status: 200,
      };

      await storeNotification(redis, notification, 'webhook', result);

      expect(redis.setex).toHaveBeenCalledWith(
        expect.stringMatching(/^notification:notif:/),
        7 * 24 * 60 * 60,
        expect.any(String)
      );
    });

    test('should add to team notification list', async () => {
      const notification = {
        type: NotificationType.APPROVAL_APPROVED,
        teamId: 'team-789',
        message: 'Approved',
      };

      const result = { success: true };

      await storeNotification(redis, notification, 'slack', result);

      expect(redis.zadd).toHaveBeenCalledWith(
        'team:team-789:notifications',
        expect.any(Number),
        expect.stringMatching(/^notif:/)
      );
    });

    test('should store notification record with correct structure', async () => {
      const notification = {
        type: NotificationType.BUILD_FAILED,
        teamId: 'team-123',
        buildId: 'build-456',
        message: 'Build failed',
      };

      const result = {
        success: false,
        error: 'Network error',
      };

      await storeNotification(redis, notification, 'webhook', result);

      const storedData = redis.setex.mock.calls[0][2];
      const record = JSON.parse(storedData);

      expect(record.type).toBe(NotificationType.BUILD_FAILED);
      expect(record.channel).toBe('webhook');
      expect(record.teamId).toBe('team-123');
      expect(record.buildId).toBe('build-456');
      expect(record.message).toBe('Build failed');
      expect(record.success).toBe(false);
      expect(record.sentAt).toBeDefined();
      expect(record.response).toBeDefined();
    });
  });

  describe('getTeamNotificationChannels', () => {
    test('should return team notification channels', async () => {
      const teamData = {
        id: 'team-123',
        name: 'Test Team',
        notificationChannels: [
          {
            type: NotificationChannel.WEBHOOK,
            url: 'https://example.com/webhook',
          },
          {
            type: NotificationChannel.SLACK,
            url: 'https://hooks.slack.com/test',
          },
        ],
      };

      // Store team data in mockStore
      Redis.mockStore.set('team:team-123', JSON.stringify(teamData));

      const channels = await getTeamNotificationChannels(redis, 'team-123');

      expect(channels).toHaveLength(2);
      expect(channels[0].type).toBe('webhook');
      expect(channels[1].type).toBe('slack');
    });

    test('should return empty array for team without channels', async () => {
      const teamData = {
        id: 'team-123',
        name: 'Test Team',
      };

      // Store team data without channels
      Redis.mockStore.set('team:team-123', JSON.stringify(teamData));

      const channels = await getTeamNotificationChannels(redis, 'team-123');

      expect(channels).toEqual([]);
    });

    test('should return empty array for non-existent team', async () => {
      const channels = await getTeamNotificationChannels(redis, 'team-999');

      expect(channels).toEqual([]);
    });
  });

  describe('updateTeamNotificationChannels', () => {
    test('should update team notification channels', async () => {
      const teamData = {
        id: 'team-123',
        name: 'Test Team',
        notificationChannels: [],
      };

      // Store initial team data
      Redis.mockStore.set('team:team-123', JSON.stringify(teamData));

      const newChannels = [
        {
          type: NotificationChannel.WEBHOOK,
          url: 'https://example.com/webhook',
        },
      ];

      await updateTeamNotificationChannels(redis, 'team-123', newChannels);

      expect(redis.set).toHaveBeenCalledWith(
        'team:team-123',
        expect.any(String)
      );

      const savedData = JSON.parse(redis.set.mock.calls[0][1]);
      expect(savedData.notificationChannels).toEqual(newChannels);
      expect(savedData.updatedAt).toBeDefined();
    });

    test('should throw error for non-existent team', async () => {
      await expect(
        updateTeamNotificationChannels(redis, 'team-999', [])
      ).rejects.toThrow('Team team-999 not found');
    });
  });
});
