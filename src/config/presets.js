/**
 * Preset Configuration Loader
 *
 * Loads and validates preset and model configurations from YAML files.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

// ===================================================================
// FILE PATHS
// ===================================================================

const CONFIG_DIR = path.join(__dirname, '../../config');
const PRESETS_PATH = path.join(CONFIG_DIR, 'presets.yml');
const MODELS_PATH = path.join(CONFIG_DIR, 'models.yml');

// ===================================================================
// CONFIGURATION CACHE
// ===================================================================

let cachedPresets = null;
let cachedModels = null;

// ===================================================================
// LOADERS
// ===================================================================

/**
 * Load presets configuration from YAML
 */
function loadPresetsYAML() {
  if (cachedPresets) {
    return cachedPresets;
  }

  try {
    const fileContent = fs.readFileSync(PRESETS_PATH, 'utf8');
    const parsed = yaml.parse(fileContent);

    if (!parsed || !parsed.presets) {
      throw new Error('Invalid presets.yml format: missing "presets" key');
    }

    cachedPresets = parsed;
    return parsed;
  } catch (error) {
    throw new Error(`Failed to load presets.yml: ${error.message}`);
  }
}

/**
 * Load models configuration from YAML
 */
function loadModelsYAML() {
  if (cachedModels) {
    return cachedModels;
  }

  try {
    const fileContent = fs.readFileSync(MODELS_PATH, 'utf8');
    const parsed = yaml.parse(fileContent);

    if (!parsed || !parsed.models) {
      throw new Error('Invalid models.yml format: missing "models" key');
    }

    cachedModels = parsed;
    return parsed;
  } catch (error) {
    throw new Error(`Failed to load models.yml: ${error.message}`);
  }
}

/**
 * Load both presets and models
 */
function loadConfig() {
  return {
    presets: loadPresetsYAML(),
    models: loadModelsYAML(),
  };
}

/**
 * Clear cache (useful for testing)
 */
function clearCache() {
  cachedPresets = null;
  cachedModels = null;
}

// ===================================================================
// PRESET ACCESSORS
// ===================================================================

/**
 * Get all available presets
 */
function getAllPresets() {
  const config = loadPresetsYAML();
  return config.presets;
}

/**
 * Get a specific preset by ID
 */
function getPreset(presetId) {
  const presets = getAllPresets();
  const preset = presets[presetId];

  if (!preset) {
    throw new Error(`Preset "${presetId}" not found`);
  }

  return {
    id: presetId,
    ...preset,
  };
}

/**
 * Check if a preset exists
 */
function presetExists(presetId) {
  const presets = getAllPresets();
  return presets[presetId] !== undefined;
}

/**
 * Get all standard presets (A, B, C, D)
 */
function getStandardPresets() {
  const presets = getAllPresets();
  return ['A', 'B', 'B+', 'C', 'D'].reduce((acc, id) => {
    if (presets[id]) {
      acc[id] = { id, ...presets[id] };
    }
    return acc;
  }, {});
}

/**
 * Get special presets (V, L, LOCAL, etc.)
 */
function getSpecialPresets() {
  const presets = getAllPresets();
  return ['V', 'L', 'LOCAL', 'E', 'F'].reduce((acc, id) => {
    if (presets[id]) {
      acc[id] = { id, ...presets[id] };
    }
    return acc;
  }, {});
}

/**
 * Get recommended preset (marked with recommended: true)
 */
function getRecommendedPreset() {
  const presets = getAllPresets();
  const recommended = Object.entries(presets).find(([_, preset]) => preset.recommended);

  if (recommended) {
    const [id, preset] = recommended;
    return { id, ...preset };
  }

  // Default to B if no recommended preset is set
  return getPreset('B');
}

/**
 * Get preset selection guide
 */
function getSelectionGuide() {
  const config = loadPresetsYAML();
  return config.selection_guide || {};
}

/**
 * Get two-phase workflow configuration
 */
function getTwoPhaseWorkflow() {
  const config = loadPresetsYAML();
  return config.two_phase_workflow || {};
}

// ===================================================================
// MODEL ACCESSORS
// ===================================================================

/**
 * Get all available models
 */
function getAllModels() {
  const config = loadModelsYAML();
  return config.models;
}

/**
 * Get a specific model by ID
 */
function getModel(modelId) {
  const models = getAllModels();
  const model = models[modelId];

  if (!model) {
    throw new Error(`Model "${modelId}" not found`);
  }

  return {
    id: modelId,
    ...model,
  };
}

/**
 * Check if a model exists
 */
function modelExists(modelId) {
  const models = getAllModels();
  return models[modelId] !== undefined;
}

/**
 * Get models by tier
 */
function getModelsByTier(tier) {
  const models = getAllModels();
  return Object.entries(models)
    .filter(([_, model]) => model.tier === tier)
    .reduce((acc, [id, model]) => {
      acc[id] = { id, ...model };
      return acc;
    }, {});
}

/**
 * Get model selection guide
 */
function getModelSelectionGuide() {
  const config = loadModelsYAML();
  return config.selection_guide || {};
}

/**
 * Get pricing comparison
 */
function getPricingComparison() {
  const config = loadModelsYAML();
  return config.pricing_comparison || [];
}

// ===================================================================
// VALIDATION
// ===================================================================

/**
 * Validate preset configuration
 */
