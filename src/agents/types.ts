// Agent Roles
export type AgentRole = "supervisor" | "architect" | "coach" | "code" | "review" | "test" | "docs" | "vision";

// Agent Status
export type AgentStatus = "idle" | "working" | "waiting" | "error" | "done";

// Base Agent Interface
export interface Agent {
  role: AgentRole;
  model: string;
  status: AgentStatus;
  execute(input: any): Promise<any>;
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
  feedback?: ReviewFeedback;
  [key: string]: any;
}

export interface SubTask {
  id: string;
  stepId: string;
  assignedAgent: AgentRole;
  description: string;
  input: TaskInput;
  expectedOutput: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

export interface Dependency {
  taskId: string;
  dependsOn: string[];
}

// File Types
export interface FileChange {
  path: string;
  action: "create" | "modify" | "delete";
  content?: string;
  diff?: string;
}

// Review Types
export interface Issue {
  severity: "error" | "warning" | "info";
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
  role: "system" | "user" | "assistant";
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
  arguments: Record<string, any>;
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
  taskType: "refactor" | "feature" | "fix" | "docs" | "test" | "question" | "unknown";
  complexity: "low" | "medium" | "high";
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
