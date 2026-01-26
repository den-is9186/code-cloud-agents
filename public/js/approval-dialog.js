/**
 * Approval Dialog Script
 *
 * Manages prototype approval workflow with 4 actions:
 * - Approve: Accept prototype and start premium phase
 * - Reject: Reject prototype and end workflow
 * - Partial: Approve with modification requests
 * - Skip: Postpone decision
 */

import { API } from './api.js';

// ===================================================================
// STATE
// ===================================================================
let teamId = null;
let team = null;
let buildId = null;
let buildData = null;
let fileChanges = [];
let selectedAction = null;

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
  loadApprovalData();
});

function initializeEventListeners() {
  // Action Buttons
  document.getElementById('approveBtn').addEventListener('click', () => handleAction('approve'));
  document.getElementById('partialBtn').addEventListener('click', () => handleAction('partial'));
  document.getElementById('rejectBtn').addEventListener('click', () => handleAction('reject'));
  document.getElementById('skipBtn').addEventListener('click', () => handleAction('skip'));

  // Confirmation Modal
  document.getElementById('confirmCancelBtn').addEventListener('click', hideConfirmModal);
  document.getElementById('confirmOkBtn').addEventListener('click', executeAction);
}

// ===================================================================
// DATA LOADING
// ===================================================================
async function loadApprovalData() {
  showLoading(true);

  try {
    // Load team data
    team = await API.getTeam(teamId);

    // Validate team is in awaiting_approval state
    if (team.status !== 'awaiting_approval') {
      alert(`Team ist nicht im Status "Wartet auf Freigabe".\nAktueller Status: ${team.status}`);
      window.location.href = '/index.html';
      return;
    }

    // Get latest build
    buildId = team.currentBuildId || team.lastBuildId;

    if (buildId) {
      // Load build data
      buildData = await API.getBuildStatus(buildId);
      fileChanges = buildData.fileChanges || [];
    }

    // Update UI
    updateTeamInfo();
    updatePrototypeResults();
    updateAgentExecution();
    updateFileChanges();
    updateModificationsList();
  } catch (error) {
    console.error('Failed to load approval data:', error);
    alert('Fehler beim Laden der Freigabe-Daten');
    window.location.href = '/index.html';
  } finally {
    showLoading(false);
  }
}

function updateTeamInfo() {
  document.getElementById('teamName').textContent = team.name;
  document.getElementById('teamRepo').textContent = formatRepo(team.repo);
  document.getElementById('teamPreset').textContent = `Preset ${team.preset}`;
  document.getElementById('teamPhase').textContent = team.phase || 'prototype';
  document.getElementById('teamTask').textContent = team.task || '-';
  document.getElementById('teamStatus').textContent = formatStatus(team.status);
}

function updatePrototypeResults() {
  if (!buildData) {
    document.getElementById('buildSummary').textContent = 'Keine Build-Daten verfügbar';
    return;
  }

  // Results stats
  document.getElementById('filesChanged').textContent = buildData.filesChanged || 0;
  document.getElementById('testsWritten').textContent = buildData.testsWritten || 0;
  document.getElementById('docsUpdated').textContent = buildData.docsUpdated ? '✓' : '-';
  document.getElementById('buildCost').textContent = `$${(buildData.totalCost || 0).toFixed(2)}`;
  document.getElementById('buildDuration').textContent = formatDuration(buildData.duration);

  // Build summary
  const summary = buildData.metadata?.summary || buildData.summary || 'Prototyp erfolgreich erstellt';
  document.getElementById('buildSummary').textContent = summary;
}

function updateAgentExecution() {
  const container = document.getElementById('agentExecutionList');
  container.innerHTML = '';

  if (!buildData || !buildData.agentRuns || buildData.agentRuns.length === 0) {
    container.innerHTML = '<p style="color: var(--gray-500);">Keine Agent-Ausführungen verfügbar</p>';
    return;
  }

  for (const run of buildData.agentRuns) {
    const item = document.createElement('div');
    item.className = 'agent-execution-item';
    item.innerHTML = `
      <div class="agent-execution-icon">
        ${getAgentIcon(run.agentName)}
      </div>
      <div class="agent-execution-info">
        <div class="agent-execution-name">${formatAgentName(run.agentName)}</div>
        <div class="agent-execution-details">
          <span>Tokens: ${(run.tokensUsed || 0).toLocaleString()}</span>
          <span>Cost: $${(run.cost || 0).toFixed(2)}</span>
          <span>Dauer: ${formatDuration(run.duration)}</span>
        </div>
      </div>
      <span class="agent-execution-status ${run.success ? 'success' : 'failed'}">
        ${run.success ? '✓ Erfolgreich' : '✗ Fehlgeschlagen'}
      </span>
    `;
    container.appendChild(item);
  }
}

function updateFileChanges() {
  const container = document.getElementById('fileChangesList');
  container.innerHTML = '';

  if (fileChanges.length === 0) {
    container.innerHTML = '<p style="color: var(--gray-500);">Keine Dateiänderungen verfügbar</p>';
    document.getElementById('fileChangesCount').textContent = '0 Dateien';
    return;
  }

  document.getElementById('fileChangesCount').textContent = `${fileChanges.length} Dateien`;

  for (const change of fileChanges) {
    const item = document.createElement('div');
    item.className = 'file-change-item';
    item.innerHTML = `
      <span class="file-change-path">${change.path || change.file}</span>
      <span class="file-change-badge ${change.type || 'modified'}">
        ${formatChangeType(change.type || 'modified')}
      </span>
    `;
    container.appendChild(item);
  }
}

