/**
 * Authentication Service
 *
 * Provides JWT-based authentication and authorization
 * Supports role-based access control (RBAC)
 */

import crypto from 'crypto';
import type { Redis } from 'ioredis';
import { validateEnvironment, getRequiredEnv, getOptionalEnv } from '../utils/env-validation';

// Validate environment variables at module load
validateEnvironment();

// JWT configuration
const JWT_SECRET = getRequiredEnv('JWT_SECRET', crypto.randomBytes(64).toString('hex'));
const JWT_EXPIRY = getOptionalEnv('JWT_EXPIRY', '24h');
const REFRESH_TOKEN_EXPIRY = getOptionalEnv('REFRESH_TOKEN_EXPIRY', '7d');

/**
 * User roles with hierarchical permissions
 */
export const Roles = {
  ADMIN: 'admin', // Full access to everything
  MANAGER: 'manager', // Can manage teams and view reports
  DEVELOPER: 'developer', // Can create/modify builds, limited team access
  VIEWER: 'viewer', // Read-only access
  SERVICE: 'service', // Service-to-service authentication
} as const;

export type RoleValue = (typeof Roles)[keyof typeof Roles];

/**
 * Role hierarchy (higher roles inherit lower role permissions)
 */
export const RoleHierarchy: Record<RoleValue, RoleValue[]> = {
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
 * User data structure
 */
export interface UserData {
  userId: string;
  email: string;
  password: string;
  role?: RoleValue;
  metadata?: Record<string, unknown>;
}

/**
 * User structure (stored)
 */
interface User {
  userId: string;
  email: string;
  passwordHash: string;
  role: RoleValue;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

/**
 * User without password (for responses)
 */
export interface UserWithoutPassword {
  userId: string;
  email: string;
  role: RoleValue;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

/**
 * JWT payload structure
 */
interface JWTPayload {
  userId: string;
  email?: string;
  role?: RoleValue;
  type?: string;
  iat: number;
  exp: number;
}

/**
 * Authentication result
 */
export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    email: string;
    role: RoleValue;
    metadata: Record<string, unknown>;
  };
}

/**
 * Refresh token result
 */
export interface RefreshResult {
  accessToken: string;
  user: {
    userId: string;
    email: string;
    role: RoleValue;
  };
}

/**
 * API key data structure
 */
export interface ApiKeyData {
  name: string;
  teamId: string;
  permissions?: string[];
}

/**
 * API key result
 */
export interface ApiKeyResult {
  apiKey: string;
  name: string;
  teamId: string;
  permissions: string[];
  createdAt: string;
}

/**
 * API key verification result
 */
export interface ApiKeyVerification {
  role: RoleValue;
  teamId: string;
  permissions: string[];
  name: string;
}

/**
 * Hash password using SHA-256 (for demo - production should use bcrypt)
 *
 * @param password - Plain text password
 * @returns Hashed password with salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify password against hash
 *
 * @param password - Plain text password
 * @param hashedPassword - Hashed password with salt
 * @returns True if password matches
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  if (!salt || !hash) {
    return false;
  }
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

/**
 * Generate JWT token
 *
 * @param payload - Token payload
 * @param expiresIn - Expiry time string (e.g., '24h', '7d')
 * @returns JWT token string
 */
export function generateToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  expiresIn: string = JWT_EXPIRY
): string {
  // Simple JWT implementation (production should use jsonwebtoken library)
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseExpiry(expiresIn);

  const jwtPayload: JWTPayload = {
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
 *
 * @param token - JWT token string
 * @returns Decoded payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const [header, payload, signature] = token.split('.');

    if (!header || !payload || !signature) {
      throw new Error('Invalid token format');
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    // Decode payload
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as JWTPayload;

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp && decoded.exp < now) {
      throw new Error('Token expired');
    }

    return decoded;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Token verification failed: ${message}`);
  }
}

/**
 * Parse expiry string to seconds
 *
 * @param expiryStr - Expiry string (e.g., '1h', '30m', '7d')
 * @returns Number of seconds
 * @throws Error if format is invalid
 */
function parseExpiry(expiryStr: string): number {
  const match = expiryStr.match(/^(\d+)([hdms])$/);
  if (!match) {
    throw new Error('Invalid expiry format. Use format like: 1h, 30m, 7d');
  }

  const [, value, unit] = match;
  if (!value || !unit) {
    throw new Error('Invalid expiry format');
  }
  const num = parseInt(value);

  switch (unit) {
    case 'd':
      return num * 24 * 60 * 60;
    case 'h':
      return num * 60 * 60;
    case 'm':
      return num * 60;
    case 's':
      return num;
    default:
      throw new Error('Invalid time unit');
  }
}

/**
 * Create a new user
 *
 * @param redis - Redis client
 * @param userData - User data
 * @returns User without password
 * @throws Error if user already exists or role is invalid
 */
export async function createUser(redis: Redis, userData: UserData): Promise<UserWithoutPassword> {
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
  const user: User = {
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * Authenticate user with email and password
 *
 * @param redis - Redis client
 * @param email - User email
 * @param password - User password
 * @returns Authentication result with tokens
 * @throws Error if credentials are invalid or user is disabled
 */
export async function authenticateUser(
  redis: Redis,
  email: string,
  password: string
): Promise<AuthResult> {
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

  const user = JSON.parse(userData) as User;

  // Check if user is active
  if (!user.active) {
    throw new Error('User account is disabled');
  }

  // Verify password
  if (!verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid credentials');
  }

  // Generate tokens
  const accessToken = generateToken(
    {
      userId: user.userId,
      email: user.email,
      role: user.role,
    },
    JWT_EXPIRY
  );

  const refreshToken = generateToken(
    {
      userId: user.userId,
      type: 'refresh',
    },
    REFRESH_TOKEN_EXPIRY
  );

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
 *
 * @param redis - Redis client
 * @param refreshToken - Refresh token
 * @returns New access token and user info
 * @throws Error if refresh token is invalid or expired
 */
export async function refreshAccessToken(
  redis: Redis,
  refreshToken: string
): Promise<RefreshResult> {
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

    const user = JSON.parse(userData) as User;

    if (!user.active) {
      throw new Error('User account is disabled');
    }

    // Generate new access token
    const accessToken = generateToken(
      {
        userId: user.userId,
        email: user.email,
        role: user.role,
      },
      JWT_EXPIRY
    );

    return {
      accessToken,
      user: {
        userId: user.userId,
        email: user.email,
        role: user.role,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Token refresh failed: ${message}`);
  }
}

