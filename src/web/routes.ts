import { Hono } from 'hono';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'yaml';
import { llmClient } from '../llm/client';

const api = new Hono();

const configDir = path.join(__dirname, '../../config');

// GET /api/models - List all available models
api.get('/models', (c) => {
  const raw = parse(fs.readFileSync(path.join(configDir, 'models.yml'), 'utf-8'));
  const models = Object.entries(raw.models as Record<string, any>).map(
    ([id, m]) => ({
      id,
      displayName: m.display_name,
      tier: m.tier,
      provider: m.provider,
      pricing: {
        input: m.pricing.input_per_million,
        output: m.pricing.output_per_million,
      },
    })
  );
  return c.json(models);
});

// GET /api/presets - List all available presets
api.get('/presets', (c) => {
  const raw = parse(fs.readFileSync(path.join(configDir, 'presets.yml'), 'utf-8'));
  const presets = Object.entries(raw.presets as Record<string, any>).map(
    ([id, p]) => ({
      id,
      name: p.name,
      description: p.description,
      estimatedCost: p.estimated_cost_per_build ?? null,
      qualityScore: p.quality_score ?? null,
      recommended: p.recommended ?? false,
    })
  );
  return c.json(presets);
});

// POST /api/run - Execute a task via LLM
api.post('/run', async (c) => {
  const body = await c.req.json<{ task?: string; model?: string; preset?: string }>();
  const { task, model, preset } = body;

  if (!task || typeof task !== 'string' || task.trim().length === 0) {
    return c.json({ ok: false, error: 'task is required' }, 400);
  }

  // Resolve model: explicit model > preset lookup > default
  let modelId = model;
  if (!modelId && preset) {
    const raw = parse(fs.readFileSync(path.join(configDir, 'presets.yml'), 'utf-8'));
    const presetConfig = raw.presets?.[preset];
    if (presetConfig?.agents?.code?.model) {
      modelId = presetConfig.agents.code.model;
    }
  }
  if (!modelId) {
    modelId = 'deepseek-v3.2';
  }

  try {
    const response = await llmClient.chat(modelId, [
      { role: 'user', content: task.trim() },
    ]);

    return c.json({
      ok: true,
      content: response.content,
      usage: response.usage,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ ok: false, error: message }, 500);
  }
});

export { api as apiRoutes };
