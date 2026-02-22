/**
 * Execution record persistence to DynamoDB
 * Validates: Requirements 4.1, 4.3, 4.5
 */

import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient } from './aws-clients';
import { AgentExecutionRecord, DataPersistenceError } from './types';
import { createLogger } from './logger';
import { getTableName } from './dynamodb-schema';

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 100;

/**
 * Persist execution record to DynamoDB with retry logic
 */
export async function persistExecutionRecord(
  record: AgentExecutionRecord
): Promise<void> {
  const logger = createLogger();

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const dynamodb = getDynamoDBClient();
      const tableName = getTableName('executions');

      logger.debug('Persisting execution record', {
        executionId: record.executionId,
        attempt: attempt + 1,
      });

      await dynamodb.send(
        new PutCommand({
          TableName: tableName,
          Item: record,
        })
      );

      logger.info('Execution record persisted successfully', {
        executionId: record.executionId,
      });
      return;
    } catch (error) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt);

      if (attempt === MAX_RETRIES - 1) {
        logger.error(
          'Failed to persist execution record after retries',
          error as Error,
          {
            executionId: record.executionId,
            attempts: MAX_RETRIES,
          }
        );
        throw new DataPersistenceError(
          `Failed to persist execution record: ${(error as Error).message}`
        );
      }

      logger.warn('Retrying execution record persistence', {
        executionId: record.executionId,
        attempt: attempt + 1,
        nextRetryDelayMs: delay,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

/**
 * Batch persist multiple execution records
 */
export async function batchPersistExecutionRecords(
  records: AgentExecutionRecord[]
): Promise<void> {
  const logger = createLogger();

  logger.info('Batch persisting execution records', { count: records.length });

  const promises = records.map((record) => persistExecutionRecord(record));
  const results = await Promise.allSettled(promises);

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    logger.error('Some execution records failed to persist', new Error(), {
      total: records.length,
      failed: failures.length,
    });
  }

  logger.info('Batch persistence completed', {
    total: records.length,
    succeeded: records.length - failures.length,
    failed: failures.length,
  });
}