function updateModificationsList() {
  const container = document.getElementById('modificationsList');
  container.innerHTML = '';

  if (fileChanges.length === 0) {
    return;
  }

  for (const change of fileChanges) {
    const item = document.createElement('div');
    item.className = 'modification-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `mod-${change.path || change.file}`;
    checkbox.value = change.path || change.file;

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = change.path || change.file;

    item.appendChild(checkbox);
    item.appendChild(label);
    container.appendChild(item);
  }
}

// ===================================================================
// ACTION HANDLERS
// ===================================================================
function handleAction(action) {
  selectedAction = action;

  // Show modifications section for partial approval
  const modificationsSection = document.getElementById('modificationsSection');
  if (action === 'partial') {
    modificationsSection.style.display = 'block';
  } else {
    modificationsSection.style.display = 'none';
  }

  // Show confirmation modal
  showConfirmModal(action);
}

function showConfirmModal(action) {
  const modal = document.getElementById('confirmModal');
  const title = document.getElementById('confirmTitle');
  const message = document.getElementById('confirmMessage');

  const messages = {
    approve: {
      title: '✅ Prototyp freigeben?',
      message: 'Der Prototyp wird freigegeben und die Premium-Phase wird gestartet. Diese Aktion kann nicht rückgängig gemacht werden.'
    },
    reject: {
      title: '❌ Prototyp ablehnen?',
      message: 'Der Prototyp wird abgelehnt und der Workflow wird beendet. Diese Aktion kann nicht rückgängig gemacht werden.'
    },
    partial: {
      title: '⚠️ Teilweise freigeben?',
      message: 'Der Prototyp wird mit Änderungswünschen freigegeben. Die angegebenen Dateien werden überarbeitet.'
    },
    skip: {
      title: '⏭️ Entscheidung überspringen?',
      message: 'Die Entscheidung wird auf später verschoben. Du kannst jederzeit zurückkehren.'
    }
  };

  const config = messages[action];
  title.textContent = config.title;
  message.textContent = config.message;

  modal.style.display = 'flex';
}

function hideConfirmModal() {
  document.getElementById('confirmModal').style.display = 'none';
  selectedAction = null;
}

async function executeAction() {
  hideConfirmModal();
  showLoading(true);

  try {
    const comment = document.getElementById('decisionComment').value.trim();

    switch (selectedAction) {
      case 'approve':
        await handleApprove(comment);
        break;
      case 'reject':
        await handleReject(comment);
        break;
      case 'partial':
        await handlePartial(comment);
        break;
      case 'skip':
        await handleSkip(comment);
        break;
    }
  } catch (error) {
    console.error('Action failed:', error);
    alert(`Fehler: ${error.message}`);
    showLoading(false);
  }
}

async function handleApprove(comment) {
  try {
    const response = await API.approvePrototype(teamId, {
      userId: 'dashboard-user', // In production, get from auth
      reason: comment || 'Prototyp freigegeben',
      buildId: buildId
    });

    alert('✅ Prototyp wurde erfolgreich freigegeben!\n\nDie Premium-Phase wird jetzt gestartet.');
    window.location.href = '/index.html';
  } catch (error) {
    throw new Error(`Fehler beim Freigeben: ${error.message}`);
  }
}

async function handleReject(comment) {
  try {
    const response = await API.rejectPrototype(teamId, {
      userId: 'dashboard-user',
      reason: comment || 'Prototyp abgelehnt',
      buildId: buildId
    });

    alert('❌ Prototyp wurde abgelehnt.\n\nDer Workflow wurde beendet.');
    window.location.href = '/index.html';
  } catch (error) {
    throw new Error(`Fehler beim Ablehnen: ${error.message}`);
  }
}

async function handlePartial(comment) {
  try {
    // Get selected files for modification
    const selectedFiles = [];
    const checkboxes = document.querySelectorAll('#modificationsList input[type="checkbox"]:checked');
    checkboxes.forEach(cb => selectedFiles.push(cb.value));

    const modificationsText = document.getElementById('modificationsText').value.trim();

    const modifications = {
      files: selectedFiles,
      description: modificationsText,
      comment: comment
    };

    const response = await API.approvePrototype(teamId, {
      userId: 'dashboard-user',
      reason: comment || 'Teilweise freigegeben mit Änderungswünschen',
      buildId: buildId,
      partial: true,
      modifications: modifications
    });

    alert('⚠️ Prototyp wurde teilweise freigegeben.\n\nDie Änderungswünsche werden berücksichtigt.');
    window.location.href = '/index.html';
  } catch (error) {
    throw new Error(`Fehler beim teilweisen Freigeben: ${error.message}`);
  }
}

async function handleSkip(comment) {
  try {
    // In a real implementation, this might update team metadata
    // For now, just save a note and return to dashboard
    if (comment) {
      await API.updateTeam(teamId, {
        metadata: {
          skipNote: comment,
          skippedAt: new Date().toISOString()
        }
      });
    }

    alert('⏭️ Entscheidung wurde übersprungen.\n\nDu kannst später zurückkehren.');
    window.location.href = '/index.html';
  } catch (error) {
    throw new Error(`Fehler beim Überspringen: ${error.message}`);
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
    awaiting_approval: 'Wartet auf Freigabe',
    approved: 'Freigegeben',
    rejected: 'Abgelehnt',
  };
  return statusMap[status] || status;
}

function formatDuration(ms) {
  if (!ms) return '-';

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
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

function formatChangeType(type) {
  const typeMap = {
    added: '+ Hinzugefügt',
    modified: '~ Geändert',
    deleted: '- Gelöscht',
  };
  return typeMap[type] || type;
}
