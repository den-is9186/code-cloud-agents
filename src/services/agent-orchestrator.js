/**
 * Agent Orchestrator Service
 *
 * Orchestrates multi-agent build execution:
 * Supervisor → Architect → Coach → Code → Review → Test → Docs
 *
 * Integrates with Build Tracker for persistence and cost tracking.
 */

const {
  startBuild,
  markBuildRunning,
  completeBuild,
  failBuild,
  startAgentRun,
  completeAgentRun,
  failAgentRun,
  getBuildStatus,
} = require('./build-tracker');

const { getPreset, getPresetModels } = require('../config/presets');

// Try to import streamEmitter, but provide a fallback if not available
let streamEmitter;
try {
  streamEmitter = require('../utils/events').streamEmitter;
} catch (error) {
  // Fallback: create a no-op emitter
  streamEmitter = {
    emitAgentStart: () => {},
    emitAgentComplete: () => {},
    emitFileChange: () => {},
    emitTestRun: () => {},
    emitBuildStart: () => {},
    emitBuildComplete: () => {},
    emitTaskStart: () => {},
    emitTaskComplete: () => {},
  };
}

// ===================================================================
// ORCHESTRATION
// ===================================================================

/**
 * Execute a multi-agent build
 *
 * @param {Object} redis - Redis client
 * @param {Object} options - Orchestration options
 * @param {string} options.teamId - Team ID
 * @param {string} options.preset - Preset ID (A, B, C, D)
 * @param {string} options.phase - Build phase (prototype or premium)
 * @param {string} options.task - Task description
 * @param {string} options.projectPath - Project path
 * @param {Object} options.metadata - Optional metadata
 * @returns {Promise<Object>} Build result with status and cost
 */
async function orchestrateBuild(redis, options) {
  const { teamId, preset, phase, task, projectPath, metadata = {} } = options;

  // Validate preset
  const presetConfig = getPreset(preset);
  if (!presetConfig) {
    throw new Error(`Invalid preset: ${preset}`);
  }

  // Start build
  const build = await startBuild(redis, {
    teamId,
    preset,
    phase,
    metadata: {
      ...metadata,
      task,
      projectPath,
    },
  });

  const buildId = build.id;
  console.log(`🚀 Starting build ${buildId} for team ${teamId}`);

  try {
    // Mark build as running
    await markBuildRunning(redis, buildId, 'supervisor');

    // Get agent sequence from preset
    const agentSequence = getAgentSequence(presetConfig);
    console.log(`📋 Agent sequence: ${agentSequence.join(' → ')}`);

    // Execute agents in sequence
    const result = await executeAgentSequence(redis, {
      buildId,
      teamId,
      preset,
      agentSequence,
      task,
      projectPath,
    });

    // Complete build
    const completedBuild = await completeBuild(redis, buildId, {
      success: result.success,
      errorMessage: result.error || null,
    });

    console.log(`✅ Build ${buildId} completed successfully`);

    return {
      buildId: build.id,
      success: result.success,
      filesChanged: result.filesChanged || [],
      testsWritten: result.testsWritten || [],
      docsUpdated: result.docsUpdated || [],
      totalCost: completedBuild.cost.totalCost,
      totalTokens: completedBuild.cost.totalTokens,
      duration: completedBuild.build.duration,
      errors: result.errors || [],
    };
  } catch (error) {
    console.error(`❌ Build ${buildId} failed:`, error.message);

    // Fail build
    await failBuild(redis, buildId, error.message);

    throw error;
  }
}

/**
 * Execute agent sequence
 *
 * @param {Object} redis - Redis client
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Execution result
 */
async function executeAgentSequence(redis, options) {
  const { buildId, teamId, preset, agentSequence, task, projectPath } = options;

  const presetModels = getPresetModels(preset);

  const result = {
    success: true,
    filesChanged: [],
    testsWritten: [],
    docsUpdated: [],
    errors: [],
  };

  // State to pass between agents
  let runbook = null;
  let subtasks = [];
  let executionPlan = null;

  for (const agentName of agentSequence) {
    console.log(`⚡ Executing agent: ${agentName}`);

    // Get model for this agent
    const model = presetModels[agentName];
    if (!model) {
      console.warn(`⚠️ No model configured for agent ${agentName}, skipping`);
      continue;
    }

    try {
      // Start agent run
      const agentRun = await startAgentRun(redis, {
        buildId,
        teamId,
        agentName,
        model: model.id,
        modelVersion: model.model_id || null,
      });

      // Emit agent start event
      streamEmitter.emitAgentStart({ agent: agentName, task });

      // Execute agent
      const agentResult = await executeAgent(agentName, {
        task,
        projectPath,
        runbook,
        subtasks,
        executionPlan,
        model: model.id,
      });

      // Update state for next agent
      if (agentName === 'architect' && agentResult.runbook) {
        runbook = agentResult.runbook;
      }
      if (agentName === 'coach' && agentResult.subtasks) {
        subtasks = agentResult.subtasks;
        executionPlan = agentResult.executionPlan;
      }

      // Collect results
      if (agentResult.filesChanged) {
        result.filesChanged.push(...agentResult.filesChanged);
      }
      if (agentResult.testsWritten) {
        result.testsWritten.push(...agentResult.testsWritten);
      }
      if (agentResult.docsUpdated) {
        result.docsUpdated.push(...agentResult.docsUpdated);
      }

      // Complete agent run
      await completeAgentRun(redis, agentRun.id, {
        success: true,
        inputTokens: agentResult.inputTokens || 0,
        outputTokens: agentResult.outputTokens || 0,
        output: agentResult.output || null,
      });

      // Emit agent complete event
      streamEmitter.emitAgentComplete({
        agent: agentName,
        success: true,
        duration: agentResult.duration || 0,
      });

      console.log(`✓ Agent ${agentName} completed`);
    } catch (error) {
      console.error(`❌ Agent ${agentName} failed:`, error.message);

      // Record error
      result.errors.push(`${agentName}: ${error.message}`);
      result.success = false;

      // Fail agent run
      const agentRun = await getAgentRunByName(redis, buildId, agentName);
      if (agentRun) {
        await failAgentRun(redis, agentRun.id, error.message);
      }

      // Emit agent complete event with failure
      streamEmitter.emitAgentComplete({
        agent: agentName,
        success: false,
        duration: 0,
      });

      // Stop execution on critical agents
      if (['architect', 'coach', 'code'].includes(agentName)) {
        throw error;
      }
    }
  }

  return result;
}

