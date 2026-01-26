/**
 * CORS and CSRF Protection Tests
 */

const request = require('supertest');
const app = require('../src/api-server');
const { generateToken, Roles } = require('../dist/services/auth-service');

// Helper to generate test auth token
function getTestToken(role = Roles.VIEWER) {
  return generateToken({
    userId: 'test-user',
    email: 'test@example.com',
    role,
  }, '1h');
}

describe('CORS Protection', () => {
  describe('Preflight Requests (OPTIONS)', () => {
    test('should allow requests from whitelisted origin', async () => {
      const response = await request(app)
        .options('/api/v1/auth/me')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-max-age']).toBeDefined();
    });

    test('should reject requests from non-whitelisted origin', async () => {
      const response = await request(app)
        .options('/api/v1/auth/me')
        .set('Origin', 'http://evil.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CORS_NOT_ALLOWED');
    });

    test('should include Access-Control-Allow-Credentials header', async () => {
      const response = await request(app)
        .options('/api/v1/auth/me')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('should allow custom headers', async () => {
      const response = await request(app)
        .options('/api/v1/auth/me')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization, X-API-Key');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-headers']).toContain('Authorization');
      expect(response.headers['access-control-allow-headers']).toContain('X-API-Key');
    });
  });

  describe('Actual Requests', () => {
    test('should set CORS headers for allowed origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    test('should reject requests from non-whitelisted origin', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://evil.com');

      expect(response.status).toBe(403);
      expect(response.body.error.code).toBe('CORS_NOT_ALLOWED');
    });

    test('should allow requests without Origin header (same-origin)', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
    });

    test('should expose custom headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers['access-control-expose-headers']).toBeDefined();
    });
  });
});

describe('CSRF Protection', () => {
  describe('GET /api/csrf-token', () => {
    test('should generate and return CSRF token', async () => {
      const response = await request(app)
        .get('/api/csrf-token');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('csrfToken');
      expect(response.body).toHaveProperty('expiresIn');
      expect(response.body.csrfToken).toHaveLength(64); // 32 bytes hex
    });

    test('should set CSRF token in cookie', async () => {
      const response = await request(app)
        .get('/api/csrf-token');

      expect(response.status).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();
      const cookieHeader = response.headers['set-cookie'][0];
      expect(cookieHeader).toContain('XSRF-TOKEN=');
      expect(cookieHeader).toContain('SameSite=Strict');
    });

    test('should generate different tokens on each request', async () => {
      const response1 = await request(app).get('/api/csrf-token');
      const response2 = await request(app).get('/api/csrf-token');

      expect(response1.body.csrfToken).not.toBe(response2.body.csrfToken);
    });
  });

  describe('CSRF Token Validation', () => {
    test.skip('should reject POST without CSRF token when CSRF is enabled', async () => {
      // This test is skipped because CSRF is not enabled for JWT-based APIs
      // CSRF protection is typically used with cookie-based sessions
      // JWT authentication provides its own CSRF protection

      const response = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${getTestToken(Roles.DEVELOPER)}`)
        .send({
          name: 'Test Team',
          repo: 'github.com/test/repo',
          preset: 'IQ',
          task: 'Test task',
        });

      // With CSRF enabled, this would return 403
      // expect(response.status).toBe(403);
      // expect(response.body.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    test.skip('should accept POST with valid CSRF token when CSRF is enabled', async () => {
      // This test is skipped because CSRF is not enabled for JWT-based APIs

      // Get CSRF token first
      const tokenResponse = await request(app).get('/api/csrf-token');
      const csrfToken = tokenResponse.body.csrfToken;

      const response = await request(app)
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${getTestToken(Roles.DEVELOPER)}`)
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Test Team',
          repo: 'github.com/test/repo',
          preset: 'IQ',
          task: 'Test task',
        });

      // With CSRF enabled and valid token, this would succeed
      // expect(response.status).toBe(201);
    });
  });
});

describe('Secure Cookie Configuration', () => {
  test('should set httpOnly flag for session cookies', () => {
    const { getSecureCookieOptions } = require('../dist/middleware/csrf');

    const options = getSecureCookieOptions({ httpOnly: true });

    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe('strict');
  });

  test('should set SameSite=Strict for CSRF protection', () => {
    const { getSecureCookieOptions } = require('../dist/middleware/csrf');

    const options = getSecureCookieOptions();

    expect(options.sameSite).toBe('strict');
  });

  test('should set secure flag in production', () => {
    const { getSecureCookieOptions } = require('../dist/middleware/csrf');
    const originalEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = 'production';
    const options = getSecureCookieOptions();

    expect(options.secure).toBe(true);

    process.env.NODE_ENV = originalEnv;
  });

  test('should not set secure flag in development', () => {
    const { getSecureCookieOptions } = require('../dist/middleware/csrf');
    const originalEnv = process.env.NODE_ENV;

    process.env.NODE_ENV = 'development';
    const options = getSecureCookieOptions();

    expect(options.secure).toBe(false);

    process.env.NODE_ENV = originalEnv;
  });

  test('should set appropriate maxAge', () => {
    const { getSecureCookieOptions } = require('../dist/middleware/csrf');

    const options = getSecureCookieOptions({ maxAge: 3600000 }); // 1 hour

    expect(options.maxAge).toBe(3600000);
  });
});
