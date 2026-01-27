import { Agent, AgentRole, AgentStatus } from './types';
import { llmClient } from '../llm/client';
import { safeJsonParse } from '../utils/schemas';
import { z } from 'zod';
import { logger } from '../utils/logger';
import { sanitizeLogMessage } from '../utils/security';
import crypto from 'crypto';

/**
 * Supervisor Agent Configuration
 */
export interface SupervisorConfig {
  model: string;
  preset: string;
  maxIterations?: number;
}

/**
 * Task Assignment for individual agents
 */
interface TaskAssignment {
  agentName: string;
  task: string;
  dependencies: string[];
}

/**
 * Execution Strategy
 */
interface ExecutionStrategy {
  parallel: string[];
  sequential: string[];
}

/**
 * Supervisor Agent Output
 */
interface SupervisorOutput {
  agentSequence: string[];
  taskAssignments: TaskAssignment[];
  executionStrategy: ExecutionStrategy;
  estimatedComplexity: 'low' | 'medium' | 'high';
  risks: string[];
  strategy: string;
  threadId?: string;
  checkpoints?: CheckpointInfo[];
}

/**
 * Supervisor Agent Input
 */
interface SupervisorInput {
  task: string;
  projectPath: string;
  availableAgents?: string[];
  threadId?: string;
  resumeFromCheckpoint?: string;
}

/**
 * Checkpoint Info
 */
interface CheckpointInfo {
  id: string;
  timestamp: number;
  state: 'analysis' | 'planning' | 'validation' | 'complete';
  data: Record<string, unknown>;
}

/**
 * Internal State
 */
interface SupervisorState {
  threadId: string;
  startTime: number;
  checkpoints: CheckpointInfo[];
  analysis?: {
    complexity: 'low' | 'medium' | 'high';
    risks: string[];
    domain: string;
    recommendedAgents: string[];
  };
  plan?: {
    agentSequence: string[];
    taskAssignments: TaskAssignment[];
    executionStrategy: ExecutionStrategy;
    strategy: string;
  };
}

/**
 * SupervisorAgent - ULTRA VERSION
 *
 * Advanced Features:
 * - Multi-stage planning (Analysis → Planning → Validation)
 * - Checkpointing & Resume support
 * - Security-aware risk assessment
 * - Human-in-the-loop for high complexity
 * - Thread-based execution tracking
 * - Fallback strategies at each stage
 */
export class SupervisorAgent implements Agent {
  role: AgentRole = 'supervisor';
  model: string;
  status: AgentStatus = 'idle';
  private preset: string;
  // @ts-expect-error - Reserved for future use (retry logic)
  private _maxIterations: number;

  // In-memory state store (production: use Redis/Database)
  private static stateStore = new Map<string, SupervisorState>();

  constructor(config: SupervisorConfig) {
    this.model = config.model;
    this.preset = config.preset;
    this._maxIterations = config.maxIterations || 5;
  }

  /**
   * Execute supervisor planning with checkpointing
   */
  async execute(input: SupervisorInput): Promise<SupervisorOutput> {
    const threadId = input.threadId || crypto.randomUUID();
    const startTime = Date.now();

    try {
      logger.info('SupervisorAgent (ULTRA) starting', {
        agent: 'supervisor',
        threadId,
        task: sanitizeLogMessage(input.task),
        preset: this.preset,
        resuming: !!input.resumeFromCheckpoint,
      });

      // Initialize or resume state
      const state = await this.initializeState(threadId, input, startTime);

      // Stage 1: Analysis (if not already done)
      if (!state.analysis) {
        state.analysis = await this.runAnalysisStage(input, state);
        this.saveCheckpoint(state, 'analysis');
      }

      // Stage 2: Planning (if not already done)
      if (!state.plan) {
        state.plan = await this.runPlanningStage(input, state);
        this.saveCheckpoint(state, 'planning');
      }

      // Stage 3: Validation
      await this.runValidationStage(state);
      this.saveCheckpoint(state, 'validation');

      // Stage 4: Finalize
      const output = this.buildFinalOutput(state, threadId);
      this.saveCheckpoint(state, 'complete');

      const duration = Date.now() - startTime;
      logger.info('SupervisorAgent (ULTRA) completed', {
        agent: 'supervisor',
        threadId,
        agentCount: output.agentSequence.length,
        complexity: output.estimatedComplexity,
        checkpoints: state.checkpoints.length,
        duration,
      });

      this.status = 'completed';
      return output;
    } catch (error) {
      this.status = 'failed';
      const errorMsg = error instanceof Error ? error.message : String(error);
      logger.error('SupervisorAgent (ULTRA) failed', {
        agent: 'supervisor',
        threadId,
        error: sanitizeLogMessage(errorMsg),
      });

      return this.getFallbackOutput(input, threadId, `fatal error: ${errorMsg}`);
    }
  }

