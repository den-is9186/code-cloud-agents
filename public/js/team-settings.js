/**
 * Team Settings Script
 *
 * Manages team settings, preset selection, agent configuration, and cost estimation
 */

import { API } from './api.js';

// ===================================================================
// STATE
// ===================================================================
let teamId = null;
let team = null;
let currentPreset = null;
let presets = {};
let agentConfigs = {};

// ===================================================================
// INITIALIZATION
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Get team ID from URL
  const params = new URLSearchParams(window.location.search);
  teamId = params.get('id');

  if (!teamId) {
    alert('Team ID fehlt!');
    window.location.href = '/index.html';
    return;
  }

  initializeEventListeners();
  loadTeamSettings();
});

function initializeEventListeners() {
  // Save Settings Button
  document.getElementById('saveSettingsBtn').addEventListener('click', handleSaveSettings);

  // Preset Selection
  document.querySelectorAll('input[name="preset"]').forEach((radio) => {
    radio.addEventListener('change', handlePresetChange);
  });

  // Advanced Settings Toggle
  document.getElementById('toggleAdvancedBtn').addEventListener('click', toggleAdvancedSettings);

  // Danger Zone
  document.getElementById('resetTeamBtn').addEventListener('click', handleResetTeam);
  document.getElementById('deleteTeamBtn').addEventListener('click', handleDeleteTeam);
}

// ===================================================================
// DATA LOADING
// ===================================================================
async function loadTeamSettings() {
  try {
    // Load team data
    team = await API.getTeam(teamId);

    // Load presets
    const presetsData = await API.getPresets();
    presets = presetsData.presets || presetsData;

    // Update UI
    updateTeamInfo();
    updatePresetSelector();
    await loadAgentConfigs();
    updateCostEstimate();
  } catch (error) {
    console.error('Failed to load team settings:', error);
    alert('Fehler beim Laden der Team-Einstellungen');
  }
}

function updateTeamInfo() {
  document.getElementById('teamName').textContent = team.name;
  document.getElementById('teamRepo').textContent = formatRepo(team.repo);
  document.getElementById('teamStatus').textContent = formatStatus(team.status);
  document.getElementById('teamCreated').textContent = formatDate(team.createdAt);
  document.getElementById('currentPhase').textContent = team.phase || 'prototype';
}

function updatePresetSelector() {
  currentPreset = team.preset || 'B';

  // Select current preset
  const radio = document.getElementById(`preset${currentPreset}`);
  if (radio) {
    radio.checked = true;
  }
}

async function loadAgentConfigs() {
  const preset = presets[currentPreset];
  if (!preset || !preset.agents) {
    return;
  }

  const container = document.getElementById('agentConfigList');
  container.innerHTML = '';

  for (const [agentName, agentConfig] of Object.entries(preset.agents)) {
    const modelId = agentConfig.model;
    const model = await getModelInfo(modelId);

    const item = document.createElement('div');
    item.className = 'agent-config-item';
    item.innerHTML = `
      <div class="agent-info">
        <div class="agent-name">
          ${getAgentIcon(agentName)} ${formatAgentName(agentName)}
        </div>
        <div class="agent-model">
          ${model ? model.display_name : modelId}
          ${model ? `<span class="model-badge ${model.tier}">${model.tier}</span>` : ''}
        </div>
      </div>
      <div class="agent-actions">
        <span class="cost-value">~$${estimateAgentCost(agentName, modelId).toFixed(2)}</span>
      </div>
    `;

    container.appendChild(item);
  }
}

async function getModelInfo(modelId) {
  try {
    // In a real app, this would fetch from API
    // For now, return mock data based on model ID
    const modelMap = {
      'deepseek-v3.2': { display_name: 'DeepSeek V3.2', tier: 'budget' },
      'deepseek-r1-0528': { display_name: 'DeepSeek R1', tier: 'budget' },
      'claude-sonnet-4': { display_name: 'Claude Sonnet 4', tier: 'standard' },
      'claude-opus-4': { display_name: 'Claude Opus 4', tier: 'premium' },
    };

    return modelMap[modelId] || { display_name: modelId, tier: 'standard' };
  } catch (error) {
    return null;
  }
}

