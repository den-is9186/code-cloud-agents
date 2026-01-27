/**
 * Authentication Middleware
 *
 * Provides authentication and authorization middleware for Express routes
 */

import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';
import {
  verifyToken,
  verifyApiKey,
  hasRole,
  Roles,
  type RoleValue,
} from '../services/auth-service.js';

/**
 * Authentication data attached to request
 */
interface AuthData {
  type: 'apikey' | 'jwt';
  role: RoleValue;
  userId?: string;
  email?: string;
  teamId?: string;
  permissions?: string[];
  name?: string;
}

/**
 * Extended Request interface with auth property
 */
export interface AuthenticatedRequest extends Request {
  auth?: AuthData;
}

/**
 * Authentication middleware options
 */
interface AuthenticateOptions {
  optional?: boolean;
}

/**
 * Extract token from Authorization header
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  // Support both "Bearer <token>" and "Bearer: <token>" formats
  const match = authHeader.match(/^Bearer:?\s+(.+)$/i);
  if (!match || !match[1]) {
    return null;
  }

  return match[1];
}

/**
 * Extract API key from header
 */
function extractApiKey(req: Request): string | null {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  return apiKey || null;
}

/**
 * Authentication middleware
 * Verifies JWT token or API key and attaches user/service info to request
 *
 * @param options - Configuration options
 * @param options.optional - If true, don't fail if no auth provided
 */
function authenticate(
  options: AuthenticateOptions = {}
): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response> {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
    const { optional = false } = options;

    try {
      // Try API key first
      const apiKey = extractApiKey(req);
      if (apiKey) {
        try {
          const redis: Redis = req.app.locals.redis || require('../api-server').redis;
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
                message: error instanceof Error ? error.message : 'Unknown error',
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
            role: decoded.role || 'viewer',
          };

          return next();
        } catch (error) {
          if (!optional) {
            return res.status(401).json({
              error: {
                code: 'INVALID_TOKEN',
                message: error instanceof Error ? error.message : 'Unknown error',
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
            message:
              'Authentication required. Provide either Authorization header with JWT token or X-API-Key header.',
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
          details: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  };
}

/**
 * Authorization middleware
 * Checks if authenticated user has required role
 *
 * @param requiredRole - Required role(s)
 */
function requireRole(
  requiredRole: RoleValue | RoleValue[]
): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void | Response {
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void | Response => {
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
function requireTeamOwnership(
  teamIdParam = 'id'
): (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void | Response> {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void | Response> => {
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
      const redis: Redis = req.app.locals.redis || require('../api-server').redis;
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
          details: error instanceof Error ? error.message : 'Unknown error',
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
  return async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      // Try API key first
      const apiKey = extractApiKey(req);
      if (apiKey) {
        try {
          // Get redis from app.locals (already set in api-server.js)
          const redis: Redis = req.app.locals.redis;
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
        } catch {
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
            role: decoded.role || Roles.VIEWER,
          };

          return next();
        } catch {
          // Silently continue without auth
        }
      }

      // No valid authentication found - continue without auth
      return next();
    } catch {
      // On any error, just continue without auth
      return next();
    }
  };
}

export { authenticate, extractAuth, requireRole, requireTeamOwnership, Roles };
export type { AuthData, AuthenticateOptions };
