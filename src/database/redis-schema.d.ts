/**
 * Type declarations for redis-schema.js
 * This file provides TypeScript declarations for the JavaScript redis-schema module
 */

import type { Redis } from 'ioredis';

// Build interface (matches structure in redis)
export interface RedisBuild {
  id: string;
  teamId: string;
  preset: string;
  phase: string;
  status: string;
  completedAgents: string | string[];
  currentAgent?: string | null;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  totalCost?: number;
  totalTokens?: number;
  totalInputTokens?: number;
  totalOutputTokens?: number;
  createdAt: string;
  success?: boolean;
  errorMessage?: string | null;
  [key: string]: unknown;
}

// Agent run interface (matches structure in redis)
export interface RedisAgentRun {
  id: string;
  buildId: string;
  teamId: string;
  agentName: string;
  model: string;
  modelVersion?: string | null;
  status: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cost?: number;
  success?: boolean;
  errorMessage?: string | null;
  [key: string]: unknown;
}

// Prefixes
export const PREFIXES: Record<string, string>;

// Schemas (documentation)
export const TeamSchema: Record<string, string>;
export const BuildSchema: Record<string, string>;
export const AgentRunSchema: Record<string, string>;

// Key generators
export function getTeamKey(teamId: string): string;
export function getBuildKey(buildId: string): string;
export function getAgentRunKey(runId: string): string;
export function getUserTeamsKey(userId: string): string;
export function getRepoTeamsKey(repo: string): string;
export function getStatusTeamsKey(status: string): string;
export function getTeamBuildsKey(teamId: string): string;
export function getBuildAgentsKey(buildId: string): string;

// Index management
export function addTeamToIndexes(redis: Redis, team: Record<string, unknown>): Promise<void>;
export function removeTeamFromIndexes(
  redis: Redis,
  teamId: string,
  team: Record<string, unknown>
): Promise<void>;
export function updateTeamStatusIndex(
  redis: Redis,
  teamId: string,
  oldStatus: string,
  newStatus: string
): Promise<void>;

// Build operations
export function createBuild(redis: Redis, build: Partial<RedisBuild>): Promise<RedisBuild>;
export function getBuild(redis: Redis, buildId: string): Promise<RedisBuild | null>;
export function updateBuild(
  redis: Redis,
  buildId: string,
  updates: Partial<RedisBuild>
): Promise<void>;
export function addBuildToTeam(redis: Redis, buildId: string, teamId: string): Promise<void>;
export function getTeamBuilds(redis: Redis, teamId: string, limit?: number): Promise<string[]>;

// Agent run operations
export function createAgentRun(
  redis: Redis,
  agentRun: Partial<RedisAgentRun>
): Promise<RedisAgentRun>;
export function getAgentRun(redis: Redis, runId: string): Promise<RedisAgentRun | null>;
export function updateAgentRun(
  redis: Redis,
  runId: string,
  updates: Partial<RedisAgentRun>
): Promise<void>;
export function addAgentRunToBuild(redis: Redis, runId: string, buildId: string): Promise<void>;
export function getBuildAgentRuns(redis: Redis, buildId: string): Promise<string[]>;
