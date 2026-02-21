/**
 * Agent Sync Coordinator
 * Coordinates multiple agents for parallel synchronization
 * Manages sync tasks and agent assignments
 */

import { v4 as uuidv4 } from 'uuid';
import { AgentOrchestrator } from '../agents/agent-orchestrator';
import { AgentTask, TaskPriority } from '../agents/types';

export interface SyncOperation {
  id: string;
  sourceId: string;
  operationType: 'full_sync' | 'incremental_sync';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
}

export interface SyncCoordinatorConfig {
  maxConcurrentSyncs: number;
  syncTimeout: number; // milliseconds
  retryStrategy: 'exponential' | 'linear' | 'fixed';
  retryDelay: number; // milliseconds
}

export class AgentSyncCoordinator {
  private orchestrator: AgentOrchestrator;
  private config: SyncCoordinatorConfig;
  private activeSyncs: Map<string, SyncOperation>;
  private syncTaskMap: Map<string, string>; // taskId -> syncId

  constructor(orchestrator: AgentOrchestrator, config: SyncCoordinatorConfig) {
    this.orchestrator = orchestrator;
    this.config = config;
    this.activeSyncs = new Map();
    this.syncTaskMap = new Map();
  }

  /**
   * Start a synchronization operation for a calendar source
   */
  async startSync(
    sourceId: string,
    operationType: 'full_sync' | 'incremental_sync' = 'incremental_sync',
    priority: TaskPriority = 'medium'
  ): Promise<string> {
    // Check if we can start a new sync
    const activeSyncCount = Array.from(this.activeSyncs.values()).filter(
      sync => sync.status === 'in_progress'
    ).length;

    if (activeSyncCount >= this.config.maxConcurrentSyncs) {
      throw new Error(`Maximum concurrent syncs (${this.config.maxConcurrentSyncs}) reached`);
    }

    // Create sync operation
    const syncId = uuidv4();
    const syncOp: SyncOperation = {
      id: syncId,
      sourceId,
      operationType,
      status: 'pending',
      startTime: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    this.activeSyncs.set(syncId, syncOp);

    // Create agent task for calendar query
    const task: AgentTask = {
      id: uuidv4(),
      type: 'query_calendar',
      priority,
      payload: {
        sourceId,
        operationType,
        syncId
      },
      sourceId,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 3
    };

    // Track task to sync mapping
    this.syncTaskMap.set(task.id, syncId);

    // Submit task to orchestrator
    await this.orchestrator.submitTask(task);

    // Update sync status
    syncOp.status = 'in_progress';

    return syncId;
  }

  /**
   * Start multiple synchronization operations in parallel
   */
  async startParallelSyncs(
    sourceIds: string[],
    operationType: 'full_sync' | 'incremental_sync' = 'incremental_sync'
  ): Promise<string[]> {
    const syncIds: string[] = [];

    for (const sourceId of sourceIds) {
      try {
        const syncId = await this.startSync(sourceId, operationType, 'medium');
        syncIds.push(syncId);
      } catch (error) {
        console.error(`Failed to start sync for source ${sourceId}:`, error);
      }
    }

    return syncIds;
  }

  /**
   * Get sync operation status
   */
  getSyncStatus(syncId: string): SyncOperation | undefined {
    return this.activeSyncs.get(syncId);
  }

  /**
   * Mark sync as completed
   */
  markSyncCompleted(syncId: string): void {
    const syncOp = this.activeSyncs.get(syncId);
    if (syncOp) {
      syncOp.status = 'completed';
      syncOp.endTime = new Date();
    }
  }

  /**
   * Mark sync as failed
   */
  markSyncFailed(syncId: string, errorMessage: string, retry: boolean = true): void {
    const syncOp = this.activeSyncs.get(syncId);
    if (!syncOp) {
      return;
    }

    if (retry && syncOp.retryCount < syncOp.maxRetries) {
      syncOp.retryCount++;
      syncOp.status = 'pending';
      syncOp.errorMessage = undefined;
      // Will be retried by SyncScheduler
    } else {
      syncOp.status = 'failed';
      syncOp.errorMessage = errorMessage;
      syncOp.endTime = new Date();
    }
  }

  /**
   * Get all active syncs
   */
  getActiveSyncs(): SyncOperation[] {
    return Array.from(this.activeSyncs.values());
  }

  /**
   * Get syncs by status
   */
  getSyncsByStatus(status: SyncOperation['status']): SyncOperation[] {
    return Array.from(this.activeSyncs.values()).filter(sync => sync.status === status);
  }

  /**
   * Get sync by source ID
   */
  getSyncBySourceId(sourceId: string): SyncOperation | undefined {
    return Array.from(this.activeSyncs.values()).find(sync => sync.sourceId === sourceId);
  }

  /**
   * Remove completed sync from tracking
   */
  removeSyncOperation(syncId: string): boolean {
    return this.activeSyncs.delete(syncId);
  }

  /**
   * Get sync ID for a task
   */
  getSyncIdForTask(taskId: string): string | undefined {
    return this.syncTaskMap.get(taskId);
  }

  /**
   * Remove task mapping
   */
  removeTaskMapping(taskId: string): void {
    this.syncTaskMap.delete(taskId);
  }

  /**
   * Get coordinator statistics
   */
  getStats(): {
    totalSyncs: number;
    activeSyncs: number;
    completedSyncs: number;
    failedSyncs: number;
    pendingSyncs: number;
  } {
    const allSyncs = Array.from(this.activeSyncs.values());
    return {
      totalSyncs: allSyncs.length,
      activeSyncs: allSyncs.filter(s => s.status === 'in_progress').length,
      completedSyncs: allSyncs.filter(s => s.status === 'completed').length,
      failedSyncs: allSyncs.filter(s => s.status === 'failed').length,
      pendingSyncs: allSyncs.filter(s => s.status === 'pending').length
    };
  }

  /**
   * Clear all sync operations
   */
  clear(): void {
    this.activeSyncs.clear();
    this.syncTaskMap.clear();
  }
}
