/**
 * Type declarations for cost-tracker.js
 * This file provides TypeScript declarations for the JavaScript cost-tracker module
 */

import type { Redis } from 'ioredis';

// Cost calculation
export function calculateModelCost(options: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}): { totalCost: number; inputCost: number; outputCost: number };

export function calculateAgentCost(options: {
  model: string;
  inputTokens: number;
  outputTokens: number;
}): {
  totalCost: number;
  inputCost: number;
  outputCost: number;
  totalTokens: number;
};

export function calculateBuildCost(
  redis: Redis,
  buildId: string
): Promise<{
  totalCost: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  agentCount: number;
  agentCosts: any[];
}>;

// Budget monitoring
export function checkBudget(options: { currentCost: number; budgetLimit: number }): {
  withinBudget: boolean;
  remaining: number;
  percentage: number;
  alertLevel: string | null;
};

export function getBuildBudgetStatus(
  redis: Redis,
  buildId: string,
  budgetLimit: number
): Promise<any>;

// Preset estimation
export function estimatePresetCost(preset: string): {
  estimatedCost: number;
  estimatedTokens: number;
  estimatedDuration: number;
};

export function comparePresetCosts(presets: string[]): any[];

// Reporting
export function generateBuildCostReport(redis: Redis, buildId: string): Promise<any>;
