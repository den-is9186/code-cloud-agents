/**
 * Type Definitions for Multi-Agent System
 */

export type AgentName =
  | 'architect'
  | 'coach'
  | 'code'
  | 'review'
  | 'test'
  | 'docs';

export type BuildStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed';

export type AgentStatus =
  | 'success'
  | 'error';

export type PresetType = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface AgentResult {
  agent: AgentName;
  status: AgentStatus;
  output: any;
  cost: number;
  duration: number;
  error?: string;
}

export interface BuildContext {
  buildId: string;
  teamId: string;
  requirements: string;
  preset: PresetType;
}

export interface BuildState {
  buildId: string;
  teamId: string;
  status: BuildStatus;
  current_agent: AgentName | null;
  started_at: string;
  completed_at?: string;
  total_cost: number;
  total_duration: number;
  error?: string;
}

export interface AgentInput {
  requirements?: string;
  runbook?: string;
  tasks?: any[];
  code_changes?: any[];
  review_result?: any;
  test_files?: any[];
}

export interface AgentConfig {
  model: string;
  maxTokens: number;
  temperature: number;
}
