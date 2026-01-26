import { EventEmitter } from 'events';
import { logger } from './logger';

/**
 * Event types for streaming progress updates
 */
export enum StreamEventType {
  TASK_START = 'task:start',
  TASK_PROGRESS = 'task:progress',
  TASK_COMPLETE = 'task:complete',
  TASK_ERROR = 'task:error',
  AGENT_START = 'agent:start',
  AGENT_COMPLETE = 'agent:complete',
  FILE_CHANGE = 'file:change',
  TEST_RUN = 'test:run',
  BUILD_START = 'build:start',
  BUILD_COMPLETE = 'build:complete',
}

/**
 * Event payload types
 */
export interface TaskStartEvent {
  taskId: string;
  description: string;
  agent: string;
}

export interface TaskProgressEvent {
  taskId: string;
  progress: number; // 0-100
  message: string;
}

export interface TaskCompleteEvent {
  taskId: string;
  success: boolean;
  duration: number;
}

export interface AgentStartEvent {
  agent: string;
  task: string;
}

export interface AgentCompleteEvent {
  agent: string;
  success: boolean;
  duration: number;
}

export interface FileChangeEvent {
  path: string;
  action: 'create' | 'modify' | 'delete';
}

export interface TestRunEvent {
  passed: number;
  failed: number;
  total: number;
}

export interface BuildEvent {
  success: boolean;
  errors?: string[];
}

/**
 * Global event emitter for streaming progress
 */
export class StreamEmitter extends EventEmitter {
  private static instance: StreamEmitter;

  private constructor() {
    super();
    this.setMaxListeners(100); // Support many concurrent listeners
  }

  static getInstance(): StreamEmitter {
    if (!StreamEmitter.instance) {
      StreamEmitter.instance = new StreamEmitter();
    }
    return StreamEmitter.instance;
  }

  // Typed event emitters
  emitTaskStart(event: TaskStartEvent) {
    logger.info('Task started', event);
    this.emit(StreamEventType.TASK_START, event);
  }

  emitTaskProgress(event: TaskProgressEvent) {
    logger.debug('Task progress', event);
    this.emit(StreamEventType.TASK_PROGRESS, event);
  }

  emitTaskComplete(event: TaskCompleteEvent) {
    logger.info('Task completed', event);
    this.emit(StreamEventType.TASK_COMPLETE, event);
  }

  emitTaskError(taskId: string, error: string) {
    logger.error('Task error', { taskId, error });
    this.emit(StreamEventType.TASK_ERROR, { taskId, error });
  }

  emitAgentStart(event: AgentStartEvent) {
    logger.info('Agent started', event);
    this.emit(StreamEventType.AGENT_START, event);
  }

  emitAgentComplete(event: AgentCompleteEvent) {
    logger.info('Agent completed', event);
    this.emit(StreamEventType.AGENT_COMPLETE, event);
  }

  emitFileChange(event: FileChangeEvent) {
    logger.debug('File changed', event);
    this.emit(StreamEventType.FILE_CHANGE, event);
  }

  emitTestRun(event: TestRunEvent) {
    logger.info('Tests ran', event);
    this.emit(StreamEventType.TEST_RUN, event);
  }

  emitBuildStart() {
    logger.info('Build started');
    this.emit(StreamEventType.BUILD_START, {});
  }

  emitBuildComplete(event: BuildEvent) {
    logger.info('Build completed', event);
    this.emit(StreamEventType.BUILD_COMPLETE, event);
  }
}

// Export singleton instance
export const streamEmitter = StreamEmitter.getInstance();