function estimateAgentCost(agentName, modelId) {
  // Rough estimates based on typical token usage
  const tokenEstimates = {
    supervisor: 1500,
    architect: 8000,
    coach: 5000,
    code: 20000,
    review: 7000,
    test: 10000,
    docs: 5000,
  };

  const modelCosts = {
    'deepseek-v3.2': 0.0005,
    'deepseek-r1-0528': 0.0008,
    'claude-sonnet-4': 0.009,
    'claude-opus-4': 0.045,
  };

  const tokens = tokenEstimates[agentName] || 5000;
  const costPerToken = modelCosts[modelId] || 0.001;

  return tokens * costPerToken;
}

// ===================================================================
// COST ESTIMATION
// ===================================================================
function updateCostEstimate() {
  const preset = presets[currentPreset];
  if (!preset) {
    return;
  }

  // Get preset estimated cost
  const prototypeCost = preset.estimated_cost_per_build || 0;
  const premiumCost = estimatePremiumCost(currentPreset);
  const totalCost = prototypeCost + premiumCost;

  document.getElementById('prototypeEstimate').textContent = `$${prototypeCost.toFixed(2)}`;
  document.getElementById('premiumEstimate').textContent = `$${premiumCost.toFixed(2)}`;
  document.getElementById('totalEstimate').textContent = `$${totalCost.toFixed(2)}`;

  // Update agent cost list
  updateAgentCostList(preset);

  // Update preset comparison
  updatePresetComparison();
}

function estimatePremiumCost(presetId) {
  // Premium typically costs more (using higher-end models)
  const multipliers = {
    A: 1.2,
    B: 1.5,
    C: 1.0, // Already premium
    D: 1.3,
  };

  const preset = presets[presetId];
  const baseCost = preset?.estimated_cost_per_build || 0;
  const multiplier = multipliers[presetId] || 1.2;

  return baseCost * multiplier;
}

function updateAgentCostList(preset) {
  const container = document.getElementById('agentCostList');
  container.innerHTML = '';

  if (!preset.agents) {
    return;
  }

  for (const [agentName, agentConfig] of Object.entries(preset.agents)) {
    const cost = estimateAgentCost(agentName, agentConfig.model);

    const item = document.createElement('div');
    item.className = 'agent-cost-item';
    item.innerHTML = `
      <span class="agent-cost-name">${getAgentIcon(agentName)} ${formatAgentName(agentName)}</span>
      <span class="agent-cost-value">$${cost.toFixed(2)}</span>
    `;

    container.appendChild(item);
  }
}

function updatePresetComparison() {
  const container = document.getElementById('presetComparison');
  container.innerHTML = '';

  const presetIds = ['A', 'B', 'C'];
  const currentCost = presets[currentPreset]?.estimated_cost_per_build || 0;

  for (const presetId of presetIds) {
    const preset = presets[presetId];
    if (!preset) continue;

    const cost = preset.estimated_cost_per_build || 0;
    const diff = cost - currentCost;
    const isCurrent = presetId === currentPreset;

    const item = document.createElement('div');
    item.className = `comparison-item ${isCurrent ? 'current' : ''}`;
    item.innerHTML = `
      <div class="comparison-preset">Preset ${presetId}</div>
      <div class="comparison-cost">$${cost.toFixed(0)}</div>
      ${!isCurrent ? `
        <div class="comparison-diff ${diff > 0 ? 'negative' : 'positive'}">
          ${diff > 0 ? '+' : ''}$${Math.abs(diff).toFixed(0)}
        </div>
      ` : '<div class="comparison-diff">Aktuell</div>'}
    `;

    container.appendChild(item);
  }
}

