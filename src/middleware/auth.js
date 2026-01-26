/**
 * Authentication Middleware
 *
 * Provides authentication and authorization middleware for Express routes
 */

const { verifyToken, verifyApiKey, hasRole, Roles } = require('../services/auth-service');

/**
 * Extract token from Authorization header
 */
function extractToken(req) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and "Bearer: <token>" formats
  const match = authHeader.match(/^Bearer:?\s+(.+)$/i);
  if (!match) {
    return null;
  }

  return match[1];
}

/**
 * Extract API key from header
 */
function extractApiKey(req) {
  return req.headers['x-api-key'];
}

/**
 * Authentication middleware
 * Verifies JWT token or API key and attaches user/service info to request
 *
 * @param {Object} options - Configuration options
 * @param {boolean} options.optional - If true, don't fail if no auth provided
 */
function authenticate(options = {}) {
  return async (req, res, next) => {
    const { optional = false } = options;

    try {
      // Try API key first
      const apiKey = extractApiKey(req);
      if (apiKey) {
        try {
          const redis = req.app.locals.redis || require('../api-server').redis;
          const apiKeyData = await verifyApiKey(redis, apiKey);

          req.auth = {
            type: 'apikey',
            role: apiKeyData.role,
            teamId: apiKeyData.teamId,
            permissions: apiKeyData.permissions,
            name: apiKeyData.name,
          };

          return next();
        } catch (error) {
          if (!optional) {
            return res.status(401).json({
              error: {
                code: 'INVALID_API_KEY',
                message: error.message,
              },
            });
          }
        }
      }

      // Try JWT token
      const token = extractToken(req);
      if (token) {
        try {
          const decoded = verifyToken(token);

          req.auth = {
            type: 'jwt',
            userId: decoded.userId,
            email: decoded.email,
            role: decoded.role,
          };

          return next();
        } catch (error) {
          if (!optional) {
            return res.status(401).json({
              error: {
                code: 'INVALID_TOKEN',
                message: error.message,
              },
            });
          }
        }
      }

      // No authentication provided
      if (!optional) {
        return res.status(401).json({
          error: {
            code: 'MISSING_AUTHENTICATION',
            message: 'Authentication required. Provide either Authorization header with JWT token or X-API-Key header.',
          },
        });
      }

      // Optional auth - continue without auth
      return next();
    } catch (error) {
      return res.status(500).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed',
          details: error.message,
        },
      });
    }
  };
}

/**
 * Authorization middleware
 * Checks if authenticated user has required role
 *
 * @param {string|string[]} requiredRole - Required role(s)
 */
function requireRole(requiredRole) {
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: {
          code: 'MISSING_AUTHENTICATION',
          message: 'Authentication required',
        },
      });
    }

    const userRole = req.auth.role;

    // Check if user has any of the required roles
    const hasRequiredRole = requiredRoles.some((role) => hasRole(userRole, role));

    if (!hasRequiredRole) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Access denied. Required role: ${requiredRoles.join(' or ')}`,
          userRole,
        },
      });
    }

    return next();
  };
}

/**
 * Team ownership middleware
 * Checks if user owns the team or is an admin/manager
 */
function requireTeamOwnership(teamIdParam = 'id') {
  return async (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({
        error: {
          code: 'MISSING_AUTHENTICATION',
          message: 'Authentication required',
        },
      });
    }

    const teamId = req.params[teamIdParam];
    if (!teamId) {
      return res.status(400).json({
        error: {
          code: 'MISSING_TEAM_ID',
          message: 'Team ID is required',
        },
      });
    }

    // Admins and managers can access any team
    if (hasRole(req.auth.role, Roles.ADMIN) || hasRole(req.auth.role, Roles.MANAGER)) {
      return next();
    }

    // Service accounts with teamId
    if (req.auth.type === 'apikey' && req.auth.teamId === teamId) {
      return next();
    }

    // Check team ownership
    try {
      const redis = req.app.locals.redis || require('../api-server').redis;
      const teamKey = `team:${teamId}`;
      const teamData = await redis.hgetall(teamKey);

      if (!teamData || Object.keys(teamData).length === 0) {
        return res.status(404).json({
          error: {
            code: 'TEAM_NOT_FOUND',
            message: `Team not found with id: ${teamId}`,
          },
        });
      }

      // Check if user is owner
      if (teamData.ownerId !== req.auth.userId) {
        return res.status(403).json({
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: 'You do not have permission to access this team',
          },
        });
      }

      return next();
    } catch (error) {
      return res.status(500).json({
        error: {
          code: 'AUTH_ERROR',
          message: 'Authorization check failed',
          details: error.message,
        },
      });
    }
  };
}

/**
 * Rate limiting by authentication
 * Different limits for different auth types
 */
const rateLimitStore = new Map();

function rateLimit(options = {}) {
  const {
    windowMs = 60000, // 1 minute
    maxAnonymous = 10,
    maxAuthenticated = 100,
    maxApiKey = 1000,
  } = options;

  return (req, res, next) => {
    const identifier = req.auth
      ? req.auth.type === 'apikey'
        ? `apikey:${req.auth.name}`
        : `user:${req.auth.userId}`
      : `ip:${req.ip}`;

    const now = Date.now();
    const windowStart = now - windowMs;

    // Get or create rate limit record
    let record = rateLimitStore.get(identifier);
    if (!record) {
      record = { requests: [], resetTime: now + windowMs };
      rateLimitStore.set(identifier, record);
    }

    // Remove old requests outside the window
    record.requests = record.requests.filter((timestamp) => timestamp > windowStart);

    // Determine max requests based on auth type
    let maxRequests = maxAnonymous;
    if (req.auth) {
      maxRequests = req.auth.type === 'apikey' ? maxApiKey : maxAuthenticated;
    }

    // Check if limit exceeded
    if (record.requests.length >= maxRequests) {
      const resetTime = new Date(record.resetTime).toISOString();
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests',
          limit: maxRequests,
          resetTime,
        },
      });
    }

    // Add current request
    record.requests.push(now);

    // Update reset time if needed
    if (now >= record.resetTime) {
      record.resetTime = now + windowMs;
    }

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      // 1% chance
      for (const [key, value] of rateLimitStore.entries()) {
        if (now >= value.resetTime && value.requests.length === 0) {
          rateLimitStore.delete(key);
        }
      }
    }

    return next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  requireTeamOwnership,
  rateLimit,
  Roles,
};
