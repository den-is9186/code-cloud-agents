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
import {
  SupervisorAgent,
  type SupervisorInput,
  type SupervisorOutput,
} from '../agents/supervisor.js';
import { ArchitectAgent, type ArchitectInput, type ArchitectOutput } from '../agents/architect.js';
import { CoachAgent, type CoachInput, type CoachOutput } from '../agents/coach.js';
import { CodeAgent, type CodeInput, type CodeOutput } from '../agents/code.js';
import { ReviewAgent, type ReviewInput, type ReviewOutput } from '../agents/review.js';
import { TestAgent, type TestInput, type TestOutput } from '../agents/test.js';
import { DocsAgent, type DocsInput, type DocsOutput } from '../agents/docs.js';
import type {
  Agent,
  SubTask,
  FileChange as AgentFileChange,
  Step,
  Dependency,
} from '../agents/types.js';

import { checkBudgetAfterBuild } from './budget-alert-service.js';
import { logger } from '../utils/logger';

/**
 * MVP Hardcoded Models
 * Diese Models werden für die MVP-Phase verwendet, bis preset integration vollständig ist
 */
const MVP_MODELS = {
  code: 'claude-sonnet-4',
  review: 'deepseek-r1',
  test: 'deepseek-v3',
  docs: 'llama-4-scout-local',
} as const;

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
  model: string;
  context: PipelineContext;
  preset?: string; // For SupervisorAgent
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

/**
 * Pipeline Context - State shared between agents
 */
interface PipelineContext {
  // From Supervisor
  supervisorOutput?: SupervisorOutput;
  agentSequence?: string[];
  estimatedComplexity?: 'low' | 'medium' | 'high';
  risks?: string[];

  // From Architect
  runbook?: Step[];
  architectComplexity?: 'low' | 'medium' | 'high';

  // From Coach
  tasks?: SubTask[];
  executionOrder?: string[][];
  dependencies?: Dependency[];

  // From Code/Review cycle
  filesChanged: AgentFileChange[];
  lastReviewOutput?: ReviewOutput;

  // Flags
  reviewRetries: number;
  codeApproved: boolean;
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

  // Initialize pipeline context
  const context: PipelineContext = {
    filesChanged: [],
    reviewRetries: 0,
    codeApproved: false,
  };

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

      // Execute agent with pipeline context
      const agentResult = await executeAgent(agentName, {
        task,
        projectPath,
        model: model.id,
        context,
        preset,
      });

