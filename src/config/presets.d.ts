/**
 * Type declarations for presets.js
 * This file provides TypeScript declarations for the JavaScript presets module
 */

/**
 * Agent configuration within a preset
 */
export interface AgentConfig {
  model: string;
  role: string;
}

/**
 * Preset configuration
 */
export interface PresetConfig {
  name: string;
  description: string;
  estimated_cost_per_build: number;
  quality_score: number;
  error_rate: number;
  recommended?: boolean;
  agents: {
    supervisor: AgentConfig;
    architect: AgentConfig;
    coach: AgentConfig;
    code: AgentConfig;
    review: AgentConfig;
    test: AgentConfig;
    docs: AgentConfig;
  };
  use_cases: string[];
}

/**
 * Model pricing configuration
 */
export interface ModelPricing {
  input: number;
  output: number;
}

/**
 * Model configuration
 */
export interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  tier: string;
  pricing: ModelPricing;
  context_window: number;
  max_output: number;
  description?: string;
}

/**
 * Selection guide item
 */
export interface SelectionGuideItem {
  preset: string;
  use_case: string;
  description: string;
  cost: number;
  quality: number;
}

/**
 * Two-phase workflow configuration
 */
export interface TwoPhaseWorkflow {
  phase1: string;
  phase2: string;
  description: string;
  total_cost: number;
}

/**
 * Cost comparison result
 */
export interface CostComparison {
  presetId: string;
  name: string;
  estimated_cost: number;
  quality_score: number;
  error_rate: number;
}

/**
 * Pricing comparison result
 */
export interface PricingComparison {
  modelId: string;
  name: string;
  provider: string;
  pricing: ModelPricing;
  cost_per_1m_tokens: number;
}

// Preset accessors
export function getAllPresets(): PresetConfig[];
export function getPreset(presetId: string): PresetConfig;
export function presetExists(presetId: string): boolean;
export function getStandardPresets(): PresetConfig[];
export function getSpecialPresets(): PresetConfig[];
export function getRecommendedPreset(): PresetConfig;
export function getSelectionGuide(): SelectionGuideItem[];
export function getTwoPhaseWorkflow(): TwoPhaseWorkflow;

// Model accessors
export function getAllModels(): ModelConfig[];
export function getModel(modelId: string): ModelConfig;
export function modelExists(modelId: string): boolean;
export function getModelsByTier(tier: string): ModelConfig[];
export function getModelSelectionGuide(): Record<string, ModelConfig[]>;
export function getPricingComparison(): PricingComparison[];

// Validation
export function validatePreset(presetId: string): void;
export function validateModel(modelId: string): void;
export function validateAllPresets(): void;
export function validateAllModels(): void;

// Cost calculation
export function calculateModelCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): number;
export function getPresetEstimatedCost(presetId: string): number;
export function comparePresetCosts(presetIds: string[]): CostComparison[];

// Helper functions
export function getPresetForUseCase(useCase: string): PresetConfig | null;
export function getPresetsByPriority(priority: string): PresetConfig[];
export function getPresetModels(presetId: string): Record<string, string>;
export function getValidPresetIds(): string[];
export function getValidModelIds(): string[];
