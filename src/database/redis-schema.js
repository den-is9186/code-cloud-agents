/**
 * Redis Schema Documentation and Helper Functions
 *
 * This file defines the complete Redis data model for the Multi-Agent Dashboard system.
 */

// ===================================================================
// KEY PREFIXES
// ===================================================================

const PREFIXES = {
  // Primary entities
  TEAM: 'team:',              // team:{teamId}
  BUILD: 'build:',            // build:{buildId}
  AGENT_RUN: 'agent_run:',    // agent_run:{runId}

  // Indexes
  TEAMS_INDEX: 'teams:index',                    // Set of all team IDs
  USER_TEAMS: 'user:teams:',                     // user:teams:{userId} - Set of team IDs
  REPO_TEAMS: 'teams:by_repo:',                  // teams:by_repo:{repo} - Set of team IDs
  STATUS_TEAMS: 'teams:by_status:',              // teams:by_status:{status} - Set of team IDs
  TEAM_BUILDS: 'team:builds:',                   // team:builds:{teamId} - Sorted set of build IDs (by timestamp)
  BUILD_AGENTS: 'build:agents:',                 // build:agents:{buildId} - List of agent run IDs
};

// ===================================================================
// SCHEMA DEFINITIONS
// ===================================================================

/**
 * Team Schema
 *
 * Stores comprehensive team information including workflow state,
 * approval status, and cost tracking.
 *
 * Key: team:{teamId}
 * Type: Hash
 */
const TeamSchema = {
  // Core fields
  id: 'string (UUID)',
  name: 'string',
  repo: 'string (github.com/owner/repo)',
  preset: 'string (A|B|C|D|V|L|LOCAL|IQ)',
  task: 'string',

  // Workflow fields
  workflowState: 'string (WorkflowState)',
  currentPhase: 'string (prototype|approval|premium|complete|error)',
  workflowHistory: 'JSON array',

  // Status fields
  status: 'string (pending|approved|rejected|partial|completed|failed)',
  rejectionReason: 'string (optional)',

  // Cost tracking
  totalCost: 'number',
  budgetLimit: 'number',

  // Build references
  prototypeBuildId: 'string (UUID, optional)',
  premiumBuildId: 'string (UUID, optional)',

  // Ownership
  ownerId: 'string (UUID, optional)',

  // Timestamps
  createdAt: 'ISO 8601 timestamp',
  updatedAt: 'ISO 8601 timestamp',
};

/**
 * Build Schema
 *
 * Stores build execution data including agent runs, costs, and logs.
 *
 * Key: build:{buildId}
 * Type: Hash
 */
const BuildSchema = {
  // Core fields
  id: 'string (UUID)',
  teamId: 'string (UUID)',
  preset: 'string (A|B|C|D|V|L|LOCAL|IQ)',
  phase: 'string (prototype|premium)',

  // Status fields
  status: 'string (pending|running|completed|failed)',

  // Agent tracking
  currentAgent: 'string (agent name, optional)',
  completedAgents: 'JSON array of agent names',

  // Cost tracking
  totalCost: 'number',
  totalTokens: 'number',
  totalInputTokens: 'number',
  totalOutputTokens: 'number',

  // Results
  success: 'boolean',
  errorMessage: 'string (optional)',
  outputPath: 'string (optional)',

  // Timestamps
  startedAt: 'ISO 8601 timestamp',
  completedAt: 'ISO 8601 timestamp (optional)',
  duration: 'number (milliseconds, optional)',
};

/**
 * Agent Run Schema
 *
 * Stores individual agent execution data.
 *
 * Key: agent_run:{runId}
 * Type: Hash
 */
