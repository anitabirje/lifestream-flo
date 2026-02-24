/**
 * Execution record retrieval from DynamoDB
 * Validates: Requirements 4.2
 */

import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient } from './aws-clients';
import { AgentExecutionRecord } from './types';
import { createLogger } from './logger';
import { getTableName } from './dynamodb-schema';

/**
 * Retrieve execution record by executionId
 */
export async function getExecutionRecord(
  executionId: string
): Promise<AgentExecutionRecord | null> {
  const logger = createLogger();

  try {
    const dynamodb = getDynamoDBClient();
    const tableName = getTableName('executions');

    logger.debug('Retrieving execution record', { executionId });

    // Note: We need agentId to query, so this would need to be adjusted
    // For now, we'll use a scan or GSI query
    const result = await dynamodb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'executionId = :executionId',
        ExpressionAttributeValues: {
          ':executionId': executionId,
        },
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      logger.debug('Execution record not found', { executionId });
      return null;
    }

    logger.debug('Execution record retrieved', { executionId });
    return result.Items[0] as AgentExecutionRecord;
  } catch (error) {
    logger.error('Failed to retrieve execution record', error as Error, {
      executionId,
    });
    return null;
  }
}

/**
 * Query executions by agentId with date range
 */
export async function queryExecutionsByAgent(
  agentId: string,
  startTime?: number,
  endTime?: number
): Promise<AgentExecutionRecord[]> {
  const logger = createLogger();

  try {
    const dynamodb = getDynamoDBClient();
    const tableName = getTableName('executions');

    logger.debug('Querying executions by agent', {
      agentId,
      startTime,
      endTime,
    });

    let keyConditionExpression = 'agentId = :agentId';
    const expressionAttributeValues: Record<string, any> = {
      ':agentId': agentId,
    };

    if (startTime !== undefined && endTime !== undefined) {
      keyConditionExpression += ' AND startTime BETWEEN :startTime AND :endTime';
      expressionAttributeValues[':startTime'] = startTime;
      expressionAttributeValues[':endTime'] = endTime;
    } else if (startTime !== undefined) {
      keyConditionExpression += ' AND startTime >= :startTime';
      expressionAttributeValues[':startTime'] = startTime;
    } else if (endTime !== undefined) {
      keyConditionExpression += ' AND startTime <= :endTime';
      expressionAttributeValues[':endTime'] = endTime;
    }

    const result = await dynamodb.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'agentId-startTime-index',
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
      })
    );

    const records = (result.Items || []) as AgentExecutionRecord[];

    logger.debug('Executions retrieved', {
      agentId,
      count: records.length,
    });

    return records;
  } catch (error) {
    logger.error('Failed to query executions by agent', error as Error, {
      agentId,
    });
    return [];
  }
}

/**
 * Query executions by agentId with limit
 */
export async function queryRecentExecutions(
  agentId: string,
  limit: number = 10
): Promise<AgentExecutionRecord[]> {
  const logger = createLogger();

  try {
    const dynamodb = getDynamoDBClient();
    const tableName = getTableName('executions');

    logger.debug('Querying recent executions', { agentId, limit });

    const result = await dynamodb.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'agentId-startTime-index',
        KeyConditionExpression: 'agentId = :agentId',
        ExpressionAttributeValues: {
          ':agentId': agentId,
        },
        ScanIndexForward: false, // Sort by startTime descending
        Limit: limit,
      })
    );

    const records = (result.Items || []) as AgentExecutionRecord[];

    logger.debug('Recent executions retrieved', {
      agentId,
      count: records.length,
    });

    return records;
  } catch (error) {
    logger.error('Failed to query recent executions', error as Error, {
      agentId,
    });
    return [];
  }
}
