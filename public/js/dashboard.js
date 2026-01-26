/**
 * Dashboard Main Script
 *
 * Manages team list, stats, and UI interactions
 */

import { TeamCard } from './components/TeamCard.js';
import { API } from './api.js';

// ===================================================================
// STATE
// ===================================================================
let teams = [];
let filteredTeams = [];

// ===================================================================
// INITIALIZATION
// ===================================================================
document.addEventListener('DOMContentLoaded', () => {
  initializeEventListeners();
  loadDashboard();
});

function initializeEventListeners() {
  // Create Team Button
  document.getElementById('createTeamBtn').addEventListener('click', openCreateTeamModal);

  // Create Team Form
  document.getElementById('createTeamForm').addEventListener('submit', handleCreateTeam);

  // Search Input
  document.getElementById('searchInput').addEventListener('input', handleSearch);

  // Status Filter
  document.getElementById('statusFilter').addEventListener('change', handleFilterChange);
}

// ===================================================================
// DATA LOADING
// ===================================================================
async function loadDashboard() {
  showLoading(true);

  try {
    // Load teams
    teams = await API.getTeams();
    filteredTeams = [...teams];

    // Update UI
    updateStats();
    renderTeams();

    if (teams.length === 0) {
      showEmptyState();
    }
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    showError('Fehler beim Laden der Teams');
  } finally {
    showLoading(false);
  }
}

// ===================================================================
// STATS
// ===================================================================
function updateStats() {
  const totalTeams = teams.length;
  const activeBuilds = teams.filter(
    (t) => t.status === 'PROTOTYPE_RUNNING' || t.status === 'PREMIUM_RUNNING'
  ).length;
  const completedBuilds = teams.filter((t) => t.status === 'COMPLETED').length;
  const totalCost = teams.reduce((sum, t) => sum + (t.totalCost || 0), 0);

  document.getElementById('totalTeams').textContent = totalTeams;
  document.getElementById('activeBuilds').textContent = activeBuilds;
  document.getElementById('completedBuilds').textContent = completedBuilds;
  document.getElementById('totalCost').textContent = `$${totalCost.toFixed(2)}`;
}

// ===================================================================
// TEAMS RENDERING
// ===================================================================
function renderTeams() {
  const grid = document.getElementById('teamsGrid');

  if (filteredTeams.length === 0) {
    grid.innerHTML = '';
    showEmptyState();
    return;
  }

  hideEmptyState();

  grid.innerHTML = filteredTeams
    .map((team) => TeamCard.render(team))
    .join('');

  // Attach event listeners to cards
  filteredTeams.forEach((team) => {
    const card = document.getElementById(`team-${team.id}`);
    if (card) {
      card.addEventListener('click', () => viewTeamDetails(team.id));
    }
  });
}

// ===================================================================
// SEARCH & FILTER
// ===================================================================
function handleSearch(event) {
  const query = event.target.value.toLowerCase();
  filterTeams(query);
}

function handleFilterChange(event) {
  const status = event.target.value;
  filterTeams(null, status);
}

function filterTeams(searchQuery = null, statusFilter = null) {
  const query = searchQuery !== null
    ? searchQuery
    : document.getElementById('searchInput').value.toLowerCase();

  const status = statusFilter !== null
    ? statusFilter
    : document.getElementById('statusFilter').value;

  filteredTeams = teams.filter((team) => {
    const matchesSearch = team.name.toLowerCase().includes(query) ||
      team.repo.toLowerCase().includes(query);

    const matchesStatus = status === 'all' || team.status === status;

    return matchesSearch && matchesStatus;
  });

  renderTeams();
}

// ===================================================================
// CREATE TEAM MODAL
// ===================================================================
function openCreateTeamModal() {
  document.getElementById('createTeamModal').style.display = 'flex';
}

window.closeCreateTeamModal = function() {
  document.getElementById('createTeamModal').style.display = 'none';
  document.getElementById('createTeamForm').reset();
};

async function handleCreateTeam(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const data = {
    name: formData.get('name'),
    repo: formData.get('repo'),
    preset: formData.get('preset'),
    task: formData.get('task'),
  };

  try {
    const newTeam = await API.createTeam(data);

    // Add to teams list
    teams.unshift(newTeam);
    filteredTeams = [...teams];

    // Update UI
    updateStats();
    renderTeams();

    // Close modal
    window.closeCreateTeamModal();

    // Show success message
    showSuccess('Team erfolgreich erstellt!');
  } catch (error) {
    console.error('Failed to create team:', error);
    showError('Fehler beim Erstellen des Teams');
  }
}

// ===================================================================
// TEAM DETAILS
// ===================================================================
function viewTeamDetails(teamId) {
  window.location.href = `/team.html?id=${teamId}`;
}

// ===================================================================
// UI HELPERS
// ===================================================================
function showLoading(show) {
  document.getElementById('loadingState').style.display = show ? 'block' : 'none';
}

function showEmptyState() {
  document.getElementById('emptyState').style.display = 'block';
  document.getElementById('teamsGrid').style.display = 'none';
}

function hideEmptyState() {
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('teamsGrid').style.display = 'grid';
}

function showSuccess(message) {
  // Simple success notification (can be enhanced with a toast library)
  alert(`✅ ${message}`);
}

function showError(message) {
  // Simple error notification (can be enhanced with a toast library)
  alert(`❌ ${message}`);
}

// ===================================================================
// AUTO REFRESH (Optional)
// ===================================================================
// Refresh dashboard every 30 seconds
setInterval(() => {
  loadDashboard();
}, 30000);
