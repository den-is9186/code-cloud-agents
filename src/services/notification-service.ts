/**
 * Notification Service
 *
 * Handles notifications via multiple channels:
 * - Email (for approval requests, build completion)
 * - Webhooks (for build events)
 * - Slack/Discord (optional integration)
 */

import axios from 'axios';
import { URL } from 'url';
import type { Redis } from 'ioredis';
import { logger } from '../utils/logger';

/**
 * Notification types enum
 */
export const NotificationType = {
  BUILD_STARTED: 'build.started',
  BUILD_COMPLETED: 'build.completed',
  BUILD_FAILED: 'build.failed',
  APPROVAL_REQUIRED: 'approval.required',
  APPROVAL_APPROVED: 'approval.approved',
  APPROVAL_REJECTED: 'approval.rejected',
  AGENT_COMPLETED: 'agent.completed',
  AGENT_FAILED: 'agent.failed',
} as const;

export type NotificationTypeValue = (typeof NotificationType)[keyof typeof NotificationType];

/**
 * Notification channels enum
 */
export const NotificationChannel = {
  EMAIL: 'email',
  WEBHOOK: 'webhook',
  SLACK: 'slack',
  DISCORD: 'discord',
} as const;

export type NotificationChannelValue =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

/**
 * Notification data structure
 */
export interface Notification {
  type: NotificationTypeValue;
  teamId: string;
  teamName?: string;
  buildId?: string;
  status?: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Channel configuration structure
 */
export interface Channel {
  type: NotificationChannelValue;
  url?: string;
  email?: string;
}

/**
 * Webhook response structure
 */
export interface WebhookResponse {
  success: boolean;
  status?: number;
  data?: unknown;
  error?: string;
}

/**
 * Sanitize channel type to prevent log injection
 *
 * @param channelType - Channel type to sanitize
 * @returns Sanitized channel type
 */
function sanitizeChannelType(channelType: string): string {
  // Whitelist of allowed channel types
  const allowedTypes = ['email', 'webhook', 'slack', 'discord'];

  // If channel type is in the whitelist, return as-is
  if (allowedTypes.includes(channelType)) {
    return channelType;
  }

  // Otherwise, sanitize by removing special characters and limiting length
  const sanitized = String(channelType)
    .replace(/[^a-zA-Z0-9-_]/g, '')
    .substring(0, 20);

  return sanitized || 'unknown';
}

/**
 * Validate webhook URL to prevent SSRF attacks
 *
 * @param webhookUrl - URL to validate
 * @throws Error if URL is invalid or points to private network
 */
function validateWebhookUrl(webhookUrl: string): boolean {
  try {
    const url = new URL(webhookUrl);

    // Only allow http and https
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol - only HTTP and HTTPS are allowed');
    }

    // Block localhost and loopback
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('127.') ||
      hostname.startsWith('[::1]')
    ) {
      throw new Error('Localhost URLs are not allowed');
    }

    // Block private IP ranges (RFC 1918)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const match = hostname.match(ipv4Regex);
    if (match) {
      const numbers = match.map(Number);
      const a = numbers[1];
      const b = numbers[2];

      // Check for private IP ranges
      if (
        a !== undefined &&
        (a === 10 || // 10.0.0.0/8
          (a === 172 && b !== undefined && b >= 16 && b <= 31) || // 172.16.0.0/12
          (a === 192 && b === 168) || // 192.168.0.0/16
          (a === 169 && b === 254) || // 169.254.0.0/16 (link-local)
          a === 0 || // 0.0.0.0/8
          a >= 224) // Multicast and reserved
      ) {
        throw new Error('Private IP addresses are not allowed');
      }
    }

    // Block IPv6 private ranges
    if (hostname.includes(':')) {
      if (
        hostname.startsWith('fc') || // fc00::/7 (unique local)
        hostname.startsWith('fd') ||
        hostname.startsWith('fe80') || // fe80::/10 (link-local)
        hostname === '::1' // loopback
      ) {
        throw new Error('Private IPv6 addresses are not allowed');
      }
    }

    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid URL')) {
      throw new Error('Invalid webhook URL format');
    }
    throw error;
  }
}

/**
 * Send notification via webhook
 *
 * @param webhookUrl - Webhook URL
 * @param payload - Notification payload
 * @returns Response object
 */
export async function sendWebhook(webhookUrl: string, payload: unknown): Promise<WebhookResponse> {
  // Validate URL to prevent SSRF
  validateWebhookUrl(webhookUrl);

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Code-Cloud-Agents/1.0',
      },
      timeout: 10000, // 10 seconds
    });

    return {
      success: true,
      status: response.status,
      data: response.data,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      logger.error('Webhook delivery failed', {
        webhookUrl: webhookUrl.replace(/([?&]token=)[^&]*/, '$1***'),
        error: error.message,
        status: error.response?.status || null,
        statusText: error.response?.statusText,
      });
      return {
        success: false,
        error: error.message,
        status: error.response?.status || undefined,
      };
    }
    throw error;
  }
}

