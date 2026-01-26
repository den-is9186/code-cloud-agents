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
 * Extract authentication info without enforcing it
 * Populates req.auth if valid credentials are present, but doesn't fail if not
 * Used for tiered rate limiting based on authentication level
 */
function extractAuth() {
  return async (req, res, next) => {
    try {
      // Try API key first
      const apiKey = extractApiKey(req);
      if (apiKey) {
        try {
          // Get redis from app.locals (already set in api-server.js)
          const redis = req.app.locals.redis;
          if (!redis) {
            // If redis not available, continue without auth
            return next();
          }
          
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
          // Silently continue without auth
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
          // Silently continue without auth
        }
      }

      // No valid authentication found - continue without auth
      return next();
    } catch (error) {
      // On any error, just continue without auth
      return next();
    }
  };
}

module.exports = {
  authenticate,
  extractAuth,
  requireRole,
  requireTeamOwnership,
  Roles,
};