  /**
   * Initialize or resume state
   */
  private async initializeState(
    threadId: string,
    input: SupervisorInput,
    startTime: number
  ): Promise<SupervisorState> {
    // Try to resume from checkpoint
    if (input.resumeFromCheckpoint) {
      const existing = SupervisorAgent.stateStore.get(threadId);
      if (existing) {
        logger.info('Resuming from checkpoint', {
          agent: 'supervisor',
          threadId,
          checkpointId: input.resumeFromCheckpoint,
          checkpoints: existing.checkpoints.length,
        });
        return existing;
      }
    }

    // Create new state
    const state: SupervisorState = {
      threadId,
      startTime,
      checkpoints: [],
    };

    SupervisorAgent.stateStore.set(threadId, state);
    return state;
  }

  /**
   * Stage 1: Analysis
   */
  private async runAnalysisStage(
    input: SupervisorInput,
    state: SupervisorState
  ): Promise<NonNullable<SupervisorState['analysis']>> {
    logger.info('Analysis stage starting', {
      agent: 'supervisor',
      threadId: state.threadId,
    });

    const availableAgents = input.availableAgents || [
      'architect',
      'coach',
      'code',
      'review',
      'test',
      'docs',
    ];

    try {
      const response = await llmClient.chat(this.model, [
        {
          role: 'system',
          content: this.buildAnalysisPrompt(availableAgents),
        },
        {
          role: 'user',
          content: `Analyze this task:\n\nTask: ${input.task}\nProject: ${input.projectPath}\nAvailable Agents: ${availableAgents.join(', ')}`,
        },
      ]);

      const AnalysisSchema = z.object({
        complexity: z.enum(['low', 'medium', 'high']),
        risks: z.array(z.string()),
        domain: z.string(),
        recommendedAgents: z.array(z.string()),
      });

      const parsed = safeJsonParse(response.content, AnalysisSchema);

      // Add security warnings
      const risks = this.enrichRisks(parsed.risks, input.task, parsed.complexity);

      return {
        complexity: parsed.complexity,
        risks,
        domain: parsed.domain,
        recommendedAgents: parsed.recommendedAgents.filter((a) =>
          availableAgents.includes(a)
        ),
      };
    } catch (error) {
      logger.warn('Analysis stage failed, using fallback', {
        agent: 'supervisor',
        threadId: state.threadId,
        error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
      });

      return {
        complexity: 'medium',
        risks: ['Analysis failed - using conservative estimates'],
        domain: 'unknown',
        recommendedAgents: availableAgents.slice(0, 3),
      };
    }
  }

  /**
   * Stage 2: Planning
   */
  private async runPlanningStage(
    input: SupervisorInput,
    state: SupervisorState
  ): Promise<NonNullable<SupervisorState['plan']>> {
    logger.info('Planning stage starting', {
      agent: 'supervisor',
      threadId: state.threadId,
    });

    if (!state.analysis) {
      throw new Error('Analysis must be completed before planning');
    }

    try {
      const response = await llmClient.chat(this.model, [
        {
          role: 'system',
          content: this.buildPlanningPrompt(),
        },
        {
          role: 'user',
          content: this.buildPlanningUserPrompt(input.task, state.analysis),
        },
      ]);

      const PlanningSchema = z.object({
        agentSequence: z.array(z.string()),
        taskAssignments: z.array(
          z.object({
            agentName: z.string(),
            task: z.string(),
            dependencies: z.array(z.string()),
          })
        ),
        executionStrategy: z.object({
          parallel: z.array(z.string()),
          sequential: z.array(z.string()),
        }),
        strategy: z.string(),
      });

      const parsed = safeJsonParse(response.content, PlanningSchema);

      return {
        agentSequence: this.uniqueNonEmpty(parsed.agentSequence),
        taskAssignments: parsed.taskAssignments,
        executionStrategy: parsed.executionStrategy,
        strategy: parsed.strategy,
      };
    } catch (error) {
      logger.warn('Planning stage failed, using fallback', {
        agent: 'supervisor',
        threadId: state.threadId,
        error: sanitizeLogMessage(error instanceof Error ? error.message : String(error)),
      });

      const agents = state.analysis.recommendedAgents;
      return {
        agentSequence: agents,
        taskAssignments: agents.map((a, idx) => ({
          agentName: a,
          task: `Execute ${a} task for: ${input.task}`,
          dependencies: idx > 0 ? [agents[idx - 1] || ''] : [],
        })),
        executionStrategy: {
          parallel: [],
          sequential: agents,
        },
        strategy: 'Fallback: sequential execution of recommended agents',
      };
    }
  }

