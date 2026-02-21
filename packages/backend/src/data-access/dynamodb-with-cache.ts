/**
 * DynamoDB with Cache Fallback
 * Wraps DynamoDB operations with caching layer
 * Falls back to cache when DynamoDB is unavailable
 * Queues write operations for later sync
 */

import { DynamoDBClientWrapper } from './dynamodb-client';
import { DynamoDBEntity } from '../config/schema';
import { cacheManager } from '../utils/cache-manager';
import { operationQueue } from '../utils/operation-queue';
import { errorHandler, ErrorCategory, ErrorSeverity } from '../utils/error-handler';

export interface CacheConfig {
  readCacheTtlMs: number; // How long to cache read results
  writeCacheTtlMs: number; // How long to cache write operations
  enableWriteQueuing: boolean; // Queue writes when DB unavailable
}

export class DynamoDBWithCache {
  private dynamoClient: DynamoDBClientWrapper;
  private config: CacheConfig;
  private isDatabaseAvailable: boolean = true;
  private lastDatabaseCheckTime: Date = new Date();
  private databaseCheckIntervalMs: number = 30000; // Check every 30 seconds

  constructor(
    dynamoClient: DynamoDBClientWrapper,
    config: Partial<CacheConfig> = {}
  ) {
    this.dynamoClient = dynamoClient;
    this.config = {
      readCacheTtlMs: config.readCacheTtlMs || 5 * 60 * 1000, // 5 minutes
      writeCacheTtlMs: config.writeCacheTtlMs || 60 * 60 * 1000, // 1 hour
      enableWriteQueuing: config.enableWriteQueuing !== false
    };

    // Register write operation handler
    this.registerWriteOperationHandler();
  }

  /**
   * Get item with cache fallback
   */
  async get<T extends DynamoDBEntity>(
    key: Record<string, any>,
    consistentRead: boolean = false
  ): Promise<T | null> {
    const cacheKey = this.generateCacheKey('get', key);

    try {
      // Try to get from database
      const result = await this.dynamoClient.get<T>(key, consistentRead);

      // Cache the result
      if (result) {
        cacheManager.set(cacheKey, result, this.config.readCacheTtlMs);
      }

      this.markDatabaseAvailable();
      return result;
    } catch (error: any) {
      // Try to get from cache
      const cachedResult = cacheManager.get<T>(cacheKey);

      if (cachedResult) {
        console.warn(`Database unavailable, returning cached data for key: ${JSON.stringify(key)}`);
        this.markDatabaseUnavailable();
        return cachedResult;
      }

      // No cache available, throw error
      await errorHandler.handleDatabaseError('get_item', error, { key });
      throw error;
    }
  }

  /**
   * Query items with cache fallback
   */
  async query<T extends DynamoDBEntity>(
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    options?: any
  ): Promise<{ items: T[]; lastEvaluatedKey?: Record<string, any> }> {
    const cacheKey = this.generateCacheKey('query', {
      keyConditionExpression,
      expressionAttributeValues,
      options
    });

    try {
      // Try to query database
      const result = await this.dynamoClient.query<T>(
        keyConditionExpression,
        expressionAttributeValues,
        options
      );

      // Cache the result
      cacheManager.set(cacheKey, result, this.config.readCacheTtlMs);

      this.markDatabaseAvailable();
      return result;
    } catch (error: any) {
      // Try to get from cache
      const cachedResult = cacheManager.get<any>(cacheKey);

      if (cachedResult) {
        console.warn(`Database unavailable, returning cached query results`);
        this.markDatabaseUnavailable();
        return cachedResult;
      }

      // No cache available, throw error
      await errorHandler.handleDatabaseError('query_items', error, {
        keyConditionExpression
      });
      throw error;
    }
  }

  /**
   * Put item with write queuing
   */
  async put<T extends DynamoDBEntity>(
    item: T,
    options?: any
  ): Promise<void> {
    try {
      // Try to put to database
      await this.dynamoClient.put(item, options);
      this.markDatabaseAvailable();
    } catch (error: any) {
      // Queue write operation for later
      if (this.config.enableWriteQueuing) {
        console.warn(`Database unavailable, queuing write operation for item: ${item.PK}`);
        this.markDatabaseUnavailable();

        operationQueue.enqueue('write_dynamodb_item', {
          operation: 'put',
          item,
          options
        });

        // Cache the item locally
        const cacheKey = this.generateCacheKey('put', item);
        cacheManager.set(cacheKey, item, this.config.writeCacheTtlMs);
      } else {
        await errorHandler.handleDatabaseError('put_item', error, { itemPK: item.PK });
        throw error;
      }
    }
  }

  /**
   * Update item with write queuing
   */
  async update(
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    conditionExpression?: string
  ): Promise<any> {
    try {
      // Try to update database
      const result = await this.dynamoClient.update(
        key,
        updateExpression,
        expressionAttributeNames,
        expressionAttributeValues,
        conditionExpression
      );

      this.markDatabaseAvailable();
      return result;
    } catch (error: any) {
      // Queue update operation for later
      if (this.config.enableWriteQueuing) {
        console.warn(`Database unavailable, queuing update operation for key: ${JSON.stringify(key)}`);
        this.markDatabaseUnavailable();

        operationQueue.enqueue('write_dynamodb_item', {
          operation: 'update',
          key,
          updateExpression,
          expressionAttributeNames,
          expressionAttributeValues,
          conditionExpression
        });

        // Return empty result (write will be applied later)
        return {};
      } else {
        await errorHandler.handleDatabaseError('update_item', error, { key });
        throw error;
      }
    }
  }

