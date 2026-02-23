/**
 * DynamoDB Data Access Layer
 * 
 * Provides a wrapper around DynamoDB operations with:
 * - Batch read/write operations
 * - Conditional writes for conflict prevention
 * - Exponential backoff for throttling
 * - Error handling and retry logic
 * - Graceful degradation with caching
 */

import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  BatchGetCommand,
  BatchWriteCommand,
  TransactWriteCommand,
  GetCommandInput,
  PutCommandInput,
  UpdateCommandInput,
  DeleteCommandInput,
  QueryCommandInput,
  BatchGetCommandInput,
  BatchWriteCommandInput,
  TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { docClient } from '../config/dynamodb';
import { TABLE_CONFIG, DynamoDBEntity } from '../config/schema';
import { cacheManager } from '../utils/cache-manager';
import { errorHandler, ErrorCategory, ErrorSeverity } from '../utils/error-handler';

// ============================================================================
// TYPES
// ============================================================================

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

export interface BatchWriteItem {
  PutRequest?: {
    Item: DynamoDBEntity;
  };
  DeleteRequest?: {
    Key: Record<string, any>;
  };
}

export interface ConditionalWriteOptions {
  conditionExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 5,
  baseDelayMs: 100,
  maxDelayMs: 5000,
  retryableErrors: [
    'ProvisionedThroughputExceededException',
    'ThrottlingException',
    'RequestLimitExceeded',
    'InternalServerError',
    'ServiceUnavailable',
  ],
};

// ============================================================================
// DYNAMODB CLIENT WRAPPER
// ============================================================================

export class DynamoDBClientWrapper {
  private tableName: string;
  private retryConfig: RetryConfig;
  
  constructor(
    tableName: string = TABLE_CONFIG.tableName,
    retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
  ) {
    this.tableName = tableName;
    this.retryConfig = retryConfig;
  }
  
  // ==========================================================================
  // BASIC OPERATIONS
  // ==========================================================================
  
  /**
   * Get a single item by key
   */
  async get<T extends DynamoDBEntity>(
    key: Record<string, any>,
    consistentRead: boolean = false
  ): Promise<T | null> {
    const params: GetCommandInput = {
      TableName: this.tableName,
      Key: key,
      ConsistentRead: consistentRead,
    };
    
    const result = await this.executeWithRetry(
      () => docClient.send(new GetCommand(params))
    );
    
    return (result.Item as T) || null;
  }
  
  /**
   * Put an item with optional conditional write
   */
  async put<T extends DynamoDBEntity>(
    item: T,
    options?: ConditionalWriteOptions
  ): Promise<void> {
    const params: PutCommandInput = {
      TableName: this.tableName,
      Item: item,
      ...options,
    };
    
    await this.executeWithRetry(
      () => docClient.send(new PutCommand(params))
    );
  }
  
  /**
   * Update an item with conditional write support
   */
  async update(
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>,
    conditionExpression?: string
  ): Promise<any> {
    const params: UpdateCommandInput = {
      TableName: this.tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: conditionExpression,
      ReturnValues: 'ALL_NEW',
    };
    
    const result = await this.executeWithRetry(
      () => docClient.send(new UpdateCommand(params))
    );
    
    return result.Attributes;
  }
  
  /**
   * Delete an item with optional conditional delete
   */
  async delete(
    key: Record<string, any>,
    conditionExpression?: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>
  ): Promise<void> {
    const params: DeleteCommandInput = {
      TableName: this.tableName,
      Key: key,
      ConditionExpression: conditionExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    };
    
    await this.executeWithRetry(
      () => docClient.send(new DeleteCommand(params))
    );
  }
  
  /**
   * Query items with pagination support
   */
  async query<T extends DynamoDBEntity>(
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    options?: {
      indexName?: string;
      filterExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      limit?: number;
      exclusiveStartKey?: Record<string, any>;
      scanIndexForward?: boolean;
    }
  ): Promise<{ items: T[]; lastEvaluatedKey?: Record<string, any> }> {
    const params: QueryCommandInput = {
      TableName: this.tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ...options,
    };
    
    const result = await this.executeWithRetry(
      () => docClient.send(new QueryCommand(params))
    );
    
    return {
      items: (result.Items as T[]) || [],
      lastEvaluatedKey: result.LastEvaluatedKey,
    };
  }
  
  /**
   * Query all items (handles pagination automatically)
   */
  async queryAll<T extends DynamoDBEntity>(
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    options?: {
      indexName?: string;
      filterExpression?: string;
      expressionAttributeNames?: Record<string, string>;
      scanIndexForward?: boolean;
    }
  ): Promise<T[]> {
    const allItems: T[] = [];
    let lastEvaluatedKey: Record<string, any> | undefined;
    
    do {
      const result = await this.query<T>(
        keyConditionExpression,
        expressionAttributeValues,
        {
          ...options,
          exclusiveStartKey: lastEvaluatedKey,
        }
      );
      
      allItems.push(...result.items);
      lastEvaluatedKey = result.lastEvaluatedKey;
    } while (lastEvaluatedKey);
    
    return allItems;
  }
  
  // ==========================================================================
  // BATCH OPERATIONS
  // ==========================================================================
  
