/**
 * DynamoDB table schemas and initialization
 * Validates: Requirements 4.1, 4.3
 */

import { CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { getDynamoDBClient } from './aws-clients';
import { createLogger } from './logger';

const logger = createLogger();

/**
 * Schema for agent-executions table
 */
export const AGENT_EXECUTIONS_TABLE_SCHEMA = {
  TableName: 'agent-executions',
  KeySchema: [
    { AttributeName: 'executionId', KeyType: 'HASH' }, // Partition key
    { AttributeName: 'agentId', KeyType: 'RANGE' }, // Sort key
  ],
  AttributeDefinitions: [
    { AttributeName: 'executionId', AttributeType: 'S' },
    { AttributeName: 'agentId', AttributeType: 'S' },
    { AttributeName: 'startTime', AttributeType: 'N' },
  ],
  BillingMode: 'PAY_PER_REQUEST',
  GlobalSecondaryIndexes: [
    {
      IndexName: 'agentId-startTime-index',
      KeySchema: [
        { AttributeName: 'agentId', KeyType: 'HASH' },
        { AttributeName: 'startTime', KeyType: 'RANGE' },
      ],
      Projection: { ProjectionType: 'ALL' },
    },
  ],
  TimeToLiveSpecification: {
    AttributeName: 'ttl',
    Enabled: true,
  },
};

/**
 * Schema for agent-configurations table
 */
export const AGENT_CONFIGURATIONS_TABLE_SCHEMA = {
  TableName: 'agent-configurations',
  KeySchema: [{ AttributeName: 'agentId', KeyType: 'HASH' }], // Partition key
  AttributeDefinitions: [{ AttributeName: 'agentId', AttributeType: 'S' }],
  BillingMode: 'PAY_PER_REQUEST',
};

/**
 * Schema for tool-cache table (optional)
 */
export const TOOL_CACHE_TABLE_SCHEMA = {
  TableName: 'tool-cache',
  KeySchema: [{ AttributeName: 'cacheKey', KeyType: 'HASH' }], // Partition key
  AttributeDefinitions: [{ AttributeName: 'cacheKey', AttributeType: 'S' }],
  BillingMode: 'PAY_PER_REQUEST',
  TimeToLiveSpecification: {
    AttributeName: 'ttl',
    Enabled: true,
  },
};

/**
 * Initialize DynamoDB tables
 */
export async function initializeDynamoDBTables(): Promise<void> {
  const dynamodb = getDynamoDBClient();

  const tables = [
    AGENT_EXECUTIONS_TABLE_SCHEMA,
    AGENT_CONFIGURATIONS_TABLE_SCHEMA,
    TOOL_CACHE_TABLE_SCHEMA,
  ];

  for (const tableSchema of tables) {
    try {
      // Check if table exists
      try {
        await dynamodb.send(
          new DescribeTableCommand({ TableName: tableSchema.TableName })
        );
        logger.info('Table already exists', { table: tableSchema.TableName });
        continue;
      } catch (error: any) {
        if (error.name !== 'ResourceNotFoundException') {
          throw error;
        }
      }

      // Create table
      logger.info('Creating DynamoDB table', { table: tableSchema.TableName });
      await dynamodb.send(new CreateTableCommand(tableSchema as any));
      logger.info('Table created successfully', { table: tableSchema.TableName });
    } catch (error) {
      logger.error(
        'Failed to initialize DynamoDB table',
        error as Error,
        { table: tableSchema.TableName }
      );
      throw error;
    }
  }
}

/**
 * Get table name from environment or use default
 */
export function getTableName(tableType: 'executions' | 'configurations' | 'cache'): string {
  switch (tableType) {
    case 'executions':
      return process.env.AGENT_EXECUTION_TABLE || 'agent-executions';
    case 'configurations':
      return process.env.AGENT_CONFIG_TABLE || 'agent-configurations';
    case 'cache':
      return process.env.TOOL_CACHE_TABLE || 'tool-cache';
    default:
      throw new Error(`Unknown table type: ${tableType}`);
  }
}