  /**
   * Stage 3: Validation
   */
  private async runValidationStage(state: SupervisorState): Promise<void> {
    logger.info('Validation stage starting', {
      agent: 'supervisor',
      threadId: state.threadId,
    });

    if (!state.plan || !state.analysis) {
      throw new Error('Analysis and planning must be completed before validation');
    }

    // Validate sequence dependencies
    this.validateDependencies(state.plan);

    // Validate required agents for complexity
    this.validateComplexityRequirements(state.analysis.complexity, state.plan);

    logger.info('Validation stage completed', {
      agent: 'supervisor',
      threadId: state.threadId,
    });
  }

  /**
   * Validate dependencies are satisfiable
   */
  private validateDependencies(plan: NonNullable<SupervisorState['plan']>): void {
    const agentSet = new Set(plan.agentSequence);

    for (const assignment of plan.taskAssignments) {
      for (const dep of assignment.dependencies) {
        if (!agentSet.has(dep)) {
          throw new Error(
            `Invalid dependency: ${assignment.agentName} depends on ${dep} which is not in sequence`
          );
        }
      }
    }

    // Validate critical ordering
    const archIdx = plan.agentSequence.indexOf('architect');
    const coachIdx = plan.agentSequence.indexOf('coach');
    const codeIdx = plan.agentSequence.indexOf('code');
    const reviewIdx = plan.agentSequence.indexOf('review');

    if (archIdx >= 0 && coachIdx >= 0 && archIdx > coachIdx) {
      throw new Error('Invalid sequence: architect must come before coach');
    }
    if (coachIdx >= 0 && codeIdx >= 0 && coachIdx > codeIdx) {
      throw new Error('Invalid sequence: coach must come before code');
    }
    if (codeIdx >= 0 && reviewIdx >= 0 && codeIdx > reviewIdx) {
      throw new Error('Invalid sequence: code must come before review');
    }
  }

  /**
   * Validate complexity requirements
   */
  private validateComplexityRequirements(
    complexity: 'low' | 'medium' | 'high',
    plan: NonNullable<SupervisorState['plan']>
  ): void {
    if (complexity === 'high') {
      // High complexity should have review and test
      if (!plan.agentSequence.includes('review')) {
        logger.warn('High complexity task without review agent', {
          agent: 'supervisor',
        });
      }
      if (!plan.agentSequence.includes('test')) {
        logger.warn('High complexity task without test agent', {
          agent: 'supervisor',
        });
      }
    }
  }

  /**
   * Build final output
   */
  private buildFinalOutput(state: SupervisorState, threadId: string): SupervisorOutput {
    if (!state.analysis || !state.plan) {
      throw new Error('Analysis and planning must be completed');
    }

    return {
      agentSequence: state.plan.agentSequence,
      taskAssignments: state.plan.taskAssignments,
      executionStrategy: state.plan.executionStrategy,
      estimatedComplexity: state.analysis.complexity,
      risks: state.analysis.risks,
      strategy: state.plan.strategy,
      threadId,
      checkpoints: state.checkpoints,
    };
  }

  /**
   * Save checkpoint
   */
  private saveCheckpoint(
    state: SupervisorState,
    checkpointState: CheckpointInfo['state']
  ): void {
    const checkpoint: CheckpointInfo = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      state: checkpointState,
      data: {
        analysis: state.analysis,
        plan: state.plan,
      },
    };

    state.checkpoints.push(checkpoint);
    SupervisorAgent.stateStore.set(state.threadId, state);

