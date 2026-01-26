/**
 * Type declarations for Cost Tracker Utility
 * 
 * Provides TypeScript type definitions for cost calculation and budget monitoring.
 */

import { Redis } from 'ioredis';

// ===================================================================
// COST CALCULATION
// ===================================================================

/**
 * Calculate cost for a specific model based on token usage
 */
export function calculateModelCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): {
  modelId: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
};

/**
 * Calculate cost for an agent run
 */
export function calculateAgentCost(agentRun: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  [key: string]: any;
}): {
  modelId: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
};

/**
 * Calculate total cost for a build by summing all agent runs
 */
export function calculateBuildCost(redis: Redis, buildId: string): Promise<{
  buildId: string;
  teamId: string;
  preset: string;
  phase: string;
  agentCosts: Array<{
    runId: string;
    agentName: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
    duration?: number;
  }>;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  currency: string;
  agentCount: number;
}>;

// ===================================================================
// BUDGET MONITORING
// ===================================================================

/**
 * Check if a build is approaching or exceeding its budget
 */
export function checkBudget(buildCost: number, budgetLimit: number): {
  status: string;
  utilizationPercent: number;
  spent: number;
  limit: number;
  remaining: number;
  alert: {
    level: string;
    message: string;
  } | null;
};

/**
 * Get budget status for a build
 */
export function getBuildBudgetStatus(
  redis: Redis,
  buildId: string,
  budgetLimit: number
): Promise<{
  status: string;
  utilizationPercent: number;
  spent: number;
  limit: number;
  remaining: number;
  alert: {
    level: string;
    message: string;
  } | null;
}>;

// ===================================================================
// PRESET COST ESTIMATION
// ===================================================================

/**
 * Estimate cost for a preset based on average token usage
 */
export function estimatePresetCost(
  presetId: string,
  estimatedTokens?: number | null
): {
  presetId: string;
  presetName: string;
  estimatedCost: number | null;
  estimatedTokens?: number;
  agentCount?: number;
  source: string;
  currency: string;
};

/**
 * Compare costs between multiple presets
 */
export function comparePresetCosts(
  presetIds: string[],
  estimatedTokens?: number | null
): Array<{
  presetId: string;
  presetName: string;
  estimatedCost: number | null;
  estimatedTokens?: number;
  agentCount?: number;
  source: string;
  currency: string;
}>;

// ===================================================================
// COST REPORTING
// ===================================================================

/**
 * Generate a detailed cost report for a build
 */
export function generateBuildCostReport(redis: Redis, buildId: string): Promise<{
  build: {
    id: string;
    teamId: string;
    preset: string;
    phase: string;
    status: string;
  };
  summary: {
    totalCost: number;
    totalTokens: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    agentCount: number;
    avgCostPerAgent: number;
    currency: string;
  };
  agents: Array<{
    runId: string;
    agentName: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    cost: number;
    duration?: number;
    costPercent: number;
  }>;
  insights: {
    mostExpensiveAgent: {
      name: string;
      cost: number;
      percent: number;
    } | null;
    avgTokensPerAgent: number;
  };
}>;
