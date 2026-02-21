/**
 * Sync Scheduler
 * Triggers sync operations every 5 minutes
 * Creates agent tasks for each calendar source
 * Queues failed syncs for retry when connectivity restored
 */

import { AgentSyncCoordinator } from './agent-sync-coordinator';
import { DynamoDBClient } from '../data-access/dynamodb-client';
import { operationQueue } from '../utils/operation-queue';
import { errorHandler, ErrorCategory, ErrorSeverity } from '../utils/error-handler';

export interface CalendarSource {
  id: string;
  familyMemberId: string;
  type: 'google' | 'outlook' | 'kids_school' | 'kids_connect';
  lastSyncTime: Date;
  syncStatus: 'active' | 'failed' | 'disconnected';
  retryCount: number;
}

export interface SyncSchedulerConfig {
  syncIntervalMs: number; // Default: 5 minutes (300000 ms)
  maxSourcesPerBatch: number; // Default: 10
  enableAutoStart: boolean; // Default: true
}

export class SyncScheduler {
  private coordinator: AgentSyncCoordinator;
  private dynamodbClient: DynamoDBClient;
  private config: SyncSchedulerConfig;
  private schedulerInterval?: NodeJS.Timeout;
  private isRunning: boolean;
  private lastSyncTime: Date;

  constructor(
    coordinator: AgentSyncCoordinator,
    dynamodbClient: DynamoDBClient,
    config: Partial<SyncSchedulerConfig> = {}
  ) {
    this.coordinator = coordinator;
    this.dynamodbClient = dynamodbClient;
    this.config = {
      syncIntervalMs: config.syncIntervalMs || 300000, // 5 minutes
      maxSourcesPerBatch: config.maxSourcesPerBatch || 10,
      enableAutoStart: config.enableAutoStart !== false
    };
    this.isRunning = false;
    this.lastSyncTime = new Date();

    // Register operation queue handler for calendar syncs
    this.registerOperationQueueHandlers();

    if (this.config.enableAutoStart) {
      this.start();
    }
  }

  /**
   * Register handlers for operation queue
   */
  private registerOperationQueueHandlers(): void {
    operationQueue.registerHandler('sync_calendar_source', async (payload: any) => {
      const { sourceId, operationType } = payload;
      console.log(`Retrying sync for source ${sourceId} from operation queue`);
      
      try {
        await this.coordinator.startParallelSyncs([sourceId], operationType || 'incremental_sync');
      } catch (error: any) {
        // Re-throw to let operation queue handle retry
        throw new Error(`Failed to sync source ${sourceId}: ${error.message}`);
      }
    });
  }

  /**
   * Start the sync scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Sync scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting sync scheduler with interval ${this.config.syncIntervalMs}ms`);

    // Run first sync immediately
    this.triggerSync().catch(error => {
      console.error('Error during initial sync:', error);
    });

    // Schedule recurring syncs
    this.schedulerInterval = setInterval(() => {
      this.triggerSync().catch(error => {
        console.error('Error during scheduled sync:', error);
      });
    }, this.config.syncIntervalMs);
  }

  /**
   * Stop the sync scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('Sync scheduler is not running');
      return;
    }

    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = undefined;
    }

    this.isRunning = false;
    console.log('Sync scheduler stopped');
  }

  /**
   * Trigger a sync operation
   */
  private async triggerSync(): Promise<void> {
    try {
      // Get all active calendar sources
      const sources = await this.getActiveSources();

      if (sources.length === 0) {
        console.log('No active calendar sources to sync');
        return;
      }

      console.log(`Triggering sync for ${sources.length} calendar sources`);

      // Process sources in batches
      for (let i = 0; i < sources.length; i += this.config.maxSourcesPerBatch) {
        const batch = sources.slice(i, i + this.config.maxSourcesPerBatch);
        const sourceIds = batch.map(source => source.id);

        try {
          // Start parallel syncs for this batch
          await this.coordinator.startParallelSyncs(sourceIds, 'incremental_sync');
        } catch (error: any) {
          // Queue failed syncs for retry
          await this.handleSyncError(sourceIds, error);
        }
      }

      this.lastSyncTime = new Date();
    } catch (error: any) {
      console.error('Error triggering sync:', error);
      
      // Log error to CloudWatch
      await errorHandler.handleNetworkError(
        'sync_trigger',
        error,
        { operation: 'trigger_sync' }
      );
    }
  }

  /**
   * Handle sync error by queuing for retry
   */
  private async handleSyncError(sourceIds: string[], error: any): Promise<void> {
    console.error(`Sync failed for ${sourceIds.length} sources:`, error);

    // Queue each source for retry
    for (const sourceId of sourceIds) {
      operationQueue.enqueue('sync_calendar_source', {
        sourceId,
        operationType: 'incremental_sync',
        originalError: error.message
      });
    }

    // Log error
    await errorHandler.handleNetworkError(
      'calendar_sync',
      error,
      {
        sourceIds,
        sourceCount: sourceIds.length
      }
    );
  }

  /**
   * Get all active calendar sources from DynamoDB
   */
  private async getActiveSources(): Promise<CalendarSource[]> {
    try {
      // Query all calendar sources with active status
      // This is a simplified implementation - actual implementation would query DynamoDB
      // For now, return empty array as placeholder
      // In real implementation, this would query the CALENDAR_SOURCES table or similar
      return [];
    } catch (error) {
      console.error('Error fetching calendar sources:', error);
      return [];
    }
  }

  /**
   * Manually trigger a sync for specific sources
   */
  async syncSources(sourceIds: string[]): Promise<string[]> {
    if (!this.isRunning) {
      throw new Error('Sync scheduler is not running');
    }

    console.log(`Manually triggering sync for ${sourceIds.length} sources`);
    return this.coordinator.startParallelSyncs(sourceIds, 'incremental_sync');
  }

  /**
   * Manually trigger a full sync for specific sources
   */
  async fullSyncSources(sourceIds: string[]): Promise<string[]> {
    if (!this.isRunning) {
      throw new Error('Sync scheduler is not running');
    }

    console.log(`Manually triggering full sync for ${sourceIds.length} sources`);
    return this.coordinator.startParallelSyncs(sourceIds, 'full_sync');
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): Date {
    return this.lastSyncTime;
  }

  /**
   * Get scheduler statistics
   */
  getStats(): {
    isRunning: boolean;
    lastSyncTime: Date;
    syncIntervalMs: number;
    coordinatorStats: any;
  } {
    return {
      isRunning: this.isRunning,
      lastSyncTime: this.lastSyncTime,
      syncIntervalMs: this.config.syncIntervalMs,
      coordinatorStats: this.coordinator.getStats()
    };
  }
}