// ===================================================================
// EVENT HANDLERS
// ===================================================================
function handlePresetChange(event) {
  currentPreset = event.target.value;

  // Reload agent configs for new preset
  loadAgentConfigs();

  // Update cost estimate
  updateCostEstimate();
}

function toggleAdvancedSettings() {
  const section = document.getElementById('advancedSettings');
  const isVisible = section.style.display !== 'none';

  section.style.display = isVisible ? 'none' : 'block';

  const btn = document.getElementById('toggleAdvancedBtn');
  btn.textContent = isVisible ? '🔧 Erweiterte Einstellungen' : '🔧 Einfache Ansicht';
}

async function handleSaveSettings() {
  const confirmed = confirm('Möchtest du die Änderungen wirklich speichern?');
  if (!confirmed) return;

  showLoading(true);

  try {
    // Collect settings
    const settings = {
      preset: currentPreset,
      maxIterations: parseInt(document.getElementById('maxIterations').value),
      parallelExecution: document.getElementById('parallelExecution').value,
    };

    // Update team
    await API.updateTeam(teamId, settings);

    alert('✅ Einstellungen erfolgreich gespeichert!');

    // Reload data
    await loadTeamSettings();
  } catch (error) {
    console.error('Failed to save settings:', error);
    alert('❌ Fehler beim Speichern der Einstellungen');
  } finally {
    showLoading(false);
  }
}

async function handleResetTeam() {
  const confirmed = confirm(
    'Team wirklich zurücksetzen? Alle Builds werden gelöscht, aber das Team bleibt erhalten.'
  );
  if (!confirmed) return;

  showLoading(true);

  try {
    // In a real app, this would call a reset endpoint
    alert('✅ Team wurde zurückgesetzt');
    window.location.reload();
  } catch (error) {
    console.error('Failed to reset team:', error);
    alert('❌ Fehler beim Zurücksetzen des Teams');
  } finally {
    showLoading(false);
  }
}

async function handleDeleteTeam() {
  const teamName = team.name;
  const confirmed = confirm(
    `Team "${teamName}" wirklich PERMANENT löschen?\n\nDiese Aktion kann nicht rückgängig gemacht werden!`
  );
  if (!confirmed) return;

  const doubleConfirm = prompt(
    `Bitte tippe "${teamName}" ein, um zu bestätigen:`
  );

  if (doubleConfirm !== teamName) {
    alert('Löschvorgang abgebrochen.');
    return;
  }

  showLoading(true);

  try {
    await API.deleteTeam(teamId);
    alert('✅ Team wurde gelöscht');
    window.location.href = '/index.html';
  } catch (error) {
    console.error('Failed to delete team:', error);
    alert('❌ Fehler beim Löschen des Teams');
    showLoading(false);
  }
}

// ===================================================================
// UI HELPERS
// ===================================================================
function showLoading(show) {
  document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function formatRepo(repo) {
  const match = repo.match(/github\.com\/(.+)/);
  return match ? match[1] : repo;
}

function formatStatus(status) {
  const statusMap = {
    TEAM_CREATED: 'Neu erstellt',
    PROTOTYPE_RUNNING: 'Prototyp läuft',
    AWAITING_APPROVAL: 'Wartet auf Freigabe',
    APPROVED: 'Freigegeben',
    REJECTED: 'Abgelehnt',
    PREMIUM_RUNNING: 'Premium läuft',
    COMPLETED: 'Abgeschlossen',
    FAILED: 'Fehlgeschlagen',
  };

  return statusMap[status] || status;
}

function formatDate(dateString) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAgentName(agentName) {
  return agentName.charAt(0).toUpperCase() + agentName.slice(1);
}

function getAgentIcon(agentName) {
  const icons = {
    supervisor: '👔',
    architect: '🏗️',
    coach: '🎯',
    code: '💻',
    review: '🔍',
    test: '🧪',
    docs: '📝',
  };

  return icons[agentName] || '🤖';
}
