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

export interface AgentCostBreakdown {
  agent: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface BuildCostSummary {
  totalCost: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  agentCount: number;
  agentCosts: AgentCostBreakdown[];
}

export interface BudgetStatus {
  buildId: string;
  currentCost: number;
  budgetLimit: number;
  withinBudget: boolean;
  remaining: number;
  percentage: number;
  alertLevel: string | null;
}

export interface PresetCostComparison {
  preset: string;
  estimatedCost: number;
  estimatedTokens: number;
  estimatedDuration: number;
}

export interface BuildCostReport {
  buildId: string;
  totalCost: number;
  totalTokens: number;
  agentBreakdown: AgentCostBreakdown[];
  timeline: Array<{
    timestamp: number;
    agent: string;
    cost: number;
  }>;
  budgetStatus?: BudgetStatus;
}

export function calculateBuildCost(
  redis: Redis,
  buildId: string
): Promise<BuildCostSummary>;

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
): Promise<BudgetStatus>;

// Preset estimation
export function estimatePresetCost(preset: string): {
  estimatedCost: number;
  estimatedTokens: number;
  estimatedDuration: number;
};

export function comparePresetCosts(presets: string[]): PresetCostComparison[];

// Reporting
export function generateBuildCostReport(redis: Redis, buildId: string): Promise<BuildCostReport>;