  /**
   * Delete item with write queuing
   */
  async delete(
    key: Record<string, any>,
    conditionExpression?: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>
  ): Promise<void> {
    try {
      // Try to delete from database
      await this.dynamoClient.delete(
        key,
        conditionExpression,
        expressionAttributeNames,
        expressionAttributeValues
      );

      this.markDatabaseAvailable();
    } catch (error: any) {
      // Queue delete operation for later
      if (this.config.enableWriteQueuing) {
        console.warn(`Database unavailable, queuing delete operation for key: ${JSON.stringify(key)}`);
        this.markDatabaseUnavailable();

        operationQueue.enqueue('write_dynamodb_item', {
          operation: 'delete',
          key,
          conditionExpression,
          expressionAttributeNames,
          expressionAttributeValues
        });
      } else {
        await errorHandler.handleDatabaseError('delete_item', error, { key });
        throw error;
      }
    }
  }

  /**
   * Batch get with cache fallback
   */
  async batchGet<T extends DynamoDBEntity>(
    keys: Record<string, any>[]
  ): Promise<T[]> {
    const cacheKey = this.generateCacheKey('batchGet', { keys });

    try {
      // Try to batch get from database
      const result = await this.dynamoClient.batchGet<T>(keys);

      // Cache the result
      cacheManager.set(cacheKey, result, this.config.readCacheTtlMs);

      this.markDatabaseAvailable();
      return result;
    } catch (error: any) {
      // Try to get from cache
      const cachedResult = cacheManager.get<T[]>(cacheKey);

      if (cachedResult) {
        console.warn(`Database unavailable, returning cached batch get results`);
        this.markDatabaseUnavailable();
        return cachedResult;
      }

      // No cache available, throw error
      await errorHandler.handleDatabaseError('batch_get_items', error, {
        keyCount: keys.length
      });
      throw error;
    }
  }

  /**
   * Batch write with write queuing
   */
  async batchWrite(items: any[]): Promise<void> {
    try {
      // Try to batch write to database
      await this.dynamoClient.batchWrite(items);
      this.markDatabaseAvailable();
    } catch (error: any) {
      // Queue batch write operation for later
      if (this.config.enableWriteQueuing) {
        console.warn(`Database unavailable, queuing batch write operation for ${items.length} items`);
        this.markDatabaseUnavailable();

        operationQueue.enqueue('write_dynamodb_batch', {
          items
        });
      } else {
        await errorHandler.handleDatabaseError('batch_write_items', error, {
          itemCount: items.length
        });
        throw error;
      }
    }
  }

  /**
   * Register handler for write operations
   */
  private registerWriteOperationHandler(): void {
    operationQueue.registerHandler('write_dynamodb_item', async (payload: any) => {
      const { operation, key, item, updateExpression, expressionAttributeNames, expressionAttributeValues, conditionExpression } = payload;

      console.log(`Executing queued DynamoDB ${operation} operation`);

      try {
        switch (operation) {
          case 'put':
            await this.dynamoClient.put(item, { conditionExpression: expressionAttributeNames });
            break;
          case 'update':
            await this.dynamoClient.update(
              key,
              updateExpression,
              expressionAttributeNames,
              expressionAttributeValues,
              conditionExpression
            );
            break;
          case 'delete':
            await this.dynamoClient.delete(
              key,
              conditionExpression,
              expressionAttributeNames,
              expressionAttributeValues
            );
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }
      } catch (error: any) {
        throw new Error(`Failed to execute queued ${operation} operation: ${error.message}`);
      }
    });

    operationQueue.registerHandler('write_dynamodb_batch', async (payload: any) => {
      const { items } = payload;

      console.log(`Executing queued batch write operation for ${items.length} items`);

      try {
        await this.dynamoClient.batchWrite(items);
      } catch (error: any) {
        throw new Error(`Failed to execute queued batch write: ${error.message}`);
      }
    });
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(operation: string, data: any): string {
    const hash = JSON.stringify(data).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);

    return `dynamodb:${operation}:${hash}`;
  }

  /**
   * Mark database as available
   */
  private markDatabaseAvailable(): void {
    if (!this.isDatabaseAvailable) {
      console.log('Database is now available');
      this.isDatabaseAvailable = true;
    }
    this.lastDatabaseCheckTime = new Date();
  }

  /**
   * Mark database as unavailable
   */
  private markDatabaseUnavailable(): void {
    if (this.isDatabaseAvailable) {
      console.warn('Database marked as unavailable');
      this.isDatabaseAvailable = false;
    }
    this.lastDatabaseCheckTime = new Date();
  }

  /**
   * Check if database is available
   */
  isDatabaseHealthy(): boolean {
    return this.isDatabaseAvailable;
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return cacheManager.getStats();
  }

  /**
   * Get operation queue statistics
   */
  getQueueStats(): any {
    return operationQueue.getStats();
  }
}
