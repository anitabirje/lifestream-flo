/**
 * Operation Queue
 * Queues operations that fail due to network errors
 * Retries when connectivity is restored
 */

import { v4 as uuidv4 } from 'uuid';

export enum OperationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING'
}

export interface QueuedOperation {
  id: string;
  type: string;
  payload: any;
  status: OperationStatus;
  createdAt: Date;
  lastAttemptAt?: Date;
  nextRetryAt?: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

export interface OperationQueueConfig {
  maxRetries: number;
  initialRetryDelayMs: number;
  maxRetryDelayMs: number;
  backoffMultiplier: number;
}

export class OperationQueue {
  private queue: Map<string, QueuedOperation> = new Map();
  private config: OperationQueueConfig;
  private processingInterval?: NodeJS.Timeout;
  private isProcessing: boolean = false;
  private operationHandlers: Map<string, (payload: any) => Promise<void>> = new Map();

  constructor(config: Partial<OperationQueueConfig> = {}) {
    this.config = {
      maxRetries: config.maxRetries || 5,
      initialRetryDelayMs: config.initialRetryDelayMs || 1000,
      maxRetryDelayMs: config.maxRetryDelayMs || 60000,
      backoffMultiplier: config.backoffMultiplier || 2
    };
  }

  /**
   * Register a handler for an operation type
   */
  registerHandler(operationType: string, handler: (payload: any) => Promise<void>): void {
    this.operationHandlers.set(operationType, handler);
  }

  /**
   * Queue an operation
   */
  enqueue(type: string, payload: any): string {
    const operationId = uuidv4();
    const operation: QueuedOperation = {
      id: operationId,
      type,
      payload,
      status: OperationStatus.PENDING,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: this.config.maxRetries
    };

    this.queue.set(operationId, operation);

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return operationId;
  }

  /**
   * Get operation status
   */
  getStatus(operationId: string): OperationStatus | null {
    const operation = this.queue.get(operationId);
    return operation ? operation.status : null;
  }

  /**
   * Get operation details
   */
  getOperation(operationId: string): QueuedOperation | null {
    return this.queue.get(operationId) || null;
  }

  /**
   * Get all pending operations
   */
  getPendingOperations(): QueuedOperation[] {
    return Array.from(this.queue.values()).filter(
      op => op.status === OperationStatus.PENDING || op.status === OperationStatus.RETRYING
    );
  }

  /**
   * Get all failed operations
   */
  getFailedOperations(): QueuedOperation[] {
    return Array.from(this.queue.values()).filter(op => op.status === OperationStatus.FAILED);
  }

  /**
   * Start processing operations
   */
  private startProcessing(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.processingInterval = setInterval(() => {
      this.processOperations();
    }, 1000); // Check every second
  }

  /**
   * Stop processing operations
   */
  stopProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.isProcessing = false;
  }

  /**
   * Process queued operations
   */
  private async processOperations(): Promise<void> {
    const now = new Date();
    const operations = Array.from(this.queue.values());

    for (const operation of operations) {
      // Skip if not ready to retry
      if (operation.status === OperationStatus.RETRYING && operation.nextRetryAt && now < operation.nextRetryAt) {
        continue;
      }

      // Skip if already in progress or completed
      if (operation.status === OperationStatus.IN_PROGRESS || operation.status === OperationStatus.COMPLETED) {
        continue;
      }

      // Skip if failed and max retries exceeded
      if (operation.status === OperationStatus.FAILED) {
        continue;
      }

      // Process the operation
      await this.executeOperation(operation);
    }

    // Stop processing if no more pending operations
    if (this.getPendingOperations().length === 0) {
      this.stopProcessing();
    }
  }

  /**
   * Execute a single operation
   */
  private async executeOperation(operation: QueuedOperation): Promise<void> {
    const handler = this.operationHandlers.get(operation.type);

    if (!handler) {
      operation.status = OperationStatus.FAILED;
      operation.error = `No handler registered for operation type: ${operation.type}`;
      return;
    }

    operation.status = OperationStatus.IN_PROGRESS;
    operation.lastAttemptAt = new Date();

    try {
      await handler(operation.payload);
      operation.status = OperationStatus.COMPLETED;
    } catch (error: any) {
      operation.retryCount++;
      operation.error = error?.message || 'Unknown error';

      if (operation.retryCount < operation.maxRetries) {
        // Schedule retry
        operation.status = OperationStatus.RETRYING;
        const delayMs = this.calculateRetryDelay(operation.retryCount);
        operation.nextRetryAt = new Date(Date.now() + delayMs);
      } else {
        // Max retries exceeded
        operation.status = OperationStatus.FAILED;
      }
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(retryCount: number): number {
    const exponentialDelay = this.config.initialRetryDelayMs * Math.pow(this.config.backoffMultiplier, retryCount - 1);
    const jitter = Math.random() * this.config.initialRetryDelayMs;
    const delay = exponentialDelay + jitter;

    return Math.min(delay, this.config.maxRetryDelayMs);
  }

  /**
   * Retry a failed operation
   */
  retryOperation(operationId: string): boolean {
    const operation = this.queue.get(operationId);

    if (!operation) {
      return false;
    }

    if (operation.status !== OperationStatus.FAILED) {
      return false;
    }

    operation.status = OperationStatus.RETRYING;
    operation.retryCount = 0;
    operation.nextRetryAt = new Date();

    // Start processing if not already running
    if (!this.isProcessing) {
      this.startProcessing();
    }

    return true;
  }

  /**
   * Remove operation from queue
   */
  remove(operationId: string): boolean {
    return this.queue.delete(operationId);
  }

  /**
   * Clear all operations
   */
  clear(): void {
    this.queue.clear();
  }

  /**
   * Get queue statistics
   */
  getStats(): {
    totalOperations: number;
    pendingOperations: number;
    inProgressOperations: number;
    completedOperations: number;
    failedOperations: number;
    retryingOperations: number;
  } {
    const operations = Array.from(this.queue.values());

    return {
      totalOperations: operations.length,
      pendingOperations: operations.filter(op => op.status === OperationStatus.PENDING).length,
      inProgressOperations: operations.filter(op => op.status === OperationStatus.IN_PROGRESS).length,
      completedOperations: operations.filter(op => op.status === OperationStatus.COMPLETED).length,
      failedOperations: operations.filter(op => op.status === OperationStatus.FAILED).length,
      retryingOperations: operations.filter(op => op.status === OperationStatus.RETRYING).length
    };
  }

  /**
   * Destroy operation queue
   */
  destroy(): void {
    this.stopProcessing();
    this.clear();
    this.operationHandlers.clear();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const operationQueue = new OperationQueue();
