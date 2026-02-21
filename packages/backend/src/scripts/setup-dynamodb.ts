import {
  CreateTableCommand,
  DescribeTableCommand,
  UpdateContinuousBackupsCommand,
  UpdateTimeToLiveCommand,
} from '@aws-sdk/client-dynamodb';
import { dynamoDBClient } from '../config/dynamodb';
import { config } from '../config/env';

async function setupDynamoDB() {
  const tableName = config.dynamodb.tableName;

  try {
    // Check if table exists
    try {
      await dynamoDBClient.send(new DescribeTableCommand({ TableName: tableName }));
      console.log(`Table ${tableName} already exists`);
      return;
    } catch (error: any) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
    }

    // Create table
    console.log(`Creating table ${tableName}...`);
    await dynamoDBClient.send(
      new CreateTableCommand({
        TableName: tableName,
        KeySchema: [
          { AttributeName: 'PK', KeyType: 'HASH' },
          { AttributeName: 'SK', KeyType: 'RANGE' },
        ],
        AttributeDefinitions: [
          { AttributeName: 'PK', AttributeType: 'S' },
          { AttributeName: 'SK', AttributeType: 'S' },
          { AttributeName: 'GSI1PK', AttributeType: 'S' },
          { AttributeName: 'GSI1SK', AttributeType: 'S' },
          { AttributeName: 'GSI2PK', AttributeType: 'S' },
          { AttributeName: 'GSI2SK', AttributeType: 'S' },
        ],
        GlobalSecondaryIndexes: [
          {
            IndexName: 'GSI1',
            KeySchema: [
              { AttributeName: 'GSI1PK', KeyType: 'HASH' },
              { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          },
          {
            IndexName: 'GSI2',
            KeySchema: [
              { AttributeName: 'GSI2PK', KeyType: 'HASH' },
              { AttributeName: 'GSI2SK', KeyType: 'RANGE' },
            ],
            Projection: { ProjectionType: 'ALL' },
            ProvisionedThroughput: {
              ReadCapacityUnits: 5,
              WriteCapacityUnits: 5,
            },
          },
        ],
        BillingMode: 'PROVISIONED',
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
        SSESpecification: {
          Enabled: true,
        },
      })
    );

    console.log('Waiting for table to be active...');
    await waitForTableActive(tableName);

    // Enable Point-in-Time Recovery
    console.log('Enabling Point-in-Time Recovery...');
    await dynamoDBClient.send(
      new UpdateContinuousBackupsCommand({
        TableName: tableName,
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: true,
        },
      })
    );

    // Enable TTL
    console.log('Enabling TTL...');
    await dynamoDBClient.send(
      new UpdateTimeToLiveCommand({
        TableName: tableName,
        TimeToLiveSpecification: {
          Enabled: true,
          AttributeName: 'TTL',
        },
      })
    );

    console.log(`Table ${tableName} created successfully with PITR and TTL enabled`);
  } catch (error) {
    console.error('Error setting up DynamoDB:', error);
    throw error;
  }
}

async function waitForTableActive(tableName: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await dynamoDBClient.send(
      new DescribeTableCommand({ TableName: tableName })
    );
    if (response.Table?.TableStatus === 'ACTIVE') {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Table ${tableName} did not become active in time`);
}

if (require.main === module) {
  setupDynamoDB()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { setupDynamoDB };