function validatePreset(presetId) {
  const preset = getPreset(presetId);
  const errors = [];

  // Check required fields
  if (!preset.name) {
    errors.push('Preset must have a name');
  }

  if (!preset.description) {
    errors.push('Preset must have a description');
  }

  if (!preset.agents || typeof preset.agents !== 'object') {
    errors.push('Preset must have agents configuration');
  } else {
    // Validate each agent
    for (const [agentName, agentConfig] of Object.entries(preset.agents)) {
      if (!agentConfig.model) {
        errors.push(`Agent "${agentName}" must have a model specified`);
      } else if (!modelExists(agentConfig.model)) {
        errors.push(`Agent "${agentName}" references unknown model "${agentConfig.model}"`);
      }

      if (!agentConfig.role) {
        errors.push(`Agent "${agentName}" must have a role specified`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate model configuration
 */
function validateModel(modelId) {
  const model = getModel(modelId);
  const errors = [];

  // Check required fields
  if (!model.provider) {
    errors.push('Model must have a provider');
  }

  if (!model.model_id && model.provider !== 'local') {
    errors.push('Model must have a model_id');
  }

  if (!model.display_name) {
    errors.push('Model must have a display_name');
  }

  if (!model.tier) {
    errors.push('Model must have a tier');
  }

  if (!model.pricing) {
    errors.push('Model must have pricing information');
  } else {
    if (model.pricing.input_per_million === undefined) {
      errors.push('Model pricing must include input_per_million');
    }
    if (model.pricing.output_per_million === undefined) {
      errors.push('Model pricing must include output_per_million');
    }
  }

  if (!model.context_window) {
    errors.push('Model must have context_window specified');
  }

  if (!model.max_output) {
    errors.push('Model must have max_output specified');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate all presets
 */
function validateAllPresets() {
  const presets = getAllPresets();
  const results = {};

  for (const presetId of Object.keys(presets)) {
    results[presetId] = validatePreset(presetId);
  }

  const allValid = Object.values(results).every((r) => r.valid);

  return {
    valid: allValid,
    results,
  };
}

/**
 * Validate all models
 */
function validateAllModels() {
  const models = getAllModels();
  const results = {};

  for (const modelId of Object.keys(models)) {
    results[modelId] = validateModel(modelId);
  }

  const allValid = Object.values(results).every((r) => r.valid);

  return {
    valid: allValid,
    results,
  };
}

// ===================================================================
// COST CALCULATION
// ===================================================================

/**
 * Calculate cost for a model based on token usage
 */
function calculateModelCost(modelId, inputTokens, outputTokens) {
  const model = getModel(modelId);

  const inputCost = (inputTokens / 1_000_000) * model.pricing.input_per_million;
  const outputCost = (outputTokens / 1_000_000) * model.pricing.output_per_million;

  return {
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    currency: model.pricing.currency || 'USD',
  };
}

/**
 * Get estimated cost for a preset
 */
function getPresetEstimatedCost(presetId) {
  const preset = getPreset(presetId);
  return preset.estimated_cost_per_build || null;
}

/**
 * Compare costs between presets
 */
function comparePresetCosts(presetIds) {
  return presetIds.map((id) => ({
    preset: id,
    estimatedCost: getPresetEstimatedCost(id),
  }));
}

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Get preset for use case
 */
function getPresetForUseCase(useCase) {
  const guide = getSelectionGuide();
  const presetId = guide.by_use_case?.[useCase];

  if (presetId) {
    return getPreset(presetId);
  }

  return null;
}

/**
 * Get presets by priority
 */
function getPresetsByPriority(priority) {
  const guide = getSelectionGuide();
  const presetIds = guide.by_priority?.[priority];

  if (presetIds && Array.isArray(presetIds)) {
    return presetIds.map((id) => getPreset(id));
  }

  return [];
}

/**
 * Get all agent models for a preset
 */
function getPresetModels(presetId) {
  const preset = getPreset(presetId);
  const models = {};

  if (preset.agents) {
    for (const [agentName, agentConfig] of Object.entries(preset.agents)) {
      if (agentConfig.model) {
        models[agentName] = getModel(agentConfig.model);
      }
    }
  }

  return models;
}

/**
 * Get list of valid preset IDs
 */
function getValidPresetIds() {
  return Object.keys(getAllPresets());
}

/**
 * Get list of valid model IDs
 */
function getValidModelIds() {
  return Object.keys(getAllModels());
}

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = {
  // Loaders
  loadConfig,
  loadPresetsYAML,
  loadModelsYAML,
  clearCache,

  // Preset accessors
  getAllPresets,
  getPreset,
  presetExists,
  getStandardPresets,
  getSpecialPresets,
  getRecommendedPreset,
  getSelectionGuide,
  getTwoPhaseWorkflow,

  // Model accessors
  getAllModels,
  getModel,
  modelExists,
  getModelsByTier,
  getModelSelectionGuide,
  getPricingComparison,

  // Validation
  validatePreset,
  validateModel,
  validateAllPresets,
  validateAllModels,

  // Cost calculation
  calculateModelCost,
  getPresetEstimatedCost,
  comparePresetCosts,

  // Helper functions
  getPresetForUseCase,
  getPresetsByPriority,
  getPresetModels,
  getValidPresetIds,
  getValidModelIds,
};