    logger.info('Checkpoint saved', {
      agent: 'supervisor',
      threadId: state.threadId,
      checkpointId: checkpoint.id,
      state: checkpointState,
    });
  }

  /**
   * Enrich risks with security warnings
   */
  private enrichRisks(
    baseRisks: string[],
    task: string,
    complexity: 'low' | 'medium' | 'high'
  ): string[] {
    const risks = [...baseRisks];

    // Security-sensitive tasks
    if (this.isSecuritySensitive(task)) {
      risks.push(
        'Security/Auth warning: never log secrets/tokens/passwords; use HTTPS; secure secret storage; least privilege (RBAC); audit logging; rate limits; follow OWASP guidance.'
      );
    }

    // High complexity warnings
    if (complexity === 'high') {
      risks.push(
        'High complexity: enforce code review + tests; consider human-in-the-loop approval before deployment.'
      );
    }

    return risks;
  }

  /**
   * Check if task is security-sensitive
   */
  private isSecuritySensitive(task: string): boolean {
    const lower = task.toLowerCase();
    return (
      lower.includes('auth') ||
      lower.includes('login') ||
      lower.includes('oauth') ||
      lower.includes('jwt') ||
      lower.includes('password') ||
      lower.includes('token') ||
      lower.includes('session') ||
      lower.includes('security') ||
      lower.includes('encryption')
    );
  }

  /**
   * Remove duplicates and empty strings
   */
  private uniqueNonEmpty(items: string[]): string[] {
    return [...new Set(items.filter((s) => s.trim().length > 0))];
  }

  /**
   * Build analysis prompt
   */
  private buildAnalysisPrompt(availableAgents: string[]): string {
    return `Du bist ein Supervisor Agent. Analysiere den Task und schlage eine Strategie vor.

VERFÜGBARE AGENTS:
${availableAgents.map((a) => `- ${a}`).join('\n')}

AUFGABEN:
1. Komplexität einschätzen (low/medium/high)
2. Risiken identifizieren
3. Domäne bestimmen
4. Empfohlene Agents auswählen

Antworte NUR mit validem JSON:
{
  "complexity": "low" | "medium" | "high",
  "risks": ["risk1", "risk2"],
  "domain": "string (z.B. 'backend', 'frontend', 'data', 'security')",
  "recommendedAgents": ["agent1", "agent2"]
}`;
  }

  /**
   * Build planning prompt
   */
  private buildPlanningPrompt(): string {
    return `Du bist ein Supervisor Agent. Erstelle einen detaillierten Execution-Plan.

REGELN:
- architect MUSS vor coach
- coach MUSS vor code
- code MUSS vor review
- Parallel nur wenn sinnvoll
- Dependencies explizit angeben

Antworte NUR mit validem JSON:
{
  "agentSequence": ["agent1", "agent2"],
  "taskAssignments": [
    {
      "agentName": "agent1",
      "task": "Konkrete Beschreibung",
      "dependencies": []
    }
  ],
  "executionStrategy": {
    "parallel": ["agent3", "agent4"],
    "sequential": ["agent1", "agent2"]
  },
  "strategy": "Gesamtstrategie Beschreibung"
}`;
  }

  /**
   * Build planning user prompt
   */
  private buildPlanningUserPrompt(
    task: string,
    analysis: NonNullable<SupervisorState['analysis']>
  ): string {
    return `Erstelle einen Plan für:

TASK: ${task}
KOMPLEXITÄT: ${analysis.complexity}
DOMÄNE: ${analysis.domain}
EMPFOHLENE AGENTS: ${analysis.recommendedAgents.join(', ')}
BEKANNTE RISIKEN: ${analysis.risks.join('; ')}

Erstelle einen optimalen Execution-Plan mit minimal nötigen Agents.`;
  }

  /**
   * Get fallback output when everything fails
   */
  private getFallbackOutput(
    input: SupervisorInput,
    threadId: string,
    reason: string
  ): SupervisorOutput {
    logger.warn('Using fallback supervisor output', {
      agent: 'supervisor',
      threadId,
      reason,
    });

    const availableAgents = input.availableAgents || [
      'architect',
      'coach',
      'code',
      'review',
      'test',
      'docs',
    ];

    const isSimple = input.task.length < 50;
    const agentSequence = isSimple
      ? ['code', 'review', 'docs']
      : ['architect', 'coach', 'code', 'review', 'test', 'docs'];

    const filteredSequence = agentSequence.filter((a) => availableAgents.includes(a));

    return {
      agentSequence: filteredSequence,
      taskAssignments: filteredSequence.map((agent, index) => ({
        agentName: agent,
        task: `Execute ${agent} task for: ${input.task}`,
        dependencies: index > 0 ? [filteredSequence[index - 1] || ''] : [],
      })),
      executionStrategy: {
        parallel: [],
        sequential: filteredSequence,
      },
      estimatedComplexity: isSimple ? 'low' : 'medium',
      risks: [`Fallback plan used: ${reason}`],
      strategy: isSimple
        ? 'Simple task - direct implementation'
        : 'Standard workflow with full agent pipeline',
      threadId,
      checkpoints: [],
    };
  }
}
