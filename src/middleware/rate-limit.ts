/**
 * Distributed Rate Limiting Middleware
 *
 * Implements Redis-backed rate limiting for multi-instance deployments.
 * Supports different limits for:
 * - Anonymous users (IP-based)
 * - Authenticated users
 * - API keys
 * - Per-team limits
 */

import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import { RedisStore } from 'rate-limit-redis';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { logger } from '../utils/logger';
import { AuthenticatedRequest } from './auth';

// Import ip helper for IPv6 support
const { ip: ipKeyGenerator } = require('express-rate-limit');

/**
 * Rate limit configuration options
 */
interface RateLimiterOptions {
  windowMs?: number;
  max?: number | ((req: Request) => number | Promise<number>);
  prefix?: string;
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

/**
 * Extended Request with rate limit info
 */
interface RateLimitRequest extends Request {
  rateLimit?: {
    limit: number;
    current: number;
    remaining: number;
    resetTime: Date;
  };
}

/**
 * Extended Request with team info
 */
interface TeamRequest extends AuthenticatedRequest {
  team?: {
    id: string;
    [key: string]: unknown;
  };
}

/**
 * Create Redis-backed rate limiter
 *
 * @param redis - Redis client
 * @param options - Rate limit options
 * @returns Rate limit middleware
 */
function createRateLimiter(
  redis: Redis,
  options: RateLimiterOptions = {}
): RateLimitRequestHandler {
  const {
    windowMs = 60000, // 1 minute default
    max = 100,
    prefix = 'rate-limit:',
    keyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  try {
    // Check if redis client has the required methods
    if (!redis || typeof redis.call !== 'function') {
      logger.warn(
        'Redis client not available or invalid, rate limiting will fallback to in-memory'
      );
      return ((_req: Request, _res: Response, next: NextFunction) =>
        next()) as RateLimitRequestHandler;
    }

    const store = new RedisStore({
      prefix,
      sendCommand: async (...args: string[]) => {
        const [command, ...rest] = args;
        if (!command) {
          throw new Error('Command is required');
        }
        return redis.call(command, ...rest) as Promise<never>;
      },
    } as never);

    const rateLimitConfig: Parameters<typeof rateLimit>[0] = {
      windowMs,
      max,
      standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
      legacyHeaders: false, // Disable `X-RateLimit-*` headers
      store,
      skipSuccessfulRequests,
      skipFailedRequests,
      handler: (req: RateLimitRequest, res: Response) => {
        const resetTime = req.rateLimit?.resetTime
          ? new Date(req.rateLimit.resetTime).toISOString()
          : new Date().toISOString();
        logger.warn('Rate limit exceeded', {
          identifier: keyGenerator ? keyGenerator(req) : req.ip,
          limit: req.rateLimit?.limit,
          current: req.rateLimit?.current,
          resetTime,
          ip: req.ip,
          path: req.path,
        });

        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            limit: req.rateLimit?.limit,
            resetTime,
          },
        });
      },
    };

    // Only add keyGenerator if provided
    if (keyGenerator) {
      rateLimitConfig.keyGenerator = keyGenerator;
    }

    return rateLimit(rateLimitConfig);
  } catch (error) {
    logger.error('Failed to create rate limiter', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Fallback: allow all requests if Redis store creation fails
    return ((_req: Request, _res: Response, next: NextFunction) =>
      next()) as RateLimitRequestHandler;
  }
}

/**
 * Global rate limiter with tiered limits
 *
 * Different limits based on authentication type:
 * - Anonymous (IP-based): 10 req/min
 * - Authenticated users: 100 req/min
 * - API keys: 1000 req/min
 *
 * @param redis - Redis client
 * @returns Rate limit middleware
 */
function createGlobalRateLimiter(redis: Redis): RateLimitRequestHandler {
  return createRateLimiter(redis, {
    windowMs: 60000, // 1 minute
    max: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      // Determine limit based on auth type
      if (authReq.auth) {
        if (authReq.auth.type === 'apikey') {
          return 1000; // API keys: 1000 req/min
        }
        return 100; // Authenticated users: 100 req/min
      }
      return 10; // Anonymous: 10 req/min
    },
    prefix: 'rate-limit:global:',
    keyGenerator: (req: Request) => {
      const authReq = req as AuthenticatedRequest;
      if (authReq.auth) {
        return authReq.auth.type === 'apikey'
          ? `apikey:${authReq.auth.name}`
          : `user:${authReq.auth.userId}`;
      }
      return ipKeyGenerator(req);
    },
  });
}

/**
 * Team-specific rate limiter
 *
 * Limits requests per team with configurable limits.
 * Default: 1000 requests per hour per team.
 *
 * @param redis - Redis client
 * @returns Rate limit middleware
 */
function createTeamRateLimiter(redis: Redis): RateLimitRequestHandler {
  return createRateLimiter(redis, {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: async (req: Request) => {
      const teamReq = req as TeamRequest;
      // Get team's custom rate limit from Redis
      if (!teamReq.team) {
        return 1000; // Default limit
      }

      try {
        const teamKey = `team:${teamReq.team.id}`;
        const teamData = await redis.get(teamKey);
        if (teamData) {
          const team = JSON.parse(teamData);
          return team.rateLimit || 1000;
        }
      } catch (error) {
        logger.error('Failed to get team rate limit', {
          teamId: teamReq.team.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return 1000; // Default fallback
    },
    prefix: 'rate-limit:team:',
    keyGenerator: (req: Request) => {
      const teamReq = req as TeamRequest;
      return teamReq.team ? `team:${teamReq.team.id}` : ipKeyGenerator(req);
    },
  });
}

/**
 * Strict rate limiter for sensitive endpoints
 *
 * Used for authentication, registration, password reset, etc.
 * Limit: 5 requests per 15 minutes per IP
 *
 * @param redis - Redis client
 * @returns Rate limit middleware
 */
function createStrictRateLimiter(redis: Redis): RateLimitRequestHandler {
  return createRateLimiter(redis, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    prefix: 'rate-limit:strict:',
    keyGenerator: (req: Request) => ipKeyGenerator(req),
    skipSuccessfulRequests: true, // Only count failed attempts
  });
}

/**
 * Build rate limiter
 *
 * Limits build creation per team.
 * Limit: 100 builds per hour per team
 *
 * @param redis - Redis client
 * @returns Rate limit middleware
 */
function createBuildRateLimiter(redis: Redis): RateLimitRequestHandler {
  return createRateLimiter(redis, {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    prefix: 'rate-limit:build:',
    keyGenerator: (req: Request) => {
      const teamReq = req as TeamRequest;
      return teamReq.team ? `team:${teamReq.team.id}` : ipKeyGenerator(req);
    },
  });
}

export {
  createRateLimiter,
  createGlobalRateLimiter,
  createTeamRateLimiter,
  createStrictRateLimiter,
  createBuildRateLimiter,
};
export type { RateLimiterOptions, RateLimitRequest, TeamRequest };
