/**
 * Build Progress Script
 *
 * Displays real-time build progress with:
 * - Overall progress bar
 * - Agent execution status
 * - Live log streaming
 * - Cost tracking
 */

import { API } from './api.js';

// ===================================================================
// STATE
// ===================================================================
let buildId = null;
let teamId = null;
let buildData = null;
let pollInterval = null;
let logsPaused = false;
let logs = [];

const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds
const AGENT_SEQUENCE = ['supervisor', 'architect', 'coach', 'code', 'review', 'test', 'docs'];

// ===================================================================
// INITIALIZATION
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Get build ID from URL
  const params = new URLSearchParams(window.location.search);
  buildId = params.get('id');
  teamId = params.get('teamId');

  if (!buildId) {
    alert('Build ID fehlt!');
    window.location.href = '/index.html';
    return;
  }

  initializeEventListeners();
  startPolling();
});

function initializeEventListeners() {
  // Log controls
  document.getElementById('pauseLogsBtn').addEventListener('click', toggleLogsPause);
  document.getElementById('clearLogsBtn').addEventListener('click', clearLogs);
  document.getElementById('downloadLogsBtn').addEventListener('click', downloadLogs);

  // Action buttons
  document.getElementById('viewResultsBtn')?.addEventListener('click', () => {
    if (teamId) {
      window.location.href = `/approval-dialog.html?id=${teamId}`;
    }
  });

  document.getElementById('backToDashboardBtn')?.addEventListener('click', () => {
    window.location.href = '/index.html';
  });

  document.getElementById('errorOkBtn')?.addEventListener('click', () => {
    document.getElementById('errorModal').style.display = 'none';
  });
}

