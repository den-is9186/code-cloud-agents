/**
 * API Client
 *
 * Handles all HTTP requests to the backend API
 */

const API_BASE = '/api';

export class API {
  // ===================================================================
  // TEAMS
  // ===================================================================
  static async getTeams() {
    const response = await fetch(`${API_BASE}/teams`);
    if (!response.ok) {
      throw new Error(`Failed to fetch teams: ${response.statusText}`);
    }
    return response.json();
  }

  static async getTeam(teamId) {
    const response = await fetch(`${API_BASE}/teams/${teamId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch team: ${response.statusText}`);
    }
    return response.json();
  }

  static async createTeam(data) {
    const response = await fetch(`${API_BASE}/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `Failed to create team: ${response.statusText}`);
    }

    return response.json();
  }

  static async updateTeam(teamId, data) {
    const response = await fetch(`${API_BASE}/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to update team: ${response.statusText}`);
    }

    return response.json();
  }

  static async deleteTeam(teamId) {
    const response = await fetch(`${API_BASE}/teams/${teamId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`Failed to delete team: ${response.statusText}`);
    }

    return response.json();
  }

  // ===================================================================
  // WORKFLOW
  // ===================================================================
  static async approvePrototype(teamId, data = {}) {
    const response = await fetch(`${API_BASE}/teams/${teamId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to approve prototype: ${response.statusText}`);
    }

    return response.json();
  }

  static async rejectPrototype(teamId, data = {}) {
    const response = await fetch(`${API_BASE}/teams/${teamId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to reject prototype: ${response.statusText}`);
    }

    return response.json();
  }

  static async partialApprove(teamId, data = {}) {
    const response = await fetch(`${API_BASE}/teams/${teamId}/partial`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to partially approve: ${response.statusText}`);
    }

    return response.json();
  }

  static async skipPremium(teamId) {
    const response = await fetch(`${API_BASE}/teams/${teamId}/skip`, {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error(`Failed to skip premium: ${response.statusText}`);
    }

    return response.json();
  }

  // ===================================================================
  // BUILDS
  // ===================================================================
  static async getBuildStatus(buildId) {
    const response = await fetch(`${API_BASE}/builds/${buildId}/status`);
    if (!response.ok) {
      throw new Error(`Failed to fetch build status: ${response.statusText}`);
    }
    return response.json();
  }

  static async getBuildProgress(buildId) {
    const response = await fetch(`${API_BASE}/builds/${buildId}/progress`);
    if (!response.ok) {
      throw new Error(`Failed to fetch build progress: ${response.statusText}`);
    }
    return response.json();
  }

  static async getTeamBuilds(teamId, limit = 10) {
    const response = await fetch(`${API_BASE}/teams/${teamId}/builds?limit=${limit}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch team builds: ${response.statusText}`);
    }
    return response.json();
  }

  // ===================================================================
  // COSTS
  // ===================================================================
  static async getBuildCost(buildId) {
    const response = await fetch(`${API_BASE}/builds/${buildId}/cost`);
    if (!response.ok) {
      throw new Error(`Failed to fetch build cost: ${response.statusText}`);
    }
    return response.json();
  }

  static async getPresetEstimate(presetId) {
    const response = await fetch(`${API_BASE}/presets/${presetId}/estimate`);
    if (!response.ok) {
      throw new Error(`Failed to fetch preset estimate: ${response.statusText}`);
    }
    return response.json();
  }

  // ===================================================================
  // PRESETS
  // ===================================================================
  static async getPresets() {
    const response = await fetch(`${API_BASE}/presets`);
    if (!response.ok) {
      throw new Error(`Failed to fetch presets: ${response.statusText}`);
    }
    return response.json();
  }

  static async getPreset(presetId) {
    const response = await fetch(`${API_BASE}/presets/${presetId}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch preset: ${response.statusText}`);
    }
    return response.json();
  }
}
