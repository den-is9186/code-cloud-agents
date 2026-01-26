/**
 * Distributed Rate Limiting Middleware
 *
 * Implements Redis-backed rate limiting for multi-instance deployments.
 * Falls back to in-memory rate limiting when Redis is unavailable.
 * Supports different limits for:
 * - Anonymous users (IP-based)
 * - Authenticated users
 * - API keys
 * - Per-team limits
 */

const { RedisStore } = require('rate-limit-redis');
const rateLimit = require('express-rate-limit');
const { logger } = require('../../dist/utils/logger');

// Import ip helper for IPv6 support
const { ip: ipKeyGenerator } = require('express-rate-limit');

/**
 * Create Redis-backed rate limiter
 *
 * @param {Object} redis - Redis client
 * @param {Object} options - Rate limit options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Max requests per window
 * @param {string} options.prefix - Redis key prefix
 * @param {Function} options.keyGenerator - Custom key generator
 * @returns {Function} Rate limit middleware
 */
function createRateLimiter(redis, options = {}) {
  const {
    windowMs = 60000, // 1 minute default
    max = 100,
    prefix = 'rate-limit:',
    keyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  let store;
  let usingFallback = false;

  // Check if redis client is valid and functional
  if (!redis || typeof redis.call !== 'function') {
    logger.warn('Redis client not available, switching to in-memory rate limiting', {
      prefix,
      windowMs,
      max: typeof max === 'function' ? 'dynamic' : max,
    });
    usingFallback = true;
    store = undefined; // Use default in-memory store
  } else {
    // Test if redis.call actually works before creating RedisStore
    try {
      // Try a simple call to see if Redis is actually functional
      // This prevents RedisStore from breaking during construction
      const testResult = redis.call('PING');
      // If testResult is a promise, it might fail later, but that's okay
      // If it throws immediately, we'll catch it here
      
      store = new RedisStore({
        // @ts-expect-error - rate-limit-redis types are outdated
        client: redis,
        prefix,
        sendCommand: (...args) => redis.call(...args),
      });
    } catch (error) {
      logger.error('Failed to create Redis store, switching to in-memory fallback', {
        error: error.message,
        stack: error.stack,
        prefix,
      });
      usingFallback = true;
      store = undefined; // Fall back to in-memory store
    }
  }

  try {
    const rateLimitConfig = {
      windowMs,
      max,
      standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
      legacyHeaders: false, // Disable `X-RateLimit-*` headers
      store,
      skipSuccessfulRequests,
      skipFailedRequests,
      handler: (req, res) => {
        const resetTime = new Date(req.rateLimit.resetTime).toISOString();
        logger.warn('Rate limit exceeded', {
          identifier: keyGenerator ? keyGenerator(req) : req.ip,
          limit: req.rateLimit.limit,
          current: req.rateLimit.current,
          resetTime,
          ip: req.ip,
          path: req.path,
          mode: usingFallback ? 'in-memory' : 'redis',
        });

        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            limit: req.rateLimit.limit,
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
    logger.error('Failed to create rate limiter, using minimal in-memory fallback', {
      error: error.message,
      stack: error.stack,
      prefix,
    });
    
    // Fallback: use in-memory rate limiter if rate limit creation fails
    const fallbackConfig = {
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      skipSuccessfulRequests,
      skipFailedRequests,
      handler: (req, res) => {
        const resetTime = new Date(req.rateLimit.resetTime).toISOString();
        logger.warn('Rate limit exceeded (in-memory mode)', {
          identifier: keyGenerator ? keyGenerator(req) : req.ip,
          limit: req.rateLimit.limit,
          current: req.rateLimit.current,
          resetTime,
          ip: req.ip,
          path: req.path,
        });

        res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests',
            limit: req.rateLimit.limit,
            resetTime,
          },
        });
      },
    };

    if (keyGenerator) {
      fallbackConfig.keyGenerator = keyGenerator;
    }

    return rateLimit(fallbackConfig);
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
 * @param {Object} redis - Redis client
 * @returns {Function} Rate limit middleware
 */
function createGlobalRateLimiter(redis) {
  return createRateLimiter(redis, {
    windowMs: 60000, // 1 minute
    max: (req) => {
      // Determine limit based on auth type
      if (req.auth) {
        if (req.auth.type === 'apikey') {
          return 1000; // API keys: 1000 req/min
        }
        return 100; // Authenticated users: 100 req/min
      }
      return 10; // Anonymous: 10 req/min
    },
    prefix: 'rate-limit:global:',
    keyGenerator: (req) => {
      if (req.auth) {
        return req.auth.type === 'apikey'
          ? `apikey:${req.auth.name}`
          : `user:${req.auth.userId}`;
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
 * @param {Object} redis - Redis client
 * @returns {Function} Rate limit middleware
 */
function createTeamRateLimiter(redis) {
  return createRateLimiter(redis, {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: async (req) => {
      // Get team's custom rate limit from Redis
      if (!req.team) {
        return 1000; // Default limit
      }

      try {
        const teamKey = `team:${req.team.id}`;
        const teamData = await redis.get(teamKey);
        if (teamData) {
          const team = JSON.parse(teamData);
          return team.rateLimit || 1000;
        }
      } catch (error) {
        logger.error('Failed to get team rate limit', {
          teamId: req.team.id,
          error: error.message,
        });
      }

      return 1000; // Default fallback
    },
    prefix: 'rate-limit:team:',
    keyGenerator: (req) => {
      return req.team ? `team:${req.team.id}` : ipKeyGenerator(req);
    },
  });
}

/**
 * Strict rate limiter for sensitive endpoints
 *
 * Used for authentication, registration, password reset, etc.
 * Limit: 5 requests per 15 minutes per IP
 *
 * @param {Object} redis - Redis client
 * @returns {Function} Rate limit middleware
 */
function createStrictRateLimiter(redis) {
  return createRateLimiter(redis, {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    prefix: 'rate-limit:strict:',
    keyGenerator: (req) => ipKeyGenerator(req),
    skipSuccessfulRequests: true, // Only count failed attempts
  });
}

/**
 * Build rate limiter
 *
 * Limits build creation per team.
 * Limit: 100 builds per hour per team
 *
 * @param {Object} redis - Redis client
 * @returns {Function} Rate limit middleware
 */
function createBuildRateLimiter(redis) {
  return createRateLimiter(redis, {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    prefix: 'rate-limit:build:',
    keyGenerator: (req) => {
      return req.team ? `team:${req.team.id}` : ipKeyGenerator(req);
    },
  });
}

module.exports = {
  createRateLimiter,
  createGlobalRateLimiter,
  createTeamRateLimiter,
  createStrictRateLimiter,
  createBuildRateLimiter,
};
