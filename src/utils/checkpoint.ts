import * as fs from 'fs/promises';
import * as path from 'path';
import { BuildResult, SubTask } from '../agents/types';
import { logger } from './logger';

/**
 * Checkpoint data structure for saving build state
 */
export interface RunbookStep {
  id: string;
  description: string;
  dependencies?: string[];
  estimatedTime?: number;
}

export interface ExecutionOrderItem {
  step: string;
  priority: number;
  parallel?: boolean;
}

export interface Checkpoint {
  id: string;
  timestamp: number;
  task: string;
  projectPath: string;
  currentPhase: 'architect' | 'coach' | 'execution' | 'documentation' | 'complete';
  completedTasks: string[];
  pendingTasks: SubTask[];
  result: Partial<BuildResult>;
  runbook?: RunbookStep[];
  executionOrder?: ExecutionOrderItem[];
  errors?: string[];
}

/**
 * Checkpoint Manager for saving and resuming build state
 */
export class CheckpointManager {
  private checkpointDir: string;
  private autoSave: boolean;
  private saveInterval: number;
  private intervalId?: NodeJS.Timeout;

  constructor(checkpointDir: string = '.checkpoints', autoSave: boolean = true) {
    this.checkpointDir = path.resolve(process.cwd(), checkpointDir);
    this.autoSave = autoSave;
    this.saveInterval = 30000; // 30 seconds
  }

  /**
   * Initialize checkpoint directory
   */
  async init(): Promise<void> {
    try {
      await fs.mkdir(this.checkpointDir, { recursive: true });
      logger.info('Checkpoint directory initialized', { dir: this.checkpointDir });
    } catch (error) {
      logger.error('Failed to create checkpoint directory', { error });
      throw error;
    }
  }

  /**
   * Save checkpoint to disk
   */
  async save(checkpoint: Checkpoint): Promise<void> {
    await this.init();

    const filename = `checkpoint-${checkpoint.id}.json`;
    const filepath = path.join(this.checkpointDir, filename);

    try {
      await fs.writeFile(filepath, JSON.stringify(checkpoint, null, 2), 'utf-8');
      logger.info('Checkpoint saved', { id: checkpoint.id, filepath });
    } catch (error) {
      logger.error('Failed to save checkpoint', { id: checkpoint.id, error });
      throw error;
    }
  }

  /**
   * Load checkpoint from disk
   */
  async load(checkpointId: string): Promise<Checkpoint | null> {
    const filename = `checkpoint-${checkpointId}.json`;
    const filepath = path.join(this.checkpointDir, filename);

    try {
      const data = await fs.readFile(filepath, 'utf-8');
      const checkpoint: Checkpoint = JSON.parse(data);
      logger.info('Checkpoint loaded', { id: checkpointId });
      return checkpoint;
    } catch (error) {
      logger.warn('Failed to load checkpoint', { id: checkpointId, error });
      return null;
    }
  }

  /**
   * List all available checkpoints
   */
  async list(): Promise<Checkpoint[]> {
    try {
      const files = await fs.readdir(this.checkpointDir);
      const checkpointFiles = files.filter(
        (f) => f.startsWith('checkpoint-') && f.endsWith('.json')
      );

      const checkpoints = await Promise.all(
        checkpointFiles.map(async (file) => {
          const data = await fs.readFile(path.join(this.checkpointDir, file), 'utf-8');
          return JSON.parse(data) as Checkpoint;
        })
      );

      return checkpoints.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      logger.error('Failed to list checkpoints', { error });
      return [];
    }
  }

  /**
   * Get latest checkpoint
   */
  async getLatest(): Promise<Checkpoint | null> {
    const checkpoints = await this.list();
    return checkpoints.length > 0 ? checkpoints[0] || null : null;
  }

  /**
   * Delete checkpoint
   */
  async delete(checkpointId: string): Promise<void> {
    const filename = `checkpoint-${checkpointId}.json`;
    const filepath = path.join(this.checkpointDir, filename);

    try {
      await fs.unlink(filepath);
      logger.info('Checkpoint deleted', { id: checkpointId });
    } catch (error) {
      logger.warn('Failed to delete checkpoint', { id: checkpointId, error });
    }
  }

  /**
   * Clean old checkpoints (keep last N)
   */
  async cleanup(keepCount: number = 5): Promise<void> {
    const checkpoints = await this.list();

    if (checkpoints.length > keepCount) {
      const toDelete = checkpoints.slice(keepCount);

      await Promise.all(toDelete.map((cp) => this.delete(cp.id)));

      logger.info('Cleaned up old checkpoints', {
        deleted: toDelete.length,
        kept: keepCount,
      });
    }
  }

  /**
   * Start auto-save interval
   */
  startAutoSave(getCurrentCheckpoint: () => Checkpoint) {
    if (!this.autoSave || this.intervalId) return;

    this.intervalId = setInterval(async () => {
      try {
        const checkpoint = getCurrentCheckpoint();
        await this.save(checkpoint);
      } catch (error) {
        logger.error('Auto-save failed', { error });
      }
    }, this.saveInterval);

    logger.info('Auto-save started', { interval: this.saveInterval });
  }

  /**
   * Stop auto-save interval
   */
  stopAutoSave() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      logger.info('Auto-save stopped');
    }
  }
}

// Export singleton instance
export const checkpointManager = new CheckpointManager();