/**
 * Revoke refresh token (logout)
 *
 * @param redis - Redis client
 * @param refreshToken - Refresh token to revoke
 */
export async function revokeRefreshToken(redis: Redis, refreshToken: string): Promise<void> {
  await redis.del(`${REFRESH_TOKEN_PREFIX}${refreshToken}`);
}

/**
 * Create API key for service-to-service authentication
 *
 * @param redis - Redis client
 * @param data - API key data
 * @returns API key result
 */
export async function createApiKey(redis: Redis, data: ApiKeyData): Promise<ApiKeyResult> {
  const { name, teamId, permissions = [] } = data;

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
 *
 * @param redis - Redis client
 * @param apiKey - API key to verify
 * @returns API key verification result
 * @throws Error if API key is invalid or disabled
 */
export async function verifyApiKey(redis: Redis, apiKey: string): Promise<ApiKeyVerification> {
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');
  const keyData = await redis.get(`${API_KEY_PREFIX}${hashedKey}`);

  if (!keyData) {
    throw new Error('Invalid API key');
  }

  const key = JSON.parse(keyData) as {
    role: RoleValue;
    teamId: string;
    permissions: string[];
    name: string;
    active: boolean;
  };

  if (!key.active) {
    throw new Error('API key is disabled');
  }

  // Update last used timestamp
  const updatedKey = { ...key, lastUsedAt: new Date().toISOString() };
  await redis.set(`${API_KEY_PREFIX}${hashedKey}`, JSON.stringify(updatedKey));

  return {
    role: key.role,
    teamId: key.teamId,
    permissions: key.permissions,
    name: key.name,
  };
}

/**
 * Check if user has required role
 *
 * @param userRole - User's role
 * @param requiredRole - Required role
 * @returns True if user has required role
 */
export function hasRole(userRole: RoleValue, requiredRole: RoleValue): boolean {
  const allowedRoles = RoleHierarchy[userRole] || [];
  return allowedRoles.includes(requiredRole);
}

/**
 * Check if user has required permission
 *
 * @param userPermissions - User's permissions
 * @param requiredPermission - Required permission
 * @returns True if user has required permission
 */
export function hasPermission(
  userPermissions: string[] | undefined,
  requiredPermission: string
): boolean {
  return userPermissions !== undefined && userPermissions.includes(requiredPermission);
}