// ===================================================================
// POLLING
// ===================================================================
function startPolling() {
  // Initial load
  updateBuildStatus();

  // Poll for updates
  pollInterval = setInterval(updateBuildStatus, POLL_INTERVAL_MS);
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

async function updateBuildStatus() {
  try {
    // Fetch build status
    buildData = await API.getBuildStatus(buildId);

    // Update UI
    updateBuildInfo();
    updateOverallProgress();
    updateAgentProgress();
    updateCostTracking();
    updateLogs();

    // Check if build is complete or failed
    if (buildData.status === 'completed') {
      handleBuildComplete();
    } else if (buildData.status === 'failed') {
      handleBuildFailed();
    }
  } catch (error) {
    console.error('Failed to fetch build status:', error);
    addLog('error', 'System', 'Fehler beim Laden des Build-Status');
  }
}

function handleBuildComplete() {
  stopPolling();
  addLog('success', 'System', '✅ Build erfolgreich abgeschlossen!');
  document.getElementById('buildStatus').textContent = 'Abgeschlossen';
  document.getElementById('buildStatus').className = 'status-badge status-success';
  document.getElementById('liveIndicator').style.display = 'none';
  document.getElementById('actionsCard').style.display = 'block';
}

function handleBuildFailed() {
  stopPolling();
  const errorMessage = buildData.errorMessage || 'Unbekannter Fehler';
  addLog('error', 'System', `❌ Build fehlgeschlagen: ${errorMessage}`);
  document.getElementById('buildStatus').textContent = 'Fehlgeschlagen';
  document.getElementById('buildStatus').className = 'status-badge status-danger';
  document.getElementById('liveIndicator').style.display = 'none';

  // Show error modal
  document.getElementById('errorMessage').textContent = errorMessage;
  document.getElementById('errorModal').style.display = 'flex';
}

// ===================================================================
// UI UPDATES
// ===================================================================
function updateBuildInfo() {
  document.getElementById('buildId').textContent = buildData.buildId || buildId;
  document.getElementById('teamName').textContent = buildData.teamName || '-';
  document.getElementById('buildPhase').textContent = buildData.phase || '-';
  document.getElementById('buildPreset').textContent = buildData.preset || '-';
  document.getElementById('buildStarted').textContent = formatDate(buildData.startedAt);
  document.getElementById('buildDuration').textContent = formatDuration(
    buildData.duration || (Date.now() - new Date(buildData.startedAt).getTime())
  );
}

function updateOverallProgress() {
  const agentRuns = buildData.agentRuns || [];
  const totalAgents = AGENT_SEQUENCE.length;
  const completedAgents = agentRuns.filter(run => run.status === 'completed').length;
  const percent = Math.round((completedAgents / totalAgents) * 100);

  document.getElementById('overallPercent').textContent = `${percent}%`;
  document.getElementById('overallProgressFill').style.width = `${percent}%`;

  // Update current agent info
  const currentAgent = agentRuns.find(run => run.status === 'running');
  if (currentAgent) {
    document.getElementById('currentAgentInfo').textContent =
      `Aktuell: ${formatAgentName(currentAgent.agentName)}`;
  } else if (percent === 100) {
    document.getElementById('currentAgentInfo').textContent = 'Abgeschlossen';
  } else {
    document.getElementById('currentAgentInfo').textContent = 'Warte auf nächsten Agent...';
  }

  // Estimated time
  if (percent > 0 && percent < 100) {
    const elapsed = buildData.duration || 0;
    const estimated = (elapsed / percent) * 100;
    const remaining = estimated - elapsed;
    document.getElementById('estimatedTime').textContent =
      `Geschätzt verbleibend: ${formatDuration(remaining)}`;
  } else {
    document.getElementById('estimatedTime').textContent = '-';
  }
}

function updateAgentProgress() {
  const container = document.getElementById('agentProgressList');
  const agentRuns = buildData.agentRuns || [];

  // Clear and rebuild
  container.innerHTML = '';

  let completedCount = 0;

  for (const agentName of AGENT_SEQUENCE) {
    const run = agentRuns.find(r => r.agentName === agentName);
    const status = run?.status || 'pending';

    if (status === 'completed') completedCount++;

    const item = document.createElement('div');
    item.className = `agent-progress-item ${status}`;
    item.innerHTML = `
      <div class="agent-progress-icon">
        ${getAgentIcon(agentName)}
      </div>
      <div class="agent-progress-info">
        <div class="agent-progress-name">
          ${formatAgentName(agentName)}
          ${status === 'running' ? '<div class="agent-spinner"></div>' : ''}
        </div>
        <div class="agent-progress-details">
          ${run ? `
            <span>Tokens: ${(run.tokensUsed || 0).toLocaleString()}</span>
            <span>Cost: $${(run.cost || 0).toFixed(2)}</span>
            ${run.duration ? `<span>Dauer: ${formatDuration(run.duration)}</span>` : ''}
          ` : '<span>Warte auf Start...</span>'}
        </div>
      </div>
      <span class="agent-progress-status ${status}">
        ${formatAgentStatus(status)}
      </span>
    `;
    container.appendChild(item);
  }

  document.getElementById('agentCount').textContent =
    `${completedCount} / ${AGENT_SEQUENCE.length}`;
}

function updateCostTracking() {
  const agentRuns = buildData.agentRuns || [];

  const totalTokens = agentRuns.reduce((sum, run) => sum + (run.tokensUsed || 0), 0);
  const totalCost = agentRuns.reduce((sum, run) => sum + (run.cost || 0), 0);

  document.getElementById('totalTokens').textContent = totalTokens.toLocaleString();
  document.getElementById('totalCost').textContent = `$${totalCost.toFixed(2)}`;

  // Agent cost breakdown
  const container = document.getElementById('agentCostList');
  container.innerHTML = '';

  for (const run of agentRuns) {
    if (run.cost > 0) {
      const item = document.createElement('div');
      item.className = 'agent-cost-item';
      item.innerHTML = `
        <span class="agent-cost-name">
          ${getAgentIcon(run.agentName)} ${formatAgentName(run.agentName)}
        </span>
        <span class="agent-cost-value">$${run.cost.toFixed(2)}</span>
      `;
      container.appendChild(item);
    }
  }
}

function updateLogs() {
  if (logsPaused) return;

  // Simulate log generation based on agent runs
  const agentRuns = buildData.agentRuns || [];

  for (const run of agentRuns) {
    const logKey = `${run.agentName}-${run.status}`;

    // Check if we've already logged this status
    if (!logs.some(log => log.key === logKey)) {
      if (run.status === 'running') {
        addLog('info', run.agentName, `⚡ Agent ${formatAgentName(run.agentName)} gestartet`, logKey);
      } else if (run.status === 'completed') {
        addLog('success', run.agentName, `✓ Agent ${formatAgentName(run.agentName)} abgeschlossen`, logKey);
      } else if (run.status === 'failed') {
        addLog('error', run.agentName, `✗ Agent ${formatAgentName(run.agentName)} fehlgeschlagen`, logKey);
      }
    }
  }
}

function addLog(level, agent, message, key = null) {
  const logEntry = {
    level,
    agent,
    message,
    timestamp: new Date().toISOString(),
    key: key || `${Date.now()}-${Math.random()}`
  };

  logs.push(logEntry);

  // Render log
  renderLogs();

  // Auto-scroll to bottom
  const container = document.getElementById('logContainer');
  container.scrollTop = container.scrollHeight;
}

function renderLogs() {
  const container = document.getElementById('logContainer');

  if (logs.length === 0) {
    container.innerHTML = '<div class="log-empty">Warte auf Logs...</div>';
    return;
  }

  container.innerHTML = logs.map(log => `
    <div class="log-entry">
      <span class="log-timestamp">${formatLogTime(log.timestamp)}</span>
      <span class="log-level ${log.level}">${log.level.toUpperCase()}</span>
      <span class="log-agent">${log.agent}</span>
      <span class="log-message">${log.message}</span>
    </div>
  `).join('');
}

// ===================================================================
// LOG CONTROLS
// ===================================================================
function toggleLogsPause() {
  logsPaused = !logsPaused;
  const btn = document.getElementById('pauseLogsBtn');
  btn.textContent = logsPaused ? '▶️ Resume' : '⏸️ Pause';
}

function clearLogs() {
  logs = [];
  renderLogs();
}

function downloadLogs() {
  const logText = logs.map(log =>
    `[${log.timestamp}] [${log.level.toUpperCase()}] [${log.agent}] ${log.message}`
  ).join('\n');

  const blob = new Blob([logText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `build-${buildId}-logs.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ===================================================================
// HELPERS
// ===================================================================
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatDuration(ms) {
  if (!ms || ms < 0) return '-';

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

function formatLogTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('de-DE', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatAgentName(agentName) {
  return agentName.charAt(0).toUpperCase() + agentName.slice(1);
}

function formatAgentStatus(status) {
  const statusMap = {
    pending: '⏳ Ausstehend',
    running: '⚡ Läuft',
    completed: '✓ Abgeschlossen',
    failed: '✗ Fehlgeschlagen'
  };
  return statusMap[status] || status;
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
