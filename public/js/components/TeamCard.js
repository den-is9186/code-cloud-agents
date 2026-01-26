/**
 * TeamCard Component
 *
 * Renders a single team card with status, progress, and actions
 */

export class TeamCard {
  static render(team) {
    const statusBadge = this.renderStatusBadge(team.status);
    const progressBar = this.renderProgressBar(team);
    const presetBadge = this.renderPresetBadge(team.preset);

    return `
      <div class="team-card" id="team-${team.id}">
        <div class="team-card-header">
          <div class="team-card-title">
            <h3>${this.escapeHtml(team.name)}</h3>
            ${presetBadge}
          </div>
          ${statusBadge}
        </div>

        <div class="team-card-body">
          <div class="team-info">
            <div class="team-info-item">
              <span class="icon">📦</span>
              <span class="text">${this.formatRepo(team.repo)}</span>
            </div>
            <div class="team-info-item">
              <span class="icon">📝</span>
              <span class="text">${this.truncateText(team.task, 60)}</span>
            </div>
            ${team.currentBuildId ? `
              <div class="team-info-item">
                <span class="icon">🚀</span>
                <span class="text">Build: ${team.currentBuildId.slice(0, 8)}...</span>
              </div>
            ` : ''}
          </div>

          ${progressBar}

          <div class="team-stats">
            <div class="team-stat">
              <span class="stat-label">Kosten</span>
              <span class="stat-value">$${(team.totalCost || 0).toFixed(2)}</span>
            </div>
            <div class="team-stat">
              <span class="stat-label">Phase</span>
              <span class="stat-value">${team.phase || 'prototype'}</span>
            </div>
            <div class="team-stat">
              <span class="stat-label">Erstellt</span>
              <span class="stat-value">${this.formatDate(team.createdAt)}</span>
            </div>
          </div>
        </div>

        <div class="team-card-footer">
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); window.viewTeamDetails('${team.id}')">
            Details
          </button>
          ${this.renderActionButton(team)}
        </div>
      </div>
    `;
  }

  static renderStatusBadge(status) {
    const statusConfig = {
      TEAM_CREATED: { label: 'Neu', class: 'info', icon: '🆕' },
      PROTOTYPE_RUNNING: { label: 'Prototyp läuft', class: 'running', icon: '⚡' },
      AWAITING_APPROVAL: { label: 'Wartet auf Freigabe', class: 'warning', icon: '⏳' },
      APPROVED: { label: 'Freigegeben', class: 'success', icon: '✅' },
      REJECTED: { label: 'Abgelehnt', class: 'danger', icon: '❌' },
      PREMIUM_RUNNING: { label: 'Premium läuft', class: 'running', icon: '🚀' },
      COMPLETED: { label: 'Abgeschlossen', class: 'success', icon: '✅' },
      FAILED: { label: 'Fehlgeschlagen', class: 'danger', icon: '❌' },
    };

    const config = statusConfig[status] || { label: status, class: 'default', icon: '❓' };

    return `
      <span class="status-badge status-${config.class}">
        <span class="icon">${config.icon}</span>
        ${config.label}
      </span>
    `;
  }

  static renderProgressBar(team) {
    if (!team.progress) {
      return '';
    }

    const { completed = 0, total = 0, percent = 0 } = team.progress;

    return `
      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-label">Fortschritt</span>
          <span class="progress-percent">${percent}%</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${percent}%"></div>
        </div>
        <div class="progress-details">
          ${completed} von ${total} Agents abgeschlossen
        </div>
      </div>
    `;
  }

  static renderPresetBadge(preset) {
    const presetConfig = {
      A: { label: 'Budget', class: 'budget' },
      B: { label: 'Optimal', class: 'optimal' },
      C: { label: 'Premium', class: 'premium' },
      D: { label: 'Custom', class: 'custom' },
    };

    const config = presetConfig[preset] || { label: preset, class: 'default' };

    return `<span class="preset-badge ${config.class}">${config.label}</span>`;
  }

  static renderActionButton(team) {
    if (team.status === 'AWAITING_APPROVAL') {
      return `
        <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); window.openApprovalDialog('${team.id}')">
          Freigeben
        </button>
      `;
    }

    if (team.status === 'PROTOTYPE_RUNNING' || team.status === 'PREMIUM_RUNNING') {
      return `
        <button class="btn btn-secondary btn-sm" disabled>
          <span class="spinner-sm"></span>
          Läuft...
        </button>
      `;
    }

    return '';
  }

  // ===================================================================
  // HELPERS
  // ===================================================================
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  static truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return this.escapeHtml(text);
    return this.escapeHtml(text.slice(0, maxLength)) + '...';
  }

  static formatRepo(repo) {
    // Extract owner/repo from github.com/owner/repo
    const match = repo.match(/github\.com\/(.+)/);
    return match ? match[1] : repo;
  }

  static formatDate(dateString) {
    if (!dateString) return '-';

    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Gerade eben';
    if (minutes < 60) return `vor ${minutes}m`;
    if (hours < 24) return `vor ${hours}h`;
    if (days < 7) return `vor ${days}d`;

    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }
}

// Add CSS for TeamCard
const style = document.createElement('style');
style.textContent = `
  .team-card {
    background: white;
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    cursor: pointer;
    transition: all 0.2s;
  }

  .team-card:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
    border-color: var(--primary);
  }

  .team-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: var(--spacing-md);
  }

  .team-card-title {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex: 1;
  }

  .team-card-title h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--gray-900);
    margin: 0;
  }

  .team-card-body {
    margin-bottom: var(--spacing-md);
  }

  .team-info {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-md);
  }

  .team-info-item {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.875rem;
    color: var(--gray-600);
  }

  .team-info-item .icon {
    font-size: 1rem;
  }

  .team-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--spacing-md);
    padding-top: var(--spacing-md);
    border-top: 1px solid var(--gray-100);
  }

  .team-stat {
    text-align: center;
  }

  .team-stat .stat-label {
    display: block;
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-bottom: 0.25rem;
  }

  .team-stat .stat-value {
    display: block;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .team-card-footer {
    display: flex;
    justify-content: space-between;
    gap: var(--spacing-sm);
  }

  .btn-sm {
    padding: var(--spacing-xs) var(--spacing-md);
    font-size: 0.75rem;
  }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius-sm);
    font-size: 0.75rem;
    font-weight: 600;
  }

  .status-info { background: #dbeafe; color: #1e40af; }
  .status-running { background: #fef3c7; color: #92400e; }
  .status-warning { background: #fed7aa; color: #9a3412; }
  .status-success { background: #dcfce7; color: #166534; }
  .status-danger { background: #fee2e2; color: #991b1b; }

  .progress-section {
    margin: var(--spacing-md) 0;
  }

  .progress-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: var(--spacing-xs);
  }

  .progress-label {
    font-size: 0.75rem;
    color: var(--gray-600);
  }

  .progress-percent {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--gray-900);
  }

  .progress-bar {
    height: 0.5rem;
    background: var(--gray-200);
    border-radius: var(--radius-sm);
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: var(--primary);
    transition: width 0.3s;
  }

  .progress-details {
    font-size: 0.75rem;
    color: var(--gray-500);
    margin-top: var(--spacing-xs);
  }

  .spinner-sm {
    display: inline-block;
    width: 0.875rem;
    height: 0.875rem;
    border: 2px solid var(--gray-300);
    border-top-color: var(--gray-600);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-right: 0.25rem;
  }
`;

document.head.appendChild(style);