const AgentRunSchema = {
  // Core fields
  id: 'string (UUID)',
  buildId: 'string (UUID)',
  teamId: 'string (UUID)',
  agentName: 'string',

  // Model info
  model: 'string',
  modelVersion: 'string',

  // Status
  status: 'string (pending|running|completed|failed)',

  // Token usage
  inputTokens: 'number',
  outputTokens: 'number',
  totalTokens: 'number',

  // Cost
  cost: 'number',

  // Results
  success: 'boolean',
  errorMessage: 'string (optional)',
  output: 'JSON object (optional)',

  // Timestamps
  startedAt: 'ISO 8601 timestamp',
  completedAt: 'ISO 8601 timestamp (optional)',
  duration: 'number (milliseconds, optional)',
};

// ===================================================================
// INDEX SCHEMAS
// ===================================================================

/**
 * teams:index
 * Type: Set
 * Contains: All team IDs
 * Purpose: Quick listing of all teams
 */

/**
 * user:teams:{userId}
 * Type: Set
 * Contains: Team IDs owned by user
 * Purpose: User-specific team listing
 */

/**
 * teams:by_repo:{repo}
 * Type: Set
 * Contains: Team IDs for a specific repo
 * Purpose: Find all teams for a repository
 */

/**
 * teams:by_status:{status}
 * Type: Set
 * Contains: Team IDs with specific status
 * Purpose: Filter teams by status (pending, approved, etc.)
 */

/**
 * team:builds:{teamId}
 * Type: Sorted Set
 * Score: Timestamp
 * Contains: Build IDs
 * Purpose: Chronological list of builds for a team
 */

/**
 * build:agents:{buildId}
 * Type: List
 * Contains: Agent run IDs in execution order
 * Purpose: Track agent execution sequence
 */

// ===================================================================
// HELPER FUNCTIONS
// ===================================================================

/**
 * Generate a Redis key for a team
 */
function getTeamKey(teamId) {
  return `${PREFIXES.TEAM}${teamId}`;
}

/**
 * Generate a Redis key for a build
 */
function getBuildKey(buildId) {
  return `${PREFIXES.BUILD}${buildId}`;
}

/**
 * Generate a Redis key for an agent run
 */
function getAgentRunKey(runId) {
  return `${PREFIXES.AGENT_RUN}${runId}`;
}

/**
 * Generate a Redis key for user teams index
 */
function getUserTeamsKey(userId) {
  return `${PREFIXES.USER_TEAMS}${userId}`;
}

/**
 * Generate a Redis key for repo teams index
 */
