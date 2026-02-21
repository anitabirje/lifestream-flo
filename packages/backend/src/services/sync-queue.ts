/**
 * Sync Queue
 * Manages pending sync operations with retry logic
 * Retries failed agent tasks every 15 minutes for up to 2 hours
 */

import { v4 as uuidv4 } from 'uuid';
import { AgentSyncCoordinator } from './agent-sync-coordinator';

export interface FailedSyncTask {
  id: string;
  sourceId: string;
  operationType: 'full_sync' | 'incremental_sync';
  failureReason: string;
  failedAt: Date;
  nextRetryAt: Date;
  retryCount: number;
  maxRetries: number;
  firstFailureTime: Date;
}

export interface SyncQueueConfig {
  retryIntervalMs: number; // Default: 15 minutes (900000 ms)
  maxRetryDurationMs: number; // Default: 2 hours (7200000 ms)
  maxRetries: number; // Default: 8 (2 hours / 15 minutes)
  enableAutoRetry: boolean; // Default: true
}

export class SyncQueue {
  private coordinator: AgentSyncCoordinator;
  private config: SyncQueueConfig;
  private failedTasks: Map<string, FailedSyncTask>;
  private retryInterval?: NodeJS.Timeout;
  private isRunning: boolean;

  constructor(
    coordinator: AgentSyncCoordinator,
    config: Partial<SyncQueueConfig> = {}
  ) {
    this.coordinator = coordinator;
    this.config = {
      retryIntervalMs: config.retryIntervalMs || 900000, // 15 minutes
      maxRetryDurationMs: config.maxRetryDurationMs || 7200000, // 2 hours
      maxRetries: config.maxRetries || 8,
      enableAutoRetry: config.enableAutoRetry !== false
    };
    this.failedTasks = new Map();
    this.isRunning = false;

    if (this.config.enableAutoRetry) {
      this.start();
    }
  }

  /**
   * Start the retry scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Sync queue retry scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting sync queue retry scheduler with interval ${this.config.retryIntervalMs}ms`);

    // Schedule retry checks
    this.retryInterval = setInterval(() => {
      this.processRetries().catch(error => {
        console.error('Error processing retries:', error);
      });
    }, this.config.retryIntervalMs);
  }

  /**
   * Stop the retry scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('Sync queue retry scheduler is not running');
      return;
    }

    if (this.retryInterval) {
      clearInterval(this.retryInterval);
      this.retryInterval = undefined;
    }

    this.isRunning = false;
    console.log('Sync queue retry scheduler stopped');
  }

  /**
   * Add a failed sync task to the queue
   */
  addFailedTask(
    sourceId: string,
    operationType: 'full_sync' | 'incremental_sync',
    failureReason: string
  ): string {
    const taskId = uuidv4();
    const now = new Date();

    const failedTask: FailedSyncTask = {
      id: taskId,
      sourceId,
      operationType,
      failureReason,
      failedAt: now,
      nextRetryAt: new Date(now.getTime() + this.config.retryIntervalMs),
      retryCount: 0,
      maxRetries: this.config.maxRetries,
      firstFailureTime: now
    };

    this.failedTasks.set(taskId, failedTask);
    console.log(`Added failed sync task ${taskId} for source ${sourceId} to retry queue`);

    return taskId;
  }

  /**
   * Process retries for failed tasks
   */
  private async processRetries(): Promise<void> {
    const now = new Date();
    const tasksToRetry: FailedSyncTask[] = [];

    // Find tasks that are ready for retry
    for (const task of this.failedTasks.values()) {
      // Check if task has exceeded max retry duration
      const timeSinceFirstFailure = now.getTime() - task.firstFailureTime.getTime();
      if (timeSinceFirstFailure > this.config.maxRetryDurationMs) {
        console.log(`Sync task ${task.id} exceeded max retry duration, removing from queue`);
        this.failedTasks.delete(task.id);
        continue;
      }

      // Check if task is ready for retry
      if (task.nextRetryAt <= now && task.retryCount < task.maxRetries) {
        tasksToRetry.push(task);
      }
    }

    // Retry tasks
    for (const task of tasksToRetry) {
      try {
        console.log(`Retrying sync task ${task.id} for source ${task.sourceId} (attempt ${task.retryCount + 1}/${task.maxRetries})`);

        // Retry the sync
        await this.coordinator.startSync(task.sourceId, task.operationType, 'high');

        // Update retry count and next retry time
        task.retryCount++;
        task.nextRetryAt = new Date(now.getTime() + this.config.retryIntervalMs);

        // If max retries reached, remove from queue
        if (task.retryCount >= task.maxRetries) {
          console.log(`Sync task ${task.id} reached max retries, removing from queue`);
          this.failedTasks.delete(task.id);
        }
      } catch (error) {
        console.error(`Error retrying sync task ${task.id}:`, error);
        // Update next retry time for exponential backoff
        task.nextRetryAt = new Date(now.getTime() + this.config.retryIntervalMs * (task.retryCount + 1));
      }
    }
  }

  /**
   * Get failed task by ID
   */
  getFailedTask(taskId: string): FailedSyncTask | undefined {
    return this.failedTasks.get(taskId);
  }

  /**
   * Get all failed tasks
   */
  getAllFailedTasks(): FailedSyncTask[] {
    return Array.from(this.failedTasks.values());
  }

  /**
   * Get failed tasks for a specific source
   */
  getFailedTasksBySource(sourceId: string): FailedSyncTask[] {
    return Array.from(this.failedTasks.values()).filter(task => task.sourceId === sourceId);
  }

  /**
   * Get failed tasks ready for retry
   */
  getTasksReadyForRetry(): FailedSyncTask[] {
    const now = new Date();
    return Array.from(this.failedTasks.values()).filter(
      task => task.nextRetryAt <= now && task.retryCount < task.maxRetries
    );
  }

  /**
   * Remove a failed task from the queue
   */
  removeFailedTask(taskId: string): boolean {
    return this.failedTasks.delete(taskId);
  }

  /**
   * Clear all failed tasks
   */
  clear(): void {
    this.failedTasks.clear();
  }

  /**
   * Check if retry scheduler is running
   */
  isRetrySchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    totalFailedTasks: number;
    tasksReadyForRetry: number;
    averageRetryCount: number;
    oldestFailureTime?: Date;
  } {
    const allTasks = Array.from(this.failedTasks.values());
    const readyForRetry = this.getTasksReadyForRetry();

    const averageRetryCount = allTasks.length > 0
      ? allTasks.reduce((sum, task) => sum + task.retryCount, 0) / allTasks.length
      : 0;

    const oldestFailureTime = allTasks.length > 0
      ? new Date(Math.min(...allTasks.map(task => task.firstFailureTime.getTime())))
      : undefined;

    return {
      totalFailedTasks: allTasks.length,
      tasksReadyForRetry: readyForRetry.length,
      averageRetryCount,
      oldestFailureTime
    };
  }
}
