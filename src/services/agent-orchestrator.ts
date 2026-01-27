/**
 * Agent Orchestrator Service
 *
 * Orchestrates multi-agent build execution:
 * Supervisor → Architect → Coach → Code → Review → Test → Docs
 *
 * Integrates with Build Tracker for persistence and cost tracking.
 */

import type { Redis } from 'ioredis';
import {
  startBuild,
  markBuildRunning,
  completeBuild,
  failBuild,
  startAgentRun,
  completeAgentRun,
  failAgentRun,
  getBuildStatus,
  type AgentRun,
} from './build-tracker.js';

import { getPreset, getPresetModels } from '../config/presets.js';

import {
  sendNotification,
  NotificationType,
  getTeamNotificationChannels,
} from './notification-service.js';

// Import all agent classes
import { SupervisorAgent } from '../agents/supervisor.js';
import { ArchitectAgent } from '../agents/architect.js';
import { CoachAgent } from '../agents/coach.js';
import { CodeAgent } from '../agents/code.js';
import { ReviewAgent } from '../agents/review.js';
import { TestAgent } from '../agents/test.js';
import { DocsAgent } from '../agents/docs.js';
import type { Agent } from '../agents/types.js';

import { checkBudgetAfterBuild } from './budget-alert-service.js';
import { logger } from '../utils/logger';

/**
 * Stream emitter interface
 */
interface StreamEmitter {
  emitAgentStart: (data: { agent: string; task: string; buildId: string }) => void;
  emitAgentComplete: (data: {
    agent: string;
    success: boolean;
    duration: number;
    buildId: string;
  }) => void;
  emitFileChange: (data: unknown) => void;
  emitTestRun: (data: unknown) => void;
  emitBuildStart: (data: { buildId: string }) => void;
  emitBuildComplete: (data: { buildId: string; success: boolean; errors: string[] }) => void;
  emitTaskStart: (data: unknown) => void;
  emitTaskComplete: (data: unknown) => void;
}

// Create a no-op emitter as fallback
const noOpEmitter: StreamEmitter = {
  emitAgentStart: () => {},
  emitAgentComplete: () => {},
  emitFileChange: () => {},
  emitTestRun: () => {},
  emitBuildStart: () => {},
  emitBuildComplete: () => {},
  emitTaskStart: () => {},
  emitTaskComplete: () => {},
};

// Try to import streamEmitter, but provide a fallback if not available
let streamEmitter: StreamEmitter = noOpEmitter;
try {
  const eventsModule = require('../utils/events.js');
  streamEmitter = eventsModule.streamEmitter || noOpEmitter;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
} catch (_error) {
  // Use fallback no-op emitter
  streamEmitter = noOpEmitter;
}

/**
 * Orchestration options
 */
export interface OrchestrationOptions {
  teamId: string;
  preset: string;
  phase: string;
  task: string;
  projectPath: string;
  metadata?: Record<string, unknown>;
}

/**
 * Build result
 */
export interface BuildResult {
  buildId: string;
  success: boolean;
  filesChanged: FileChange[];
  testsWritten: TestInfo[];
  docsUpdated: DocInfo[];
  totalCost: number;
  totalTokens: number;
  duration: number;
  errors: string[];
}

/**
 * File change info
 */
interface FileChange {
  path: string;
  action: string;
  changes: number;
}

/**
 * Test info
 */
interface TestInfo {
  path: string;
  tests: number;
}

/**
 * Documentation info
 */
interface DocInfo {
  path: string;
  action: string;
  changes: number;
}

/**
 * Agent execution result
 */
interface AgentExecutionResult {
  inputTokens: number;
  outputTokens: number;
  duration: number;
  output: Record<string, unknown> | null;
  filesChanged?: FileChange[];
  testsWritten?: TestInfo[];
  docsUpdated?: DocInfo[];
  runbook?: Array<{ step: number; description: string }>;
  subtasks?: Array<{ id: string; description: string; agent: string }>;
  executionPlan?: { parallel: boolean; sequential: boolean };
}

/**
 * Execution sequence result
 */
interface ExecutionSequenceResult {
  success: boolean;
  filesChanged: FileChange[];
  testsWritten: TestInfo[];
  docsUpdated: DocInfo[];
  errors: string[];
  error?: string;
}

/**
 * Agent execution options
 */
interface AgentExecutionOptions {
  task: string;
  projectPath: string;
  runbook: Array<{ step: number; description: string }> | null;
  subtasks: Array<{ id: string; description: string; agent: string }>;
  executionPlan: { parallel: boolean; sequential: boolean } | null;
  model: string;
}

/**
 * Execution sequence options
 */
interface ExecutionSequenceOptions {
  buildId: string;
  teamId: string;
  preset: string;
  agentSequence: string[];
  task: string;
  projectPath: string;
}