      // Special handling for Review agent: Retry loop if not approved
      if (agentName === 'review' && !context.codeApproved && context.reviewRetries < 3) {
        logger.warn('Code not approved, retrying...', {
          attempt: context.reviewRetries + 1,
          issues: context.lastReviewOutput?.mustFix.length || 0,
        });

        // Increment retry counter
        context.reviewRetries++;

        // Re-run Code agent with feedback
        const codeModel = presetModels['code'] as ModelConfig | undefined;
        if (codeModel) {
          logger.info('Re-running Code agent with review feedback');

          const codeAgentRun = await startAgentRun(redis, {
            buildId,
            teamId,
            agentName: 'code',
            model: codeModel.id,
            modelVersion: codeModel.model_id || null,
          });

          const codeResult = await executeAgent('code', {
            task,
            projectPath,
            model: codeModel.id,
            context, // Context now has lastReviewOutput
            preset,
          });

          await completeAgentRun(redis, codeAgentRun.id, {
            success: true,
            inputTokens: codeResult.inputTokens || 0,
            outputTokens: codeResult.outputTokens || 0,
            output: codeResult.output ? JSON.stringify(codeResult.output) : null,
          });

          // Re-run Review agent
          logger.info('Re-running Review agent after code fixes');

          const reviewAgentRun = await startAgentRun(redis, {
            buildId,
            teamId,
            agentName: 'review',
            model: model.id,
            modelVersion: model.model_id || null,
          });

          const reviewResult = await executeAgent('review', {
            task,
            projectPath,
            model: model.id,
            context,
            preset,
          });

          await completeAgentRun(redis, reviewAgentRun.id, {
            success: true,
            inputTokens: reviewResult.inputTokens || 0,
            outputTokens: reviewResult.outputTokens || 0,
            output: reviewResult.output ? JSON.stringify(reviewResult.output) : null,
          });

          // If still not approved after 3 retries, fail hard
          if (!context.codeApproved && context.reviewRetries >= 3) {
            throw new Error(
              `Code review failed after ${context.reviewRetries} attempts. Critical issues: ${context.lastReviewOutput?.mustFix.map((i) => i.message).join(', ')}`
            );
          }
        }
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

      // Hard failures (stop execution)
      if (['code', 'review'].includes(agentName)) {
        result.success = false;
        throw error;
      }

      // Soft failures (continue execution)
      if (['test', 'docs'].includes(agentName)) {
        logger.warn('Soft failure - continuing execution', { agent: agentName });
        // Don't throw, continue to next agent
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
  options: AgentExecutionOptions
): Promise<AgentExecutionResult> {
  const startTime = Date.now();
  const { model, context, preset, task, projectPath } = options;

  // Use MVP hardcoded model if not provided
  const agentModel = model || MVP_MODELS[agentName as keyof typeof MVP_MODELS] || 'claude-sonnet-4';

  // Create agent instance
  const agent = createAgentInstance(agentName, agentModel, preset);

  // Build agent-specific input and execute
  let result: AgentExecutionResult;

  switch (agentName) {
    case 'code': {
      // Code Agent needs SubTask and optional ReviewResult feedback
      const codeAgent = agent as CodeAgent;

      // Build a SubTask from current context
      const subtask: SubTask = {
        id: 'code-task-1',
        stepId: 'step-1',
        assignedAgent: 'code',
        description: task,
        input: { files: [] },
        expectedOutput: 'Code implementation',
        status: 'in_progress',
      };

      const codeInput: CodeInput = {
        task: subtask,
        feedback: context.lastReviewOutput,
        dryRun: false,
      };

      const output: CodeOutput = await codeAgent.execute(codeInput);

      // Update context
      context.filesChanged = output.filesChanged;

      result = {
        inputTokens: 1000,
        outputTokens: 500,
        duration: Date.now() - startTime,
        output: output as unknown as Record<string, unknown>,
        filesChanged: output.filesChanged.map((f) => ({
          path: f.path,
          action: f.action,
          changes: f.content?.length || 0,
        })),
      };
      break;
    }

    case 'review': {
      const reviewAgent = agent as ReviewAgent;

      // Review needs filesChanged from Code agent
      if (!context.filesChanged || context.filesChanged.length === 0) {
        throw new Error('Review agent requires filesChanged from Code agent');
      }

      const subtask: SubTask = {
        id: 'review-task-1',
        stepId: 'step-1',
        assignedAgent: 'review',
        description: task,
        input: {},
        expectedOutput: 'Code review',
        status: 'in_progress',
      };

      const reviewInput: ReviewInput = {
        filesChanged: context.filesChanged,
        originalTask: subtask,
        skipSecurityScan: false,
      };

      const output: ReviewOutput = await reviewAgent.execute(reviewInput);

      // Update context
      context.lastReviewOutput = output;
      context.codeApproved = output.approved;

      result = {
        inputTokens: 1000,
        outputTokens: 500,
        duration: Date.now() - startTime,
        output: output as unknown as Record<string, unknown>,
      };
      break;
    }

    case 'test': {
      const testAgent = agent as TestAgent;

      if (!context.filesChanged || context.filesChanged.length === 0) {
        throw new Error('Test agent requires filesChanged from Code agent');
      }

      const subtask: SubTask = {
        id: 'test-task-1',
        stepId: 'step-1',
        assignedAgent: 'test',
        description: task,
        input: {},
        expectedOutput: 'Test implementation',
        status: 'in_progress',
      };

      const testInput: TestInput = {
        filesChanged: context.filesChanged,
        task: subtask,
        runTests: true,
        dryRun: false,
      };

      const output: TestOutput = await testAgent.execute(testInput);

      result = {
        inputTokens: 1000,
        outputTokens: 500,
        duration: Date.now() - startTime,
        output: output as unknown as Record<string, unknown>,
        testsWritten: output.testsWritten.map((t) => ({
          path: t.path,
          tests: t.testCount,
        })),
      };
      break;
    }

    case 'docs': {
      const docsAgent = agent as DocsAgent;

      if (!context.filesChanged || context.filesChanged.length === 0) {
        throw new Error('Docs agent requires filesChanged from Code agent');
      }

      const docsInput: DocsInput = {
        filesChanged: context.filesChanged,
        task: { description: task },
        dryRun: false,
        skipChangelog: false,
      };

      const output: DocsOutput = await docsAgent.execute(docsInput);

      result = {
        inputTokens: 1000,
        outputTokens: 500,
        duration: Date.now() - startTime,
        output: output as unknown as Record<string, unknown>,
        docsUpdated: output.docsUpdated.map((d) => ({
          path: d.path,
          action: d.action,
          changes: d.content?.length || 0,
        })),
      };
      break;
    }

    case 'supervisor': {
      const supervisorAgent = agent as SupervisorAgent;

      const supervisorInput: SupervisorInput = {
        task: task,
        projectPath: projectPath,
      };

      const output: SupervisorOutput = await supervisorAgent.execute(supervisorInput);

      // Store in context for next agents
      context.supervisorOutput = output;
      context.agentSequence = output.agentSequence;
      context.estimatedComplexity = output.estimatedComplexity;
      context.risks = output.risks;

      result = {
        inputTokens: 1000,
        outputTokens: 500,
        duration: Date.now() - startTime,
        output: output as unknown as Record<string, unknown>,
      };
      break;
    }

    case 'architect': {
      const architectAgent = agent as ArchitectAgent;

      const architectInput: ArchitectInput = {
        task: task,
        projectPath: projectPath,
      };

      const output: ArchitectOutput = await architectAgent.execute(architectInput);

      // Store runbook for Coach
      context.runbook = output.runbook;
      context.architectComplexity = output.estimatedComplexity;

      // Log critical risks
      if (context.risks && context.risks.length > 0) {
        logger.warn('Risks identified', {
          agent: 'architect',
          risks: context.risks,
        });
      }

      result = {
        inputTokens: 1000,
        outputTokens: 500,
        duration: Date.now() - startTime,
        output: output as unknown as Record<string, unknown>,
        runbook: output.runbook.map((s, idx) => ({
          step: idx + 1,
          description: s.description,
        })),
      };
      break;
    }

    case 'coach': {
      const coachAgent = agent as CoachAgent;

      if (!context.runbook) {
        throw new Error('Coach agent requires runbook from Architect');
      }

      const coachInput: CoachInput = {
        runbook: context.runbook,
      };

      const output: CoachOutput = await coachAgent.execute(coachInput);

      // Validate output
      if (!output.tasks || output.tasks.length === 0) {
        throw new Error('Coach failed to create SubTasks');
      }

      // Store for execution
      context.tasks = output.tasks;
      context.executionOrder = output.executionOrder;
      context.dependencies = output.dependencies;

      logger.info('Coach planning completed', {
        agent: 'coach',
        totalTasks: output.tasks.length,
        batches: output.executionOrder.length,
      });

      result = {
        inputTokens: 1000,
        outputTokens: 500,
        duration: Date.now() - startTime,
        output: output as unknown as Record<string, unknown>,
        subtasks: output.tasks.map((t) => ({
          id: t.id,
          description: t.description,
          agent: t.assignedAgent,
        })),
        executionPlan: {
          parallel: output.executionOrder.some((batch) => batch.length > 1),
          sequential: true,
        },
      };
      break;
    }

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
