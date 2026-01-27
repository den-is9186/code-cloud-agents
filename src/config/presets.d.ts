/**
 * Type declarations for presets.js
 * This file provides TypeScript declarations for the JavaScript presets module
 */

// Preset accessors
export function getAllPresets(): any[];
export function getPreset(presetId: string): any;
export function presetExists(presetId: string): boolean;
export function getStandardPresets(): any[];
export function getSpecialPresets(): any[];
export function getRecommendedPreset(): any;
export function getSelectionGuide(): any;
export function getTwoPhaseWorkflow(): any;

// Model accessors
export function getAllModels(): any[];
export function getModel(modelId: string): any;
export function modelExists(modelId: string): boolean;
export function getModelsByTier(tier: string): any[];
export function getModelSelectionGuide(): any;
export function getPricingComparison(): any;

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
export function getPresetEstimatedCost(presetId: string): any;
export function comparePresetCosts(presetIds: string[]): any[];

// Helper functions
export function getPresetForUseCase(useCase: string): any;
export function getPresetsByPriority(priority: string): any[];
export function getPresetModels(presetId: string): any;
export function getValidPresetIds(): string[];
export function getValidModelIds(): string[];
