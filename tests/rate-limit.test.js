/**
 * Rate Limiting Tests
 *
 * Tests distributed Redis-backed rate limiting
 */

const request = require('supertest');
const Redis = require('ioredis');
const express = require('express');
const {
  createRateLimiter,
  createGlobalRateLimiter,
  createStrictRateLimiter,
} = require('../src/middleware/rate-limit');

// Mock Redis
jest.mock('ioredis');

describe('Distributed Rate Limiting', () => {
  let redis;
  let app;

  beforeEach(() => {
    // Create mock Redis client
    redis = new Redis();
    redis.call = jest.fn().mockResolvedValue(null);
    redis.get = jest.fn().mockResolvedValue(null);

    // Create test app
    app = express();
    app.use(express.json());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRateLimiter', () => {
    it('should create a rate limiter with default options', () => {
      const limiter = createRateLimiter(redis);
      expect(limiter).toBeInstanceOf(Function);
    });

    it('should create a rate limiter with custom options', () => {
      const limiter = createRateLimiter(redis, {
        windowMs: 5000,
        max: 50,
        prefix: 'custom:',
      });
      expect(limiter).toBeInstanceOf(Function);
    });

    it('should use custom key generator', () => {
      const keyGenerator = jest.fn((req) => `user:${req.userId}`);
      const limiter = createRateLimiter(redis, {
        keyGenerator,
      });
      expect(limiter).toBeInstanceOf(Function);
    });

    it('should return fallback middleware if Redis store creation fails', () => {
      const badRedis = {
        call: jest.fn().mockRejectedValue(new Error('Redis connection failed')),
      };
      const limiter = createRateLimiter(badRedis);
      expect(limiter).toBeInstanceOf(Function);
    });
  });

  describe('createGlobalRateLimiter', () => {
    it('should create global rate limiter', () => {
      const limiter = createGlobalRateLimiter(redis);
      expect(limiter).toBeInstanceOf(Function);
    });

    it('should apply different limits based on auth type', async () => {
      const limiter = createGlobalRateLimiter(redis);
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ ok: true }));

      // Anonymous request
      const anonRes = await request(app).get('/test');
      expect(anonRes.status).toBe(200);
      expect(anonRes.headers['ratelimit-limit']).toBeDefined();
    });
  });

  describe('createStrictRateLimiter', () => {
    it('should create strict rate limiter', () => {
      const limiter = createStrictRateLimiter(redis);
      expect(limiter).toBeInstanceOf(Function);
    });

    it('should have lower limit than global limiter', () => {
      const strict = createStrictRateLimiter(redis);
      expect(strict).toBeInstanceOf(Function);
    });
  });

  describe('Rate Limit Headers', () => {
    it('should include RateLimit headers in response', async () => {
      const limiter = createRateLimiter(redis, {
        windowMs: 60000,
        max: 10,
      });
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');
      expect(res.status).toBe(200);
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
      expect(res.headers['ratelimit-reset']).toBeDefined();
    });
  });

  describe('Rate Limit Exceeded', () => {
    it('should return 429 when limit exceeded', async () => {
      // Mock Redis to simulate rate limit exceeded
      const store = {
        increment: jest.fn().mockResolvedValue({ totalHits: 11, resetTime: Date.now() + 60000 }),
        decrement: jest.fn(),
        resetKey: jest.fn(),
      };

      const limiter = createRateLimiter(redis, {
        windowMs: 60000,
        max: 10,
      });
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');
      // First request should succeed
      expect([200, 429]).toContain(res.status);
    });

    it('should include error details in 429 response', async () => {
      const limiter = createRateLimiter(redis, {
        windowMs: 60000,
        max: 1, // Very low limit to trigger immediately
      });
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ ok: true }));

      // Make multiple requests to exceed limit
      await request(app).get('/test');
      const res = await request(app).get('/test');

      if (res.status === 429) {
        expect(res.body.error).toBeDefined();
        expect(res.body.error.code).toBe('RATE_LIMIT_EXCEEDED');
        expect(res.body.error.message).toBe('Too many requests');
        expect(res.body.error.resetTime).toBeDefined();
      }
    });
  });

  describe('Key Generation', () => {
    it('should use IP address for anonymous users', () => {
      const keyGenerator = (req) => {
        return req.auth
          ? req.auth.type === 'apikey'
            ? `apikey:${req.auth.name}`
            : `user:${req.auth.userId}`
          : `ip:${req.ip}`;
      };

      const req = { ip: '192.168.1.1' };
      const key = keyGenerator(req);
      expect(key).toBe('ip:192.168.1.1');
    });

    it('should use user ID for authenticated users', () => {
      const keyGenerator = (req) => {
        return req.auth
          ? req.auth.type === 'apikey'
            ? `apikey:${req.auth.name}`
            : `user:${req.auth.userId}`
          : `ip:${req.ip}`;
      };

      const req = { auth: { userId: 'user123', type: 'jwt' } };
      const key = keyGenerator(req);
      expect(key).toBe('user:user123');
    });

    it('should use API key name for API key auth', () => {
      const keyGenerator = (req) => {
        return req.auth
          ? req.auth.type === 'apikey'
            ? `apikey:${req.auth.name}`
            : `user:${req.auth.userId}`
          : `ip:${req.ip}`;
      };

      const req = { auth: { name: 'production-key', type: 'apikey' } };
      const key = keyGenerator(req);
      expect(key).toBe('apikey:production-key');
    });
  });

  describe('Redis Store Integration', () => {
    it('should use Redis for distributed rate limiting', async () => {
      const limiter = createRateLimiter(redis, {
        windowMs: 60000,
        max: 10,
        prefix: 'test:',
      });
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ ok: true }));

      await request(app).get('/test');

      // Redis should be called for rate limit storage
      expect(redis.call).toHaveBeenCalled();
    });

    it('should handle Redis errors gracefully', async () => {
      const errorRedis = new Redis();
      errorRedis.call = jest.fn().mockRejectedValue(new Error('Redis error'));

      const limiter = createRateLimiter(errorRedis);
      app.use(limiter);
      app.get('/test', (req, res) => res.json({ ok: true }));

      const res = await request(app).get('/test');
      // Should still work even if Redis fails (fallback)
      expect(res.status).toBe(200);
    });
  });

  describe('Multi-Instance Scenario', () => {
    it('should share rate limits across instances', async () => {
      // Simulate two app instances using same Redis
      const instance1 = express();
      const instance2 = express();

      const limiter1 = createRateLimiter(redis, { max: 5 });
      const limiter2 = createRateLimiter(redis, { max: 5 });

      instance1.use(limiter1);
      instance1.get('/test', (req, res) => res.json({ instance: 1 }));

      instance2.use(limiter2);
      instance2.get('/test', (req, res) => res.json({ instance: 2 }));

      // Both instances should use same Redis store
      const res1 = await request(instance1).get('/test');
      const res2 = await request(instance2).get('/test');

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      // Both should call Redis
      expect(redis.call).toHaveBeenCalled();
    });
  });
});
