/**
 * CSRF Protection Middleware
 *
 * Implements Cross-Site Request Forgery protection using Double Submit Cookie pattern
 * Uses Redis for distributed token storage
 */

const crypto = require('crypto');

// CSRF token expiry (1 hour in seconds for Redis TTL)
const CSRF_TOKEN_EXPIRY = 60 * 60;
const CSRF_TOKEN_EXPIRY_MS = CSRF_TOKEN_EXPIRY * 1000;

/**
 * Generate a secure CSRF token and store in Redis
 * @param {import('ioredis').Redis} redis - Redis client instance
 */
async function generateCsrfToken(redis) {
  const token = crypto.randomBytes(32).toString('hex');
  const key = `csrf:${token}`;

  // Store token in Redis with TTL (auto-expiry, no manual cleanup needed)
  await redis.setex(key, CSRF_TOKEN_EXPIRY, Date.now().toString());

  return token;
}

/**
 * Verify CSRF token from Redis
 * @param {string} token - CSRF token to verify
 * @param {import('ioredis').Redis} redis - Redis client instance
 */
async function verifyCsrfToken(token, redis) {
  if (!token) {
    return false;
  }

  const key = `csrf:${token}`;
  const exists = await redis.exists(key);

  return exists === 1;
}

/**
 * CSRF protection middleware
 *
 * Options:
 * - ignoreMethods: Array of HTTP methods to skip CSRF check (default: ['GET', 'HEAD', 'OPTIONS'])
 * - cookieName: Name of the CSRF cookie (default: 'XSRF-TOKEN')
 * - headerName: Name of the CSRF header (default: 'X-CSRF-Token')
 * - redis: Redis client instance (required, or will use app.locals.redis)
 */
function csrfProtection(options = {}) {
  const {
    ignoreMethods = ['GET', 'HEAD', 'OPTIONS'],
    cookieName = 'XSRF-TOKEN',
    headerName = 'X-CSRF-Token',
    redis = null,
    cookieOptions = {
      httpOnly: false, // Must be false for JavaScript to read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: CSRF_TOKEN_EXPIRY_MS,
    },
  } = options;

  return async (req, res, next) => {
    // Get Redis client from options or app.locals
    const redisClient = redis || req.app?.locals?.redis;

    if (!redisClient) {
      return res.status(500).json({
        error: {
          code: 'CSRF_CONFIG_ERROR',
          message: 'Redis client not configured for CSRF protection',
        },
      });
    }

    // Skip CSRF check for safe methods
    if (ignoreMethods.includes(req.method)) {
      // Generate and set token for GET requests (for forms)
      if (req.method === 'GET') {
        try {
          const token = await generateCsrfToken(redisClient);

          // Set cookie
          res.cookie(cookieName, token, cookieOptions);

          // Also expose in response header for SPAs
          res.setHeader('X-CSRF-Token', token);

          // Attach to request for templates/responses
          req.csrfToken = () => token;
        } catch (error) {
          // Log error but don't block GET requests
          console.error('CSRF token generation failed:', error);
        }
      }

      return next();
    }

    // For state-changing methods, verify token
    const tokenFromHeader = req.headers[headerName.toLowerCase()];
    const tokenFromBody = req.body && req.body._csrf;
    const tokenFromQuery = req.query && req.query._csrf;

    const submittedToken = tokenFromHeader || tokenFromBody || tokenFromQuery;

    if (!submittedToken) {
      return res.status(403).json({
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token is required for this request',
        },
      });
    }

    try {
      const isValid = await verifyCsrfToken(submittedToken, redisClient);

      if (!isValid) {
        return res.status(403).json({
          error: {
            code: 'CSRF_TOKEN_INVALID',
            message: 'Invalid or expired CSRF token',
          },
        });
      }

      next();
    } catch (error) {
      console.error('CSRF token verification failed:', error);
      return res.status(500).json({
        error: {
          code: 'CSRF_VERIFICATION_ERROR',
          message: 'Failed to verify CSRF token',
        },
      });
    }
  };
}

/**
 * Get CSRF token endpoint
 * GET /api/csrf-token
 */
async function getCsrfTokenEndpoint(req, res) {
  const redisClient = req.app?.locals?.redis;

  if (!redisClient) {
    return res.status(500).json({
      error: {
        code: 'CSRF_CONFIG_ERROR',
        message: 'Redis client not configured',
      },
    });
  }

  try {
    const token = await generateCsrfToken(redisClient);

    // Set cookie
    res.cookie('XSRF-TOKEN', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: CSRF_TOKEN_EXPIRY_MS,
    });

    res.json({
      csrfToken: token,
      expiresIn: CSRF_TOKEN_EXPIRY_MS,
    });
  } catch (error) {
    console.error('CSRF token generation failed:', error);
    return res.status(500).json({
      error: {
        code: 'CSRF_TOKEN_ERROR',
        message: 'Failed to generate CSRF token',
      },
    });
  }
}

/**
 * Secure cookie configuration helper
 */
function getSecureCookieOptions(options = {}) {
  return {
    httpOnly: options.httpOnly !== false, // Default true
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: options.sameSite || 'strict', // Prevent CSRF
    maxAge: options.maxAge || 24 * 60 * 60 * 1000, // 24 hours default
    path: options.path || '/',
    domain: options.domain || undefined,
  };
}

module.exports = {
  csrfProtection,
  getCsrfTokenEndpoint,
  generateCsrfToken,
  verifyCsrfToken,
  getSecureCookieOptions,
};