/**
 * Execute a single agent
 *
 * @param {string} agentName - Agent name
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Agent execution result
 */
async function executeAgent(agentName, options) {
  const { task, projectPath, runbook, subtasks, executionPlan, model } = options;

  // Simulate agent execution
  // In a real implementation, this would call the actual agent
  const startTime = Date.now();

  // Mock execution based on agent type
  let result = {
    inputTokens: 0,
    outputTokens: 0,
    duration: 0,
    output: null,
  };

  switch (agentName) {
    case 'supervisor':
      result = {
        inputTokens: 1000,
        outputTokens: 500,
        duration: Date.now() - startTime,
        output: { message: 'Supervisor orchestration started' },
      };
      break;

    case 'architect':
      result = {
        inputTokens: 5000,
        outputTokens: 3000,
        duration: Date.now() - startTime,
        runbook: [
          { step: 1, description: 'Analyze requirements' },
          { step: 2, description: 'Design architecture' },
          { step: 3, description: 'Plan implementation' },
        ],
        output: { runbookGenerated: true },
      };
      break;

    case 'coach':
      result = {
        inputTokens: 3000,
        outputTokens: 2000,
        duration: Date.now() - startTime,
        subtasks: [
          { id: 'task-1', description: 'Implement feature X', agent: 'code' },
          { id: 'task-2', description: 'Add error handling', agent: 'code' },
        ],
        executionPlan: { parallel: false, sequential: true },
        output: { tasksPlanned: 2 },
      };
      break;

    case 'code':
      result = {
        inputTokens: 10000,
        outputTokens: 7000,
        duration: Date.now() - startTime,
        filesChanged: [
          { path: 'src/feature.js', action: 'created', changes: 50 },
          { path: 'src/utils.js', action: 'modified', changes: 10 },
        ],
        output: { filesModified: 2 },
      };
      break;

    case 'review':
      result = {
        inputTokens: 5000,
        outputTokens: 2000,
        duration: Date.now() - startTime,
        output: { approved: true, issues: [] },
      };
      break;

    case 'test':
      result = {
        inputTokens: 8000,
        outputTokens: 4000,
        duration: Date.now() - startTime,
        testsWritten: [
          { path: 'tests/feature.test.js', tests: 5 },
          { path: 'tests/utils.test.js', tests: 3 },
        ],
        output: { testsCreated: 8, passed: 8, failed: 0 },
      };
      break;

    case 'docs':
      result = {
        inputTokens: 3000,
        outputTokens: 2000,
        duration: Date.now() - startTime,
        docsUpdated: [
          { path: 'README.md', action: 'modified', changes: 20 },
          { path: 'docs/API.md', action: 'created', changes: 50 },
        ],
        output: { docsUpdated: 2 },
      };
      break;

    default:
      throw new Error(`Unknown agent: ${agentName}`);
  }

  return result;
}

/**
 * Get agent sequence from preset configuration
 *
 * @param {Object} preset - Preset configuration
 * @returns {Array<string>} Array of agent names in execution order
 */
function getAgentSequence(preset) {
  // Default sequence
  const defaultSequence = ['supervisor', 'architect', 'coach', 'code', 'review', 'test', 'docs'];

  // If preset defines agent order, use that
  if (preset.agents) {
    const agentNames = Object.keys(preset.agents);
    // Filter to only include agents from default sequence
    return defaultSequence.filter((agent) => agentNames.includes(agent));
  }

  return defaultSequence;
}

/**
 * Helper: Get agent run by agent name
 *
 * @param {Object} redis - Redis client
 * @param {string} buildId - Build ID
 * @param {string} agentName - Agent name
 * @returns {Promise<Object|null>} Agent run or null
 */
async function getAgentRunByName(redis, buildId, agentName) {
  const { getBuildAgentRuns, getAgentRun } = require('../database/redis-schema');

  const runIds = await getBuildAgentRuns(redis, buildId);

  for (const runId of runIds) {
    const run = await getAgentRun(redis, runId);
    if (run && run.agentName === agentName) {
      return run;
    }
  }

  return null;
}

// ===================================================================
// BUILD MONITORING
// ===================================================================

/**
 * Get live build progress
 *
 * @param {Object} redis - Redis client
 * @param {string} buildId - Build ID
 * @returns {Promise<Object>} Build progress
 */
async function getBuildProgress(redis, buildId) {
  const status = await getBuildStatus(redis, buildId);

  return {
    buildId: status.build.id,
    status: status.build.status,
    currentAgent: status.build.currentAgent,
    progress: status.progress,
    agentRuns: status.agentRuns.map((run) => ({
      agent: run.agentName,
      status: run.status,
      tokens: run.totalTokens || 0,
      cost: run.cost || 0,
      duration: run.duration || 0,
    })),
    cost: status.cost,
  };
}

// ===================================================================
// EXPORTS
// ===================================================================

module.exports = {
  // Orchestration
  orchestrateBuild,
  executeAgentSequence,

  // Monitoring
  getBuildProgress,
};
