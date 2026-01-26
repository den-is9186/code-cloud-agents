/**
 * Type declarations for Preset Configuration Loader
 * 
 * Provides TypeScript type definitions for preset and model configurations.
 */

// ===================================================================
// LOADERS
// ===================================================================

/**
 * Load both presets and models configuration
 */
export function loadConfig(): {
  presets: any;
  models: any;
};

/**
 * Load presets configuration from YAML
 */
export function loadPresetsYAML(): any;

/**
 * Load models configuration from YAML
 */
export function loadModelsYAML(): any;

/**
 * Clear configuration cache (useful for testing)
 */
export function clearCache(): void;

// ===================================================================
// PRESET ACCESSORS
// ===================================================================

/**
 * Get all available presets
 */
export function getAllPresets(): Record<string, any>;

/**
 * Get a specific preset by ID
 */
export function getPreset(presetId: string): any;

/**
 * Check if a preset exists
 */
export function presetExists(presetId: string): boolean;

/**
 * Get all standard presets (A, B, C, D)
 */
export function getStandardPresets(): Record<string, any>;

/**
 * Get special presets (V, L, LOCAL, etc.)
 */
export function getSpecialPresets(): Record<string, any>;

/**
 * Get recommended preset (marked with recommended: true)
 */
export function getRecommendedPreset(): any;

/**
 * Get preset selection guide
 */
export function getSelectionGuide(): any;

/**
 * Get two-phase workflow configuration
 */
export function getTwoPhaseWorkflow(): any;

// ===================================================================
// MODEL ACCESSORS
// ===================================================================

/**
 * Get all available models
 */
export function getAllModels(): Record<string, any>;

/**
 * Get a specific model by ID
 */
export function getModel(modelId: string): any;

/**
 * Check if a model exists
 */
export function modelExists(modelId: string): boolean;

/**
 * Get models by tier
 */
export function getModelsByTier(tier: string): Record<string, any>;

/**
 * Get model selection guide
 */
export function getModelSelectionGuide(): any;

/**
 * Get pricing comparison
 */
export function getPricingComparison(): any[];

// ===================================================================
// VALIDATION
// ===================================================================

/**
 * Validate preset configuration
 */
export function validatePreset(presetId: string): {
  valid: boolean;
  errors: string[];
};

/**
 * Validate model configuration
 */
export function validateModel(modelId: string): {
  valid: boolean;
  errors: string[];
};

/**
 * Validate all presets
 */
export function validateAllPresets(): {
  valid: boolean;
  results: Record<string, { valid: boolean; errors: string[] }>;
};

/**
 * Validate all models
 */
export function validateAllModels(): {
  valid: boolean;
  results: Record<string, { valid: boolean; errors: string[] }>;
};

// ===================================================================
// COST CALCULATION
// ===================================================================

/**
 * Calculate cost for a model based on token usage
 */
export function calculateModelCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): {
  inputCost: number;
  outputCost: number;
  totalCost: number;
  currency: string;
};

/**
 * Get estimated cost for a preset
 */
export function getPresetEstimatedCost(presetId: string): number | null;

/**
 * Compare costs between presets
 */
export function comparePresetCosts(presetIds: string[]): Array<{
  preset: string;
  estimatedCost: number | null;
}>;

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Get preset for use case
 */
export function getPresetForUseCase(useCase: string): any | null;

/**
 * Get presets by priority
 */
export function getPresetsByPriority(priority: string): any[];

/**
 * Get all agent models for a preset
 */
export function getPresetModels(presetId: string): Record<string, any>;

/**
 * Get list of valid preset IDs
 */
export function getValidPresetIds(): string[];

/**
 * Get list of valid model IDs
 */
export function getValidModelIds(): string[];
