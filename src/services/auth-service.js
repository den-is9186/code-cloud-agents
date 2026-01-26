/**
 * Authentication Service
 *
 * Provides JWT-based authentication and authorization
 * Supports role-based access control (RBAC)
 */

const crypto = require('crypto');

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d';

// User roles with hierarchical permissions
const Roles = {
  ADMIN: 'admin',           // Full access to everything
  MANAGER: 'manager',       // Can manage teams and view reports
  DEVELOPER: 'developer',   // Can create/modify builds, limited team access
  VIEWER: 'viewer',         // Read-only access
  SERVICE: 'service',       // Service-to-service authentication
};

// Role hierarchy (higher roles inherit lower role permissions)
const RoleHierarchy = {
  admin: ['admin', 'manager', 'developer', 'viewer', 'service'],
  manager: ['manager', 'developer', 'viewer'],
  developer: ['developer', 'viewer'],
  viewer: ['viewer'],
  service: ['service'],
};

// Redis keys
const USER_PREFIX = 'auth:user:';
const API_KEY_PREFIX = 'auth:apikey:';
const REFRESH_TOKEN_PREFIX = 'auth:refresh:';

/**
 * Hash password using SHA-256 (for demo - production should use bcrypt)
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against hash
 */
function verifyPassword(password, hashedPassword) {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

/**
 * Generate JWT token
 */
function generateToken(payload, expiresIn = JWT_EXPIRY) {
  // Simple JWT implementation (production should use jsonwebtoken library)
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseExpiry(expiresIn);

  const jwtPayload = {
    ...payload,
    iat: now,
    exp: exp,
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(jwtPayload)).toString('base64url');

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${base64Header}.${base64Payload}`)
    .digest('base64url');

  return `${base64Header}.${base64Payload}.${signature}`;
}

/**
 * Verify and decode JWT token
 */
function verifyToken(token) {
  try {
    const [header, payload, signature] = token.split('.');

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      throw new Error('Token expired');
    }

    return decoded;
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
}

/**
 * Parse expiry string to seconds
 */
function parseExpiry(expiryStr) {
  const match = expiryStr.match(/^(\d+)([hdms])$/);
  if (!match) {
    throw new Error('Invalid expiry format. Use format like: 1h, 30m, 7d');
  }

  const [, value, unit] = match;
  const num = parseInt(value);

  switch (unit) {
    case 'd': return num * 24 * 60 * 60;
    case 'h': return num * 60 * 60;
    case 'm': return num * 60;
    case 's': return num;
    default: throw new Error('Invalid time unit');
  }
}

/**
 * Create a new user
 */
async function createUser(redis, userData) {
  const { userId, email, password, role = Roles.VIEWER, metadata = {} } = userData;

  // Validate role
  if (!Object.values(Roles).includes(role)) {
    throw new Error(`Invalid role. Must be one of: ${Object.values(Roles).join(', ')}`);
  }

  // Check if user already exists
  const existingUser = await redis.get(`${USER_PREFIX}${userId}`);
  if (existingUser) {
    throw new Error('User already exists');
  }

  const now = new Date().toISOString();
  const user = {
    userId,
    email,
    passwordHash: hashPassword(password),
    role,
    metadata,
    createdAt: now,
    updatedAt: now,
    active: true,
  };

  await redis.set(`${USER_PREFIX}${userId}`, JSON.stringify(user));

  // Also index by email for login
  await redis.set(`${USER_PREFIX}email:${email}`, userId);

  // Remove password from return value
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Authenticate user with email and password
 */
async function authenticateUser(redis, email, password) {
  // Get userId from email
  const userId = await redis.get(`${USER_PREFIX}email:${email}`);
  if (!userId) {
    throw new Error('Invalid credentials');
  }

  // Get user data
  const userData = await redis.get(`${USER_PREFIX}${userId}`);
  if (!userData) {
    throw new Error('Invalid credentials');
  }

  const user = JSON.parse(userData);

  // Check if user is active
  if (!user.active) {
    throw new Error('User account is disabled');
  }

  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid credentials');
  }

  // Generate tokens
  const accessToken = generateToken({
    userId: user.userId,
    email: user.email,
    role: user.role,
  }, JWT_EXPIRY);

  const refreshToken = generateToken({
    userId: user.userId,
    type: 'refresh',
  }, REFRESH_TOKEN_EXPIRY);

  // Store refresh token
  await redis.setex(
    `${REFRESH_TOKEN_PREFIX}${refreshToken}`,
    parseExpiry(REFRESH_TOKEN_EXPIRY),
    JSON.stringify({ userId: user.userId, createdAt: new Date().toISOString() })
  );

  return {
    accessToken,
    refreshToken,
    user: {
      userId: user.userId,
      email: user.email,
      role: user.role,
      metadata: user.metadata,
    },
  };
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(redis, refreshToken) {
  try {
    // Verify refresh token
    const decoded = verifyToken(refreshToken);

    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Check if refresh token exists in Redis
    const tokenData = await redis.get(`${REFRESH_TOKEN_PREFIX}${refreshToken}`);
    if (!tokenData) {
      throw new Error('Refresh token not found or expired');
    }

    // Get user data
    const userData = await redis.get(`${USER_PREFIX}${decoded.userId}`);
    if (!userData) {
      throw new Error('User not found');
    }

    const user = JSON.parse(userData);

    if (!user.active) {
      throw new Error('User account is disabled');
    }

    // Generate new access token
    const accessToken = generateToken({
      userId: user.userId,
      email: user.email,
      role: user.role,
    }, JWT_EXPIRY);

    return {
      accessToken,
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    throw new Error(`Token refresh failed: ${error.message}`);
  }
}

/**
 * Revoke refresh token (logout)
 */
async function revokeRefreshToken(redis, refreshToken) {
  await redis.del(`${REFRESH_TOKEN_PREFIX}${refreshToken}`);
}

/**
 * Create API key for service-to-service authentication
 */
async function createApiKey(redis, { name, teamId, permissions = [] }) {
  const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`;
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

  const now = new Date().toISOString();
  const keyData = {
    name,
    teamId,
    permissions,
    role: Roles.SERVICE,
    hashedKey,
    createdAt: now,
    lastUsedAt: null,
    active: true,
  };

  await redis.set(`${API_KEY_PREFIX}${hashedKey}`, JSON.stringify(keyData));

  return {
    apiKey, // Return plain key only once
    name,
    teamId,
    permissions,
    createdAt: now,
  };
}

/**
 * Verify API key
 */
async function verifyApiKey(redis, apiKey) {
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  const keyData = await redis.get(`${API_KEY_PREFIX}${hashedKey}`);

  if (!keyData) {
    throw new Error('Invalid API key');
  }

  const key = JSON.parse(keyData);

  if (!key.active) {
    throw new Error('API key is disabled');
  }

  // Update last used timestamp
  key.lastUsedAt = new Date().toISOString();
  await redis.set(`${API_KEY_PREFIX}${hashedKey}`, JSON.stringify(key));

  return {
    role: key.role,
    teamId: key.teamId,
    permissions: key.permissions,
    name: key.name,
  };
}

/**
 * Check if user has required role
 */
function hasRole(userRole, requiredRole) {
  const allowedRoles = RoleHierarchy[userRole] || [];
  return allowedRoles.includes(requiredRole);
}

/**
 * Check if user has required permission
 */
function hasPermission(userPermissions, requiredPermission) {
  return userPermissions && userPermissions.includes(requiredPermission);
}

module.exports = {
  Roles,
  RoleHierarchy,
  createUser,
  authenticateUser,
  refreshAccessToken,
  revokeRefreshToken,
  generateToken,
  verifyToken,
  createApiKey,
  verifyApiKey,
  hasRole,
  hasPermission,
  hashPassword,
  verifyPassword,
};