/**
 * Send Slack notification
 *
 * @param webhookUrl - Slack webhook URL
 * @param notification - Notification data
 * @returns Response object
 */
export async function sendSlackNotification(
  webhookUrl: string,
  notification: Notification
): Promise<WebhookResponse> {
  const { type, teamId, teamName, buildId, status, message } = notification;

  // Build Slack message
  const slackPayload: {
    text: string;
    blocks?: Array<{
      type: string;
      text?: { type: string; text: string; emoji?: boolean };
      fields?: Array<{ type: string; text: string }>;
    }>;
    attachments?: Array<{
      color: string;
      blocks: Array<{
        type: string;
        text?: { type: string; text: string; emoji?: boolean };
        fields?: Array<{ type: string; text: string }>;
      }>;
    }>;
  } = {
    text: message,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: getNotificationTitle(type),
          emoji: true,
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Team:*\n${teamName || teamId}`,
          },
          {
            type: 'mrkdwn',
            text: `*Status:*\n${status || 'N/A'}`,
          },
        ],
      },
    ],
  };

  // Add build ID if present
  if (buildId && slackPayload.blocks && slackPayload.blocks[1]) {
    slackPayload.blocks[1].fields?.push({
      type: 'mrkdwn',
      text: `*Build ID:*\n\`${buildId}\``,
    });
  }

  // Add color based on type
  const color = getNotificationColor(type);
  if (color && slackPayload.blocks) {
    slackPayload.attachments = [
      {
        color,
        blocks: slackPayload.blocks,
      },
    ];
    slackPayload.blocks = undefined;
  }

  return sendWebhook(webhookUrl, slackPayload);
}

/**
 * Send Discord notification
 *
 * @param webhookUrl - Discord webhook URL
 * @param notification - Notification data
 * @returns Response object
 */