function getRepoTeamsKey(repo) {
  // Normalize repo format: github.com/owner/repo
  const normalized = repo.replace(/^https?:\/\//, '').replace(/\.git$/, '');
  return `${PREFIXES.REPO_TEAMS}${normalized}`;
}

/**
 * Generate a Redis key for status teams index
 */
function getStatusTeamsKey(status) {
  return `${PREFIXES.STATUS_TEAMS}${status}`;
}

/**
 * Generate a Redis key for team builds sorted set
 */
function getTeamBuildsKey(teamId) {
  return `${PREFIXES.TEAM_BUILDS}${teamId}`;
}

/**
 * Generate a Redis key for build agents list
 */
function getBuildAgentsKey(buildId) {
  return `${PREFIXES.BUILD_AGENTS}${buildId}`;
}

/**
 * Add a team to all appropriate indexes
 */
async function addTeamToIndexes(redis, team) {
  const promises = [];

  // Add to main teams index
  promises.push(redis.sadd(PREFIXES.TEAMS_INDEX, team.id));

  // Add to user teams index
  if (team.ownerId) {
    promises.push(redis.sadd(getUserTeamsKey(team.ownerId), team.id));
  }

  // Add to repo teams index
  if (team.repo) {
    promises.push(redis.sadd(getRepoTeamsKey(team.repo), team.id));
  }

  // Add to status teams index
  if (team.status) {
    promises.push(redis.sadd(getStatusTeamsKey(team.status), team.id));
  }

  await Promise.all(promises);
}

/**
 * Remove a team from all indexes
 */
async function removeTeamFromIndexes(redis, team) {
  const promises = [];

  // Remove from main teams index
  promises.push(redis.srem(PREFIXES.TEAMS_INDEX, team.id));

  // Remove from user teams index
  if (team.ownerId) {
    promises.push(redis.srem(getUserTeamsKey(team.ownerId), team.id));
  }

  // Remove from repo teams index
  if (team.repo) {
    promises.push(redis.srem(getRepoTeamsKey(team.repo), team.id));
  }

  // Remove from status teams index
  if (team.status) {
    promises.push(redis.srem(getStatusTeamsKey(team.status), team.id));
  }

  await Promise.all(promises);
}

/**
 * Update team status index when status changes
 */
async function updateTeamStatusIndex(redis, teamId, oldStatus, newStatus) {
  const promises = [];

  if (oldStatus) {
    promises.push(redis.srem(getStatusTeamsKey(oldStatus), teamId));
  }

  if (newStatus) {
    promises.push(redis.sadd(getStatusTeamsKey(newStatus), teamId));
  }

  await Promise.all(promises);
}

/**
 * Add a build to team's builds sorted set
 */
async function addBuildToTeam(redis, teamId, buildId, timestamp = Date.now()) {
  await redis.zadd(getTeamBuildsKey(teamId), timestamp, buildId);
}

/**
 * Get all builds for a team (newest first)
 */
async function getTeamBuilds(redis, teamId, limit = 10) {
  const buildIds = await redis.zrevrange(getTeamBuildsKey(teamId), 0, limit - 1);
  return buildIds;
}

/**
 * Add an agent run to build's agents list
 */
async function addAgentRunToBuild(redis, buildId, agentRunId) {
  await redis.rpush(getBuildAgentsKey(buildId), agentRunId);
}

/**
 * Get all agent runs for a build (in execution order)
 */
async function getBuildAgentRuns(redis, buildId) {
  const runIds = await redis.lrange(getBuildAgentsKey(buildId), 0, -1);
  return runIds;
}

/**
 * Create a new build record
 */
async function createBuild(redis, buildData) {
  const buildKey = getBuildKey(buildData.id);

  const build = {
    ...buildData,
    status: buildData.status || 'pending',
    totalCost: buildData.totalCost || 0,
    totalTokens: buildData.totalTokens || 0,
    totalInputTokens: buildData.totalInputTokens || 0,
    totalOutputTokens: buildData.totalOutputTokens || 0,
    completedAgents: JSON.stringify(buildData.completedAgents || []),
    startedAt: buildData.startedAt || new Date().toISOString(),
  };

  await redis.hmset(buildKey, build);
  await addBuildToTeam(redis, buildData.teamId, buildData.id);

  return build;
}

/**
 * Get a build by ID
 */
async function getBuild(redis, buildId) {
  const buildKey = getBuildKey(buildId);
  const build = await redis.hgetall(buildKey);

  if (!build || Object.keys(build).length === 0) {
    return null;
  }

  // Parse JSON fields
  if (build.completedAgents) {
    try {
      build.completedAgents = JSON.parse(build.completedAgents);
    } catch (error) {
      // If parsing fails, log warning and use empty array
      console.warn('Failed to parse completedAgents, using empty array', {
        buildId,
        completedAgents: build.completedAgents,
        error: error.message,
      });
      build.completedAgents = [];
    }
  }

  // Convert numeric fields
  if (build.totalCost) build.totalCost = parseFloat(build.totalCost);
  if (build.totalTokens) build.totalTokens = parseInt(build.totalTokens, 10);
  if (build.totalInputTokens) build.totalInputTokens = parseInt(build.totalInputTokens, 10);
  if (build.totalOutputTokens) build.totalOutputTokens = parseInt(build.totalOutputTokens, 10);
  if (build.duration) build.duration = parseInt(build.duration, 10);

  // Convert boolean fields
  if (build.success !== undefined) {
    build.success = build.success === true || build.success === 'true';
  }

  return build;
}

/**
 * Update build status and cost
 */
async function updateBuild(redis, buildId, updates) {
  const buildKey = getBuildKey(buildId);

  // Serialize JSON fields
  const serialized = { ...updates };
  if (serialized.completedAgents) {
    serialized.completedAgents = JSON.stringify(serialized.completedAgents);
  }

  // Convert boolean to string
  if (typeof serialized.success === 'boolean') {
    serialized.success = serialized.success.toString();
  }

  if (updates.status === 'completed' && !updates.completedAt) {
    serialized.completedAt = new Date().toISOString();
  }

  await redis.hmset(buildKey, serialized);
}

/**
 * Create a new agent run record
 */
async function createAgentRun(redis, agentRunData) {
  const runKey = getAgentRunKey(agentRunData.id);

  const agentRun = {
    ...agentRunData,
    status: agentRunData.status || 'pending',
    inputTokens: agentRunData.inputTokens || 0,
    outputTokens: agentRunData.outputTokens || 0,
    totalTokens: agentRunData.totalTokens || 0,
    cost: agentRunData.cost || 0,
    startedAt: agentRunData.startedAt || new Date().toISOString(),
  };

  // Serialize JSON fields
  if (agentRun.output) {
    agentRun.output = JSON.stringify(agentRun.output);
  }

  await redis.hmset(runKey, agentRun);
  await addAgentRunToBuild(redis, agentRunData.buildId, agentRunData.id);

  return agentRun;
}

/**
 * Get an agent run by ID
 */
async function getAgentRun(redis, runId) {
  const runKey = getAgentRunKey(runId);
  const agentRun = await redis.hgetall(runKey);

  if (!agentRun || Object.keys(agentRun).length === 0) {
    return null;
  }

  // Parse JSON fields
  if (agentRun.output) {
    agentRun.output = JSON.parse(agentRun.output);
  }

  // Convert numeric fields
  if (agentRun.inputTokens) agentRun.inputTokens = parseInt(agentRun.inputTokens, 10);
  if (agentRun.outputTokens) agentRun.outputTokens = parseInt(agentRun.outputTokens, 10);
  if (agentRun.totalTokens) agentRun.totalTokens = parseInt(agentRun.totalTokens, 10);
  if (agentRun.cost) agentRun.cost = parseFloat(agentRun.cost);
  if (agentRun.duration) agentRun.duration = parseInt(agentRun.duration, 10);

  // Convert boolean fields
  if (agentRun.success !== undefined) {
    agentRun.success = agentRun.success === true || agentRun.success === 'true';
  }

  return agentRun;
}

/**
 * Update agent run status and metrics
 */
async function updateAgentRun(redis, runId, updates) {
  const runKey = getAgentRunKey(runId);

  // Serialize JSON fields
  const serialized = { ...updates };
  if (serialized.output) {
    serialized.output = JSON.stringify(serialized.output);
  }

  // Convert boolean to string
  if (typeof serialized.success === 'boolean') {
    serialized.success = serialized.success.toString();
  }

  if (updates.status === 'completed' && !updates.completedAt) {
    serialized.completedAt = new Date().toISOString();
  }

  await redis.hmset(runKey, serialized);
}

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = {
  // Prefixes
  PREFIXES,

  // Schemas (for documentation)
  TeamSchema,
  BuildSchema,
  AgentRunSchema,

  // Key generators
  getTeamKey,
  getBuildKey,
  getAgentRunKey,
  getUserTeamsKey,
  getRepoTeamsKey,
  getStatusTeamsKey,
  getTeamBuildsKey,
  getBuildAgentsKey,

  // Index management
  addTeamToIndexes,
  removeTeamFromIndexes,
  updateTeamStatusIndex,

  // Build operations
  createBuild,
  getBuild,
  updateBuild,
  addBuildToTeam,
  getTeamBuilds,

  // Agent run operations
  createAgentRun,
  getAgentRun,
  updateAgentRun,
  addAgentRunToBuild,
  getBuildAgentRuns,
};
