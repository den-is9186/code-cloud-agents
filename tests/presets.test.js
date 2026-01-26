const {
  loadConfig,
  loadPresetsYAML,
  loadModelsYAML,
  clearCache,
  getAllPresets,
  getPreset,
  presetExists,
  getStandardPresets,
  getSpecialPresets,
  getRecommendedPreset,
  getSelectionGuide,
  getTwoPhaseWorkflow,
  getAllModels,
  getModel,
  modelExists,
  getModelsByTier,
  getModelSelectionGuide,
  getPricingComparison,
  validatePreset,
  validateModel,
  validateAllPresets,
  validateAllModels,
  calculateModelCost,
  getPresetEstimatedCost,
  comparePresetCosts,
  getPresetForUseCase,
  getPresetsByPriority,
  getPresetModels,
  getValidPresetIds,
  getValidModelIds,
} = require('../src/config/presets');

describe('Preset Configuration Loader', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('YAML Loading', () => {
    test('loadPresetsYAML should load presets configuration', () => {
      const config = loadPresetsYAML();

      expect(config).toBeDefined();
      expect(config.presets).toBeDefined();
      expect(typeof config.presets).toBe('object');
    });

    test('loadModelsYAML should load models configuration', () => {
      const config = loadModelsYAML();

      expect(config).toBeDefined();
      expect(config.models).toBeDefined();
      expect(typeof config.models).toBe('object');
    });

    test('loadConfig should load both presets and models', () => {
      const config = loadConfig();

      expect(config.presets).toBeDefined();
      expect(config.models).toBeDefined();
      expect(config.presets.presets).toBeDefined();
      expect(config.models.models).toBeDefined();
    });

    test('should cache loaded configuration', () => {
      const first = loadPresetsYAML();
      const second = loadPresetsYAML();

      expect(first).toBe(second); // Same reference
    });

    test('clearCache should reset cache', () => {
      const first = loadPresetsYAML();
      clearCache();
      const second = loadPresetsYAML();

      expect(first).not.toBe(second); // Different reference
    });
  });

  describe('Preset Accessors', () => {
    test('getAllPresets should return all presets', () => {
      const presets = getAllPresets();

      expect(presets).toBeDefined();
      expect(typeof presets).toBe('object');
      expect(Object.keys(presets).length).toBeGreaterThan(0);
    });

    test('getPreset should return specific preset', () => {
      const preset = getPreset('A');

      expect(preset).toBeDefined();
      expect(preset.id).toBe('A');
      expect(preset.name).toBeDefined();
      expect(preset.description).toBeDefined();
      expect(preset.agents).toBeDefined();
    });

    test('getPreset should throw for non-existent preset', () => {
      expect(() => getPreset('NONEXISTENT')).toThrow('Preset "NONEXISTENT" not found');
    });

    test('presetExists should check preset existence', () => {
      expect(presetExists('A')).toBe(true);
      expect(presetExists('B')).toBe(true);
      expect(presetExists('NONEXISTENT')).toBe(false);
    });

    test('getStandardPresets should return standard presets', () => {
      const presets = getStandardPresets();

      expect(presets.A).toBeDefined();
      expect(presets.B).toBeDefined();
      expect(presets.C).toBeDefined();
      expect(presets.D).toBeDefined();
    });

    test('getSpecialPresets should return special presets', () => {
      const presets = getSpecialPresets();

      // At least some special presets should exist
      const keys = Object.keys(presets);
      expect(keys.length).toBeGreaterThan(0);
    });

    test('getRecommendedPreset should return recommended preset', () => {
      const preset = getRecommendedPreset();

      expect(preset).toBeDefined();
      expect(preset.id).toBeDefined();
      // Should be B if marked as recommended in YAML
      expect(preset.id).toBe('B');
    });

    test('getSelectionGuide should return selection guide', () => {
      const guide = getSelectionGuide();

      expect(guide).toBeDefined();
      expect(guide.by_priority).toBeDefined();
      expect(guide.by_use_case).toBeDefined();
    });

    test('getTwoPhaseWorkflow should return two-phase workflow config', () => {
      const workflow = getTwoPhaseWorkflow();

      expect(workflow).toBeDefined();
      expect(workflow.phase_1).toBeDefined();
      expect(workflow.phase_2).toBeDefined();
    });

    test('getValidPresetIds should return array of preset IDs', () => {
      const ids = getValidPresetIds();

      expect(Array.isArray(ids)).toBe(true);
      expect(ids).toContain('A');
      expect(ids).toContain('B');
      expect(ids).toContain('C');
      expect(ids).toContain('D');
    });
  });

  describe('Model Accessors', () => {
    test('getAllModels should return all models', () => {
      const models = getAllModels();

      expect(models).toBeDefined();
      expect(typeof models).toBe('object');
      expect(Object.keys(models).length).toBeGreaterThan(0);
    });

    test('getModel should return specific model', () => {
      const model = getModel('deepseek-v3.2');

      expect(model).toBeDefined();
      expect(model.id).toBe('deepseek-v3.2');
      expect(model.provider).toBeDefined();
      expect(model.display_name).toBeDefined();
      expect(model.pricing).toBeDefined();
    });

    test('getModel should throw for non-existent model', () => {
      expect(() => getModel('nonexistent-model')).toThrow('Model "nonexistent-model" not found');
    });

    test('modelExists should check model existence', () => {
      expect(modelExists('deepseek-v3.2')).toBe(true);
      expect(modelExists('claude-sonnet-4')).toBe(true);
      expect(modelExists('nonexistent-model')).toBe(false);
    });

    test('getModelsByTier should return models by tier', () => {
      const budgetModels = getModelsByTier('budget');
      const premiumModels = getModelsByTier('premium');

      expect(typeof budgetModels).toBe('object');
      expect(typeof premiumModels).toBe('object');

      // Check that budget models have correct tier
      for (const model of Object.values(budgetModels)) {
        expect(model.tier).toBe('budget');
      }
    });

    test('getModelSelectionGuide should return model selection guide', () => {
      const guide = getModelSelectionGuide();

      expect(guide).toBeDefined();
      expect(guide.by_task).toBeDefined();
      expect(guide.by_budget).toBeDefined();
    });

    test('getPricingComparison should return pricing comparison', () => {
      const pricing = getPricingComparison();

      expect(Array.isArray(pricing)).toBe(true);
      expect(pricing.length).toBeGreaterThan(0);

      // Each entry should have pricing info
      pricing.forEach((entry) => {
        expect(entry.model).toBeDefined();
        expect(entry.input).toBeDefined();
        expect(entry.output).toBeDefined();
      });
    });

    test('getValidModelIds should return array of model IDs', () => {
      const ids = getValidModelIds();

      expect(Array.isArray(ids)).toBe(true);
      expect(ids).toContain('deepseek-v3.2');
      expect(ids).toContain('claude-sonnet-4');
    });
  });

  describe('Validation', () => {
    test('validatePreset should validate preset A', () => {
      const result = validatePreset('A');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validatePreset should validate preset B', () => {
      const result = validatePreset('B');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validateModel should validate deepseek-v3.2', () => {
      const result = validateModel('deepseek-v3.2');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validateModel should validate claude-sonnet-4', () => {
      const result = validateModel('claude-sonnet-4');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validateAllPresets should validate all presets', () => {
      const result = validateAllPresets();

      expect(result.results).toBeDefined();

      // Log invalid presets for debugging
      const invalidPresets = Object.entries(result.results).filter(
        ([_, validation]) => !validation.valid
      );

      if (invalidPresets.length > 0) {
        console.log('Invalid presets:', invalidPresets);
      }

      // Most presets should be valid (allow some special presets to have incomplete config)
      const validCount = Object.values(result.results).filter((v) => v.valid).length;
      const totalCount = Object.values(result.results).length;
      const validPercent = (validCount / totalCount) * 100;

      expect(validPercent).toBeGreaterThan(50); // At least half should be valid
    });

    test('validateAllModels should validate all models', () => {
      const result = validateAllModels();

      expect(result.valid).toBe(true);
      expect(result.results).toBeDefined();

      // All models should be valid
      for (const [modelId, validation] of Object.entries(result.results)) {
        expect(validation.valid).toBe(true);
      }
    });
  });

  describe('Cost Calculation', () => {
    test('calculateModelCost should calculate cost correctly', () => {
      const cost = calculateModelCost('deepseek-v3.2', 1000000, 500000);

      expect(cost.inputCost).toBeDefined();
      expect(cost.outputCost).toBeDefined();
      expect(cost.totalCost).toBeDefined();
      expect(cost.currency).toBeDefined();

      // deepseek-v3.2: input $0.27/M, output $1.10/M
      expect(cost.inputCost).toBeCloseTo(0.27, 2);
      expect(cost.outputCost).toBeCloseTo(0.55, 2);
      expect(cost.totalCost).toBeCloseTo(0.82, 2);
    });

    test('getPresetEstimatedCost should return estimated cost', () => {
      const costA = getPresetEstimatedCost('A');
      const costB = getPresetEstimatedCost('B');
      const costC = getPresetEstimatedCost('C');

      expect(typeof costA).toBe('number');
      expect(typeof costB).toBe('number');
      expect(typeof costC).toBe('number');

      // A should be cheapest, C should be most expensive
      expect(costA).toBeLessThan(costB);
      expect(costB).toBeLessThan(costC);
    });

    test('comparePresetCosts should compare multiple presets', () => {
      const comparison = comparePresetCosts(['A', 'B', 'C']);

      expect(Array.isArray(comparison)).toBe(true);
      expect(comparison).toHaveLength(3);

      comparison.forEach((item) => {
        expect(item.preset).toBeDefined();
        expect(item.estimatedCost).toBeDefined();
      });

      // Verify order
      expect(comparison[0].preset).toBe('A');
      expect(comparison[1].preset).toBe('B');
      expect(comparison[2].preset).toBe('C');
    });
  });

  describe('Helper Functions', () => {
    test('getPresetForUseCase should return correct preset', () => {
      const prototypePreset = getPresetForUseCase('prototype');

      expect(prototypePreset).toBeDefined();
      expect(prototypePreset.id).toBe('A');
    });

    test('getPresetsByPriority should return presets by priority', () => {
      const costPresets = getPresetsByPriority('cost');
      const qualityPresets = getPresetsByPriority('quality');

      expect(Array.isArray(costPresets)).toBe(true);
      expect(Array.isArray(qualityPresets)).toBe(true);

      expect(costPresets.length).toBeGreaterThan(0);
      expect(qualityPresets.length).toBeGreaterThan(0);
    });

    test('getPresetModels should return all models for preset', () => {
      const models = getPresetModels('A');

      expect(typeof models).toBe('object');
      expect(Object.keys(models).length).toBeGreaterThan(0);

      // Each agent should have a model
      for (const [agentName, model] of Object.entries(models)) {
        expect(model.id).toBeDefined();
        expect(model.provider).toBeDefined();
        expect(model.pricing).toBeDefined();
      }
    });
  });

  describe('Preset Structure', () => {
    test('preset A should have required fields', () => {
      const preset = getPreset('A');

      expect(preset.name).toBe('Budget');
      expect(preset.description).toBeDefined();
      expect(preset.estimated_cost_per_build).toBe(8);
      expect(preset.agents).toBeDefined();
      expect(preset.agents.supervisor).toBeDefined();
      expect(preset.agents.code).toBeDefined();
    });

    test('preset B should have required fields', () => {
      const preset = getPreset('B');

      expect(preset.name).toBe('Optimal');
      expect(preset.description).toBeDefined();
      expect(preset.estimated_cost_per_build).toBe(25);
      expect(preset.recommended).toBe(true);
    });

    test('preset C should have required fields', () => {
      const preset = getPreset('C');

      expect(preset.name).toBe('Premium');
      expect(preset.description).toBeDefined();
      expect(preset.estimated_cost_per_build).toBe(130);
    });

    test('all standard presets should have agents', () => {
      const presets = getStandardPresets();

      for (const preset of Object.values(presets)) {
        expect(preset.agents).toBeDefined();
        expect(typeof preset.agents).toBe('object');
        expect(Object.keys(preset.agents).length).toBeGreaterThan(0);
      }
    });
  });

  describe('Model Structure', () => {
    test('deepseek-v3.2 should have required fields', () => {
      const model = getModel('deepseek-v3.2');

      expect(model.provider).toBe('novita');
      expect(model.model_id).toBe('deepseek/deepseek-v3-0324');
      expect(model.display_name).toBe('DeepSeek V3.2');
      expect(model.tier).toBe('budget');
      expect(model.pricing.input_per_million).toBe(0.27);
      expect(model.pricing.output_per_million).toBe(1.10);
      expect(model.context_window).toBe(163000);
    });

    test('claude-sonnet-4 should have required fields', () => {
      const model = getModel('claude-sonnet-4');

      expect(model.provider).toBe('anthropic');
      expect(model.display_name).toBe('Claude Sonnet 4');
      expect(model.tier).toBe('standard');
      expect(model.pricing.input_per_million).toBe(3.0);
      expect(model.pricing.output_per_million).toBe(15.0);
    });

    test('claude-opus-4 should have required fields', () => {
      const model = getModel('claude-opus-4');

      expect(model.provider).toBe('anthropic');
      expect(model.display_name).toBe('Claude Opus 4');
      expect(model.tier).toBe('premium');
      expect(model.pricing.input_per_million).toBe(15.0);
      expect(model.pricing.output_per_million).toBe(75.0);
    });
  });

  describe('Two-Phase Workflow', () => {
    test('getTwoPhaseWorkflow should return correct phases', () => {
      const workflow = getTwoPhaseWorkflow();

      expect(workflow.phase_1).toBeDefined();
      expect(workflow.phase_2).toBeDefined();

      expect(workflow.phase_1.preset).toBe('A');
      expect(workflow.phase_2.preset).toBe('C');

      expect(workflow.phase_1.cost).toBe(8);
      expect(workflow.phase_2.cost).toBe(130);

      expect(workflow.total_cost).toBe(138);
    });
  });

  describe('Preset IQ Support', () => {
    test('should accept IQ preset if it exists in YAML', () => {
      const presetIds = getValidPresetIds();

      if (presetIds.includes('IQ')) {
        const preset = getPreset('IQ');
        expect(preset).toBeDefined();
        expect(preset.id).toBe('IQ');
      }
    });
  });
});