  /**
   * Batch get items (up to 100 items)
   * Automatically handles unprocessed keys
   */
  async batchGet<T extends DynamoDBEntity>(
    keys: Record<string, any>[]
  ): Promise<T[]> {
    if (keys.length === 0) {
      return [];
    }
    
    if (keys.length > 100) {
      throw new Error('Batch get supports maximum 100 items');
    }
    
    const params: BatchGetCommandInput = {
      RequestItems: {
        [this.tableName]: {
          Keys: keys,
        },
      },
    };
    
    const allItems: T[] = [];
    let unprocessedKeys = params.RequestItems;
    
    while (unprocessedKeys && Object.keys(unprocessedKeys).length > 0) {
      const result = await this.executeWithRetry(
        () => docClient.send(new BatchGetCommand({ RequestItems: unprocessedKeys }))
      );
      
      const items = result.Responses?.[this.tableName] || [];
      allItems.push(...(items as T[]));
      
      unprocessedKeys = result.UnprocessedKeys;
      
      // If there are unprocessed keys, wait before retrying
      if (unprocessedKeys && Object.keys(unprocessedKeys).length > 0) {
        await this.delay(100);
      }
    }
    
    return allItems;
  }
  
  /**
   * Batch write items (put or delete, up to 25 items)
   * Automatically handles unprocessed items
   */
  async batchWrite(items: BatchWriteItem[]): Promise<void> {
    if (items.length === 0) {
      return;
    }
    
    if (items.length > 25) {
      throw new Error('Batch write supports maximum 25 items');
    }
    
    const params: BatchWriteCommandInput = {
      RequestItems: {
        [this.tableName]: items,
      },
    };
    
    let unprocessedItems = params.RequestItems;
    
    while (unprocessedItems && Object.keys(unprocessedItems).length > 0) {
      const result = await this.executeWithRetry(
        () => docClient.send(new BatchWriteCommand({ RequestItems: unprocessedItems }))
      );
      
      unprocessedItems = result.UnprocessedItems;
      
      // If there are unprocessed items, wait before retrying
      if (unprocessedItems && Object.keys(unprocessedItems).length > 0) {
        await this.delay(100);
      }
    }
  }
  
  /**
   * Batch write with automatic chunking for large datasets
   */
  async batchWriteChunked(items: BatchWriteItem[]): Promise<void> {
    const chunks = this.chunkArray(items, 25);
    
    for (const chunk of chunks) {
      await this.batchWrite(chunk);
    }
  }
  
  // ==========================================================================
  // TRANSACTIONAL OPERATIONS
  // ==========================================================================
  
  /**
   * Execute a transaction with multiple operations
   */
  async transactWrite(
    transactItems: TransactWriteCommandInput['TransactItems']
  ): Promise<void> {
    const params: TransactWriteCommandInput = {
      TransactItems: transactItems,
    };
    
    await this.executeWithRetry(
      () => docClient.send(new TransactWriteCommand(params))
    );
  }
  
  // ==========================================================================
  // CONDITIONAL WRITE HELPERS
  // ==========================================================================
  
  /**
   * Put item only if it doesn't exist
   */
  async putIfNotExists<T extends DynamoDBEntity>(item: T): Promise<void> {
    await this.put(item, {
      conditionExpression: 'attribute_not_exists(PK)',
    });
  }
  
  /**
   * Update item only if it exists
   */
  async updateIfExists(
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>
  ): Promise<any> {
    return this.update(
      key,
      updateExpression,
      expressionAttributeNames,
      expressionAttributeValues,
      'attribute_exists(PK)'
    );
  }
  
  /**
   * Delete item only if it exists
   */
  async deleteIfExists(key: Record<string, any>): Promise<void> {
    await this.delete(key, 'attribute_exists(PK)');
  }
  
  // ==========================================================================
  // RETRY LOGIC WITH EXPONENTIAL BACKOFF
  // ==========================================================================
  
  /**
   * Execute operation with exponential backoff retry
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const isRetryable = this.retryConfig.retryableErrors.includes(error.name);
      const canRetry = attempt < this.retryConfig.maxRetries;
      
      if (isRetryable && canRetry) {
        const delayMs = this.calculateBackoffDelay(attempt);
        console.warn(
          `Retrying DynamoDB operation after ${delayMs}ms (attempt ${attempt + 1}/${this.retryConfig.maxRetries}): ${error.name}`
        );
        
        await this.delay(delayMs);
        return this.executeWithRetry(operation, attempt + 1);
      }

      // Log error to CloudWatch
      await errorHandler.handleDatabaseError(
        'DynamoDB operation',
        error,
        {
          operation: operation.toString(),
          attempt,
          errorName: error.name
        }
      );

      throw error;
    }
  }
  
  /**
   * Calculate exponential backoff delay with jitter
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * this.retryConfig.baseDelayMs;
    const delay = exponentialDelay + jitter;
    
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }
  
  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}

// ============================================================================
// SIMPLIFIED INTERFACE FOR SERVICES
// ============================================================================

export class DynamoDBDataAccess {
  constructor(private client: DynamoDBClientWrapper) {}

  async putItem(item: DynamoDBEntity): Promise<void> {
    await this.client.put(item);
  }

  async getItem(pk: string, sk: string): Promise<DynamoDBEntity | null> {
    return await this.client.get({ PK: pk, SK: sk });
  }

  async query(pk: string, skPrefix: string): Promise<DynamoDBEntity[]> {
    const result = await this.client.queryAll(
      'PK = :pk AND begins_with(SK, :sk)',
      {
        ':pk': pk,
        ':sk': skPrefix,
      }
    );
    return result;
  }

  async deleteItem(pk: string, sk: string): Promise<void> {
    await this.client.delete({ PK: pk, SK: sk });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

const clientWrapper = new DynamoDBClientWrapper();
export const dynamoDBDataAccess = new DynamoDBDataAccess(clientWrapper);

export function getDynamoDBClient(): DynamoDBClientWrapper {
  return clientWrapper;
}

// Export the wrapper for direct access if needed
export const dynamoDBClientWrapper = clientWrapper;


