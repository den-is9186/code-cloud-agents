/**
 * Type definitions for auth-service.js
 */

import { Redis } from 'ioredis';

export const Roles: {
  ADMIN: string;
  MANAGER: string;
  DEVELOPER: string;
  VIEWER: string;
  SERVICE: string;
};

export const RoleHierarchy: {
  [key: string]: string[];
};

export interface UserData {
  userId: string;
  email: string;
  password: string;
  role?: string;
  metadata?: Record<string, unknown>;
}

export interface User {
  userId: string;
  email: string;
  role: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  active: boolean;
}

export interface AuthenticationResult {
  accessToken: string;
  refreshToken: string;
  user: {
    userId: string;
    email: string;
    role: string;
    metadata: Record<string, unknown>;
  };
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface ApiKeyData {
  name: string;
  teamId?: string;
  permissions?: string[];
}

export interface ApiKeyResult {
  role: string;
  teamId?: string;
  permissions: string[];
  name: string;
}

export function createUser(redis: Redis, userData: UserData): Promise<User>;
export function authenticateUser(
  redis: Redis,
  email: string,
  password: string
): Promise<AuthenticationResult>;
export function refreshAccessToken(
  redis: Redis,
  refreshToken: string
): Promise<{ accessToken: string; user: { userId: string; email: string; role: string } }>;
export function revokeRefreshToken(redis: Redis, refreshToken: string): Promise<void>;
export function generateToken(payload: Record<string, unknown>, expiresIn?: string): string;
export function verifyToken(token: string): TokenPayload;
export function createApiKey(
  redis: Redis,
  data: ApiKeyData
): Promise<{
  apiKey: string;
  name: string;
  teamId?: string;
  permissions: string[];
  createdAt: string;
}>;
export function verifyApiKey(redis: Redis, apiKey: string): Promise<ApiKeyResult>;
export function hasRole(userRole: string, requiredRole: string): boolean;
export function hasPermission(
  userPermissions: string[] | undefined,
  requiredPermission: string
): boolean;
export function hashPassword(password: string): string;
export function verifyPassword(password: string, hashedPassword: string): boolean;
