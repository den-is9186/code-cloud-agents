// Agent Roles
export type AgentRole =
  | 'supervisor'
  | 'architect'
  | 'coach'
  | 'code'
  | 'review'
  | 'test'
  | 'docs'
  | 'vision'
  | 'refactor'
  | 'merge'
  | 'tool-builder'
  | 'multi-repo';

// Agent Status
export type AgentStatus =
  | 'idle'
  | 'working'
  | 'waiting'
  | 'error'
  | 'done'
  | 'completed'
  | 'failed';

// Base Agent Interface
export interface Agent<TInput = unknown, TOutput = unknown> {
  role: AgentRole;
  model: string;
  status: AgentStatus;
  execute(input: TInput): Promise<TOutput>;
}

// Runbook Types
export interface Step {
  id: string;
  description: string;
  files: string[];
  expectedOutcome: string;
  estimatedTokens: number;
}

export interface TaskInput {
  files?: string[];
  feedback?: ReviewResult;
}

export interface SubTask {
  id: string;
  stepId: string;
  assignedAgent: AgentRole;
  description: string;
  input: TaskInput;
  expectedOutput: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export interface Dependency {
  taskId: string;
  dependsOn: string[];
}

// File Types
export interface FileChange {
  path: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
  diff?: string;
}

// Review Types
export interface Issue {
  severity: 'error' | 'warning' | 'info';
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
  rule?: string;
}

export interface ReviewFeedback {
  approved: boolean;
  issues: Issue[];
  mustFix: Issue[];
}

export interface ReviewResult {
  approved: boolean;
  issues: Issue[];
  summary: string;
  mustFix: Issue[];
  suggestions: Issue[];
}

// Test Types
export interface TestFile {
  path: string;
  testCount: number;
  content: string;
}

export interface TestResult {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
}

export interface TestFailure {
  testName: string;
  file: string;
  error: string;
  expected?: string;
  actual?: string;
}

// LLM Types
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: TokenUsage;
}

// Project Context
export interface ProjectContext {
  path: string;
  language: string;
  framework?: string;
  files: string[];
  dependencies: Record<string, string>;
}

// Error Response
export interface ErrorResponse {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

// Build Result
export interface BuildResult {
  success: boolean;
  filesChanged: FileChange[];
  testsWritten: TestFile[];
  testResults?: TestResult;
  docsUpdated: FileChange[];
  totalCost: number;
  totalTokens: number;
  duration: number;
  errors?: string[];
}

// Chat Types
export interface TaskAnalysis {
  taskType: 'refactor' | 'feature' | 'fix' | 'docs' | 'test' | 'question' | 'unknown';
  complexity: 'low' | 'medium' | 'high';
  repos: string[];
  estimatedTokens: number;
  estimatedCost: number;
  estimatedTimeSeconds: number;
  description: string;
}

export interface TeamSuggestion {
  preset: string;
  agents: AgentAssignment[];
  totalCost: number;
  estimatedTime: string;
  canOptimize: boolean;
  optimizationTip?: string;
}

export interface AgentAssignment {
  role: AgentRole;
  model: string;
  reason: string;
}

// Multi-Repo Types
export interface RepositoryConfig {
  path: string;
  name: string;
  branch?: string;
  remote?: string;
}

export interface MultiRepoChange {
  repo: string;
  filesChanged: FileChange[];
  branch: string;
  commitHash?: string;
  prUrl?: string;
}

export interface MultiRepoOperation {
  repos: RepositoryConfig[];
  task: string;
  changes: string;
  createPRs: boolean;
  baseBranch?: string;
  targetBranch?: string;
}

export interface MultiRepoResult {
  success: boolean;
  reposProcessed: number;
  reposFailed: number;
  changes: MultiRepoChange[];
  errors: Array<{ repo: string; error: string }>;
  summary: string;
  totalCost: number;
  totalTokens: number;
  duration: number;
}