export async function sendDiscordNotification(
  webhookUrl: string,
  notification: Notification
): Promise<WebhookResponse> {
  const { type, teamId, teamName, buildId, status, message } = notification;

  // Build Discord embed
  const discordPayload: {
    content: string;
    embeds: Array<{
      title: string;
      color: number;
      fields: Array<{ name: string; value: string; inline?: boolean }>;
      timestamp: string;
    }>;
  } = {
    content: message,
    embeds: [
      {
        title: getNotificationTitle(type),
        color: parseInt(getNotificationColor(type, true), 16),
        fields: [
          {
            name: 'Team',
            value: teamName || teamId,
            inline: true,
          },
          {
            name: 'Status',
            value: status || 'N/A',
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  // Add build ID if present
  if (buildId && discordPayload.embeds[0]) {
    discordPayload.embeds[0].fields.push({
      name: 'Build ID',
      value: `\`${buildId}\``,
      inline: false,
    });
  }

  return sendWebhook(webhookUrl, discordPayload);
}

/**
 * Send email notification (placeholder - requires email service setup)
 *
 * @param to - Recipient email
 * @param notification - Notification data
 * @returns Response object
 */
export async function sendEmailNotification(
  to: string,
  notification: Notification
): Promise<WebhookResponse> {
  // Email sending would require nodemailer or similar service
  // For now, return a placeholder response
  logger.info('Email notification (placeholder)', {
    to,
    subject: getNotificationTitle(notification.type),
    type: notification.type,
    teamId: notification.teamId,
  });

  return {
    success: true,
    data: {
      placeholder: true,
      message: 'Email service not configured',
    },
  };
}

/**
 * Send notification via specified channels
 *
 * @param redis - Redis client
 * @param notification - Notification data
 * @param channels - Notification channels
 * @returns Array of results
 */
export async function sendNotification(
  redis: Redis,
  notification: Notification,
  channels: Channel[] = []
): Promise<Array<WebhookResponse & { channel: string }>> {
  const results: Array<WebhookResponse & { channel: string }> = [];

  for (const channel of channels) {
    try {
      let result: WebhookResponse;

      switch (channel.type) {
        case NotificationChannel.WEBHOOK:
          result = await sendWebhook(channel.url!, {
            type: notification.type,
            timestamp: new Date().toISOString(),
            data: notification,
          });
          break;

        case NotificationChannel.SLACK:
          result = await sendSlackNotification(channel.url!, notification);
          break;

        case NotificationChannel.DISCORD:
          result = await sendDiscordNotification(channel.url!, notification);
          break;

        case NotificationChannel.EMAIL:
          result = await sendEmailNotification(channel.email!, notification);
          break;

        default:
          result = {
            success: false,
            error: `Unknown channel type: ${channel.type}`,
          };
      }

      results.push({
        channel: channel.type,
        ...result,
      });

      // Store notification in Redis
      await storeNotification(redis, notification, channel.type, result);
    } catch (error) {
      // Sanitize channel type to prevent log injection
      const sanitizedType = sanitizeChannelType(channel.type);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Failed to send notification', {
        channelType: sanitizedType,
        notificationType: notification.type,
        teamId: notification.teamId,
        error: errorMessage,
      });
      results.push({
        channel: channel.type,
        success: false,
        error: errorMessage,
      });
    }
  }

  return results;
}

/**
 * Store notification in Redis
 *
 * @param redis - Redis client
 * @param notification - Notification data
 * @param channel - Channel type
 * @param result - Delivery result
 */
async function storeNotification(
  redis: Redis,
  notification: Notification,
  channel: string,
  result: WebhookResponse
): Promise<void> {
  const notificationId = `notif:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
  const key = `notification:${notificationId}`;

  const record = {
    id: notificationId,
    type: notification.type,
    channel,
    teamId: notification.teamId,
    buildId: notification.buildId,
    message: notification.message,
    success: result.success,
    sentAt: new Date().toISOString(),
    response: JSON.stringify(result),
  };

  await redis.setex(key, 7 * 24 * 60 * 60, JSON.stringify(record)); // 7 days TTL

  // Add to team's notification list
  if (notification.teamId) {
    await redis.zadd(`team:${notification.teamId}:notifications`, Date.now(), notificationId);
  }
}

/**
 * Get notification title based on type
 *
 * @param type - Notification type
 * @returns Title string
 */
function getNotificationTitle(type: NotificationTypeValue): string {
  const titles: Record<NotificationTypeValue, string> = {
    [NotificationType.BUILD_STARTED]: '🚀 Build Started',
    [NotificationType.BUILD_COMPLETED]: '✅ Build Completed',
    [NotificationType.BUILD_FAILED]: '❌ Build Failed',
    [NotificationType.APPROVAL_REQUIRED]: '⏳ Approval Required',
    [NotificationType.APPROVAL_APPROVED]: '✅ Prototype Approved',
    [NotificationType.APPROVAL_REJECTED]: '❌ Prototype Rejected',
    [NotificationType.AGENT_COMPLETED]: '🤖 Agent Completed',
    [NotificationType.AGENT_FAILED]: '⚠️ Agent Failed',
  };
  return titles[type] || '📢 Notification';
}

/**
 * Get notification color based on type
 *
 * @param type - Notification type
 * @param hex - Return hex color for Discord
 * @returns Color string
 */
function getNotificationColor(type: NotificationTypeValue, hex: boolean = false): string {
  const colors: Record<NotificationTypeValue, { hex: string; slack: string }> = {
    [NotificationType.BUILD_STARTED]: { hex: '3B82F6', slack: '#3B82F6' },
    [NotificationType.BUILD_COMPLETED]: { hex: '22C55E', slack: 'good' },
    [NotificationType.BUILD_FAILED]: { hex: 'EF4444', slack: 'danger' },
    [NotificationType.APPROVAL_REQUIRED]: { hex: 'F59E0B', slack: 'warning' },
    [NotificationType.APPROVAL_APPROVED]: { hex: '22C55E', slack: 'good' },
    [NotificationType.APPROVAL_REJECTED]: { hex: 'EF4444', slack: 'danger' },
    [NotificationType.AGENT_COMPLETED]: { hex: '22C55E', slack: 'good' },
    [NotificationType.AGENT_FAILED]: { hex: 'F59E0B', slack: 'warning' },
  };

  const defaultColor = { hex: '6B7280', slack: '#6B7280' };
  const color = colors[type] || defaultColor;

  return hex ? color.hex : color.slack;
}

/**
 * Get team notification channels from Redis
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @returns Array of notification channels
 */
export async function getTeamNotificationChannels(
  redis: Redis,
  teamId: string
): Promise<Channel[]> {
  const teamKey = `team:${teamId}`;
  const teamData = await redis.get(teamKey);

  if (!teamData) {
    return [];
  }

  const team = JSON.parse(teamData) as { notificationChannels?: Channel[] };
  return team.notificationChannels || [];
}

/**
 * Update team notification channels
 *
 * @param redis - Redis client
 * @param teamId - Team ID
 * @param channels - Notification channels
 */
export async function updateTeamNotificationChannels(
  redis: Redis,
  teamId: string,
  channels: Channel[]
): Promise<void> {
  const teamKey = `team:${teamId}`;
  const teamData = await redis.get(teamKey);

  if (!teamData) {
    throw new Error(`Team ${teamId} not found`);
  }

  const team = JSON.parse(teamData) as {
    notificationChannels?: Channel[];
    updatedAt?: string;
  };
  team.notificationChannels = channels;
  team.updatedAt = new Date().toISOString();

  await redis.set(teamKey, JSON.stringify(team));
}