/**
 * Preset configuration
 */
interface PresetConfig {
  agents?: Record<string, unknown>;
}

/**
 * Model configuration
 */
interface ModelConfig {
  id: string;
  model_id?: string;
}

// ===================================================================
// ORCHESTRATION
// ===================================================================

/**
 * Execute a multi-agent build
 *
 * @param redis - Redis client
 * @param options - Orchestration options
 * @returns Build result with status and cost
 */
export async function orchestrateBuild(
  redis: Redis,
  options: OrchestrationOptions
): Promise<BuildResult> {
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
  logger.info('Build started', { buildId, teamId, preset });

  // Emit build start event
  streamEmitter.emitBuildStart({ buildId });

  // Send build started notification
  try {
    const channels = await getTeamNotificationChannels(redis, teamId);
    if (channels.length > 0) {
      await sendNotification(
        redis,
        {
          type: NotificationType.BUILD_STARTED,
          teamId,
          buildId,
          status: 'started',
          message: `Build ${buildId} has started for preset ${preset}`,
        },
        channels
      );
    }
  } catch (notifError) {
    const errorMsg = notifError instanceof Error ? notifError.message : 'Unknown error';
    logger.error('Failed to send build start notification', { error: errorMsg, buildId, teamId });
  }

  try {
    // Mark build as running
    await markBuildRunning(redis, buildId, 'supervisor');

    // Get agent sequence from preset
    const agentSequence = getAgentSequence(presetConfig);
    logger.info('Agent sequence configured', { sequence: agentSequence });

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

    // Emit build complete event
    streamEmitter.emitBuildComplete({
      buildId,
      success: result.success,
      errors: result.errors || [],
    });

    // Send build completed notification
    try {
      const channels = await getTeamNotificationChannels(redis, teamId);
      if (channels.length > 0) {
        await sendNotification(
          redis,
          {
            type: NotificationType.BUILD_COMPLETED,
            teamId,
            buildId,
            status: 'completed',
            message: `Build ${buildId} completed successfully (${completedBuild.cost.totalCost.toFixed(2)} USD, ${Math.round((completedBuild.build.duration ?? 0) / 1000)}s)`,
          },
          channels
        );
      }
    } catch (notifError) {
      const errorMsg = notifError instanceof Error ? notifError.message : 'Unknown error';
      logger.error('Failed to send build completion notification', { error: errorMsg, buildId });
    }

    // Check budget and send alerts if thresholds exceeded
    try {
      const budgetCheck = await checkBudgetAfterBuild(redis, teamId, completedBuild.cost.totalCost);
      if (budgetCheck.alertSent) {
        logger.warn('Build cost exceeds budget limit', {
          teamId,
          alertLevel: budgetCheck.alertLevel,
          percentage: budgetCheck.percentage,
        });
      }
    } catch (budgetError) {
      const errorMsg = budgetError instanceof Error ? budgetError.message : 'Unknown error';
      logger.error('Failed to check budget', { error: errorMsg, buildId });
    }

    logger.info('Build completed successfully', {
      buildId,
      duration: completedBuild.build.duration,
    });

    return {
      buildId: build.id,
      success: result.success,
      filesChanged: result.filesChanged || [],
      testsWritten: result.testsWritten || [],
      docsUpdated: result.docsUpdated || [],
      totalCost: completedBuild.cost.totalCost,
      totalTokens: completedBuild.cost.totalTokens,
      duration: completedBuild.build.duration ?? 0,
      errors: result.errors || [],
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error('Build failed', { buildId, error: errorMsg, stack: errorStack });

    // Fail build
    await failBuild(redis, buildId, errorMsg);

    // Emit build complete event with failure
    streamEmitter.emitBuildComplete({
      buildId,
      success: false,
      errors: [errorMsg],
    });

    // Send build failed notification
    try {
      const channels = await getTeamNotificationChannels(redis, teamId);
      if (channels.length > 0) {
        await sendNotification(
          redis,
          {
            type: NotificationType.BUILD_FAILED,
            teamId,
            buildId,
            status: 'failed',
            message: `Build ${buildId} failed: ${errorMsg}`,
          },
          channels
        );
      }
    } catch (notifError) {
      const notifErrorMsg = notifError instanceof Error ? notifError.message : 'Unknown error';
      logger.error('Failed to send build failure notification', { error: notifErrorMsg, buildId });
    }

    throw error;
  }
}

/**
 * Execute agent sequence
 *
 * @param redis - Redis client
 * @param options - Execution options
 * @returns Execution result
 */
async function executeAgentSequence(
  redis: Redis,
  options: ExecutionSequenceOptions
): Promise<ExecutionSequenceResult> {
  const { buildId, teamId, preset, agentSequence, task, projectPath } = options;

  const presetModels = getPresetModels(preset);

  const result: ExecutionSequenceResult = {
    success: true,
    filesChanged: [],
    testsWritten: [],
    docsUpdated: [],
    errors: [],
  };

  // State to pass between agents
  let runbook: Array<{ step: number; description: string }> | null = null;
  let subtasks: Array<{ id: string; description: string; agent: string }> = [];
  let executionPlan: { parallel: boolean; sequential: boolean } | null = null;

  for (const agentName of agentSequence) {
    logger.info('Agent executing', { agent: agentName, buildId });

    // Get model for this agent
    const model = presetModels[agentName] as ModelConfig | undefined;
    if (!model) {
      logger.warn('Agent skipped - no model configured', { agent: agentName });
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
      streamEmitter.emitAgentStart({ agent: agentName, task, buildId });

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
        executionPlan = agentResult.executionPlan ?? null;
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
        output: agentResult.output ? JSON.stringify(agentResult.output) : null,
      });

      // Emit agent complete event
      streamEmitter.emitAgentComplete({
        agent: agentName,
        success: true,
        duration: agentResult.duration || 0,
        buildId,
      });

      logger.info('Agent completed', { agent: agentName, duration: agentResult.duration || 0 });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      logger.error('Agent failed', { agent: agentName, error: errorMsg, stack: errorStack });

      // Record error
      result.errors.push(`${agentName}: ${errorMsg}`);
      result.success = false;

      // Fail agent run
      const agentRun = await getAgentRunByName(redis, buildId, agentName);
      if (agentRun) {
        await failAgentRun(redis, agentRun.id, errorMsg);
      }

      // Emit agent complete event with failure
      streamEmitter.emitAgentComplete({
        agent: agentName,
        success: false,
        duration: 0,
        buildId,
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
 * Create agent instance by name
 *
 * @param agentName - Agent name
 * @param model - LLM model to use
 * @param preset - Preset configuration (required for supervisor agent)
 * @returns Agent instance
 * @throws Error if agent name is unknown
 */
// @ts-expect-error - Will be used in Step 2 (executeAgent refactor)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createAgentInstance(agentName: string, model: string, preset?: string): Agent {
  switch (agentName) {
    case 'supervisor':
      // SupervisorAgent needs a config object with model and preset
      if (!preset) {
        throw new Error('Preset is required for SupervisorAgent');
      }
      return new SupervisorAgent({ model, preset });
    case 'architect':
      return new ArchitectAgent(model);
    case 'coach':
      return new CoachAgent(model);
    case 'code':
      return new CodeAgent(model);
    case 'review':
      return new ReviewAgent(model);
    case 'test':
      return new TestAgent(model);
    case 'docs':
      // DocsAgent doesn't take constructor parameters - uses hardcoded model
      return new DocsAgent();
    default:
      throw new Error(`Unknown agent: ${agentName}`);
  }
}

/**
 * Execute a single agent
 *
 * @param agentName - Agent name
 * @param options - Execution options
 * @returns Agent execution result
 */
async function executeAgent(
  agentName: string,
  _options: AgentExecutionOptions
): Promise<AgentExecutionResult> {
  // Simulate agent execution
  // In a real implementation, this would call the actual agent
  const startTime = Date.now();

  // Mock execution based on agent type
  let result: AgentExecutionResult;

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
 * @param preset - Preset configuration
 * @returns Array of agent names in execution order
 */
function getAgentSequence(preset: PresetConfig): string[] {
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
 * @param redis - Redis client
 * @param buildId - Build ID
 * @param agentName - Agent name
 * @returns Agent run or null
 */
async function getAgentRunByName(
  redis: Redis,
  buildId: string,
  agentName: string
): Promise<AgentRun | null> {
  const { getBuildAgentRuns, getAgentRun } = await import('../database/redis-schema.js');

  const runIds = await getBuildAgentRuns(redis, buildId);

  for (const runId of runIds) {
    const run = await getAgentRun(redis, runId);
    if (run && run.agentName === agentName) {
      return run as AgentRun;
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
 * @param redis - Redis client
 * @param buildId - Build ID
 * @returns Build progress
 */
export async function getBuildProgress(
  redis: Redis,
  buildId: string
): Promise<{
  buildId: string;
  status: string;
  currentAgent: string | null | undefined;
  progress: { percent: number; completed: number; total: number };
  agentRuns: Array<{
    agent: string;
    status: string;
    tokens: number;
    cost: number;
    duration: number;
  }>;
  cost: {
    totalCost: number;
    totalTokens: number;
    totalInputTokens: number;
    totalOutputTokens: number;
  } | null;
}> {
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
