/**
 * CSRF Protection Middleware
 *
 * Implements Cross-Site Request Forgery protection using Double Submit Cookie pattern
 */

const crypto = require('crypto');

// CSRF token expiry (1 hour)
const CSRF_TOKEN_EXPIRY = 60 * 60 * 1000;

// Store for CSRF tokens (in production, use Redis)
const csrfTokenStore = new Map();

/**
 * Generate a secure CSRF token
 */
function generateCsrfToken() {
  const token = crypto.randomBytes(32).toString('hex');
  const expiry = Date.now() + CSRF_TOKEN_EXPIRY;

  csrfTokenStore.set(token, expiry);

  // Cleanup expired tokens periodically
  if (Math.random() < 0.01) {
    // 1% chance
    cleanupExpiredTokens();
  }

  return token;
}

/**
 * Cleanup expired tokens
 */
function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, expiry] of csrfTokenStore.entries()) {
    if (expiry < now) {
      csrfTokenStore.delete(token);
    }
  }
}

/**
 * Verify CSRF token
 */
function verifyCsrfToken(token) {
  if (!token) {
    return false;
  }

  const expiry = csrfTokenStore.get(token);
  if (!expiry) {
    return false;
  }

  if (expiry < Date.now()) {
    csrfTokenStore.delete(token);
    return false;
  }

  return true;
}

/**
 * CSRF protection middleware
 *
 * Options:
 * - ignoreMethods: Array of HTTP methods to skip CSRF check (default: ['GET', 'HEAD', 'OPTIONS'])
 * - cookieName: Name of the CSRF cookie (default: 'XSRF-TOKEN')
 * - headerName: Name of the CSRF header (default: 'X-CSRF-Token')
 */
function csrfProtection(options = {}) {
  const {
    ignoreMethods = ['GET', 'HEAD', 'OPTIONS'],
    cookieName = 'XSRF-TOKEN',
    headerName = 'X-CSRF-Token',
    cookieOptions = {
      httpOnly: false, // Must be false for JavaScript to read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: CSRF_TOKEN_EXPIRY,
    },
  } = options;

  return (req, res, next) => {
    // Skip CSRF check for safe methods
    if (ignoreMethods.includes(req.method)) {
      // Generate and set token for GET requests (for forms)
      if (req.method === 'GET') {
        const token = generateCsrfToken();

        // Set cookie
        res.cookie(cookieName, token, cookieOptions);

        // Also expose in response header for SPAs
        res.setHeader('X-CSRF-Token', token);

        // Attach to request for templates/responses
        req.csrfToken = () => token;
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

    if (!verifyCsrfToken(submittedToken)) {
      return res.status(403).json({
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid or expired CSRF token',
        },
      });
    }

    next();
  };
}

/**
 * Get CSRF token endpoint
 * GET /api/csrf-token
 */
function getCsrfTokenEndpoint(req, res) {
  const token = generateCsrfToken();

  // Set cookie
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: CSRF_TOKEN_EXPIRY,
  });

  res.json({
    csrfToken: token,
    expiresIn: CSRF_TOKEN_EXPIRY,
  });
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
