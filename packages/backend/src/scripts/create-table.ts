/**
 * Script to create the FamilyCalendar DynamoDB table with all required configurations
 * 
 * This script creates:
 * - Main table with PK and SK
 * - GSI1 for date range queries
 * - GSI2 for status/type queries
 * - Point-in-Time Recovery (PITR)
 * - Encryption at rest
 * - TTL configuration
 * - DynamoDB Streams for audit logging
 */

import {
  CreateTableCommand,
  UpdateContinuousBackupsCommand,
  UpdateTimeToLiveCommand,
  DescribeTableCommand,
} from '@aws-sdk/client-dynamodb';
import { dynamoDBClient } from '../config/dynamodb';
import { TABLE_CONFIG } from '../config/schema';

async function createTable() {
  console.log('Creating FamilyCalendar DynamoDB table...');
  
  try {
    // Create table with GSIs
    const createTableCommand = new CreateTableCommand({
      TableName: TABLE_CONFIG.tableName,
      BillingMode: TABLE_CONFIG.billingMode,
      
      // Primary key definition
      KeySchema: [
        {
          AttributeName: TABLE_CONFIG.partitionKey,
          KeyType: 'HASH', // Partition key
        },
        {
          AttributeName: TABLE_CONFIG.sortKey,
          KeyType: 'RANGE', // Sort key
        },
      ],
      
      // Attribute definitions (only for keys used in table or indexes)
      AttributeDefinitions: [
        {
          AttributeName: TABLE_CONFIG.partitionKey,
          AttributeType: 'S', // String
        },
        {
          AttributeName: TABLE_CONFIG.sortKey,
          AttributeType: 'S',
        },
        {
          AttributeName: TABLE_CONFIG.gsi1.partitionKey,
          AttributeType: 'S',
        },
        {
          AttributeName: TABLE_CONFIG.gsi1.sortKey,
          AttributeType: 'S',
        },
        {
          AttributeName: TABLE_CONFIG.gsi2.partitionKey,
          AttributeType: 'S',
        },
        {
          AttributeName: TABLE_CONFIG.gsi2.sortKey,
          AttributeType: 'S',
        },
      ],
      
      // Global Secondary Indexes
      GlobalSecondaryIndexes: [
        {
          IndexName: TABLE_CONFIG.gsi1.name,
          KeySchema: [
            {
              AttributeName: TABLE_CONFIG.gsi1.partitionKey,
              KeyType: 'HASH',
            },
            {
              AttributeName: TABLE_CONFIG.gsi1.sortKey,
              KeyType: 'RANGE',
            },
          ],
          Projection: {
            ProjectionType: 'ALL', // Include all attributes
          },
        },
        {
          IndexName: TABLE_CONFIG.gsi2.name,
          KeySchema: [
            {
              AttributeName: TABLE_CONFIG.gsi2.partitionKey,
              KeyType: 'HASH',
            },
            {
              AttributeName: TABLE_CONFIG.gsi2.sortKey,
              KeyType: 'RANGE',
            },
          ],
          Projection: {
            ProjectionType: 'ALL',
          },
        },
      ],
      
      // Enable DynamoDB Streams for audit logging
      StreamSpecification: {
        StreamEnabled: TABLE_CONFIG.streamEnabled,
        StreamViewType: TABLE_CONFIG.streamViewType,
      },
      
      // Enable encryption at rest (AWS managed key)
      SSESpecification: {
        Enabled: true,
        SSEType: 'KMS', // Use AWS KMS for encryption
      },
      
      Tags: [
        {
          Key: 'Application',
          Value: 'Flo-Family-Calendar',
        },
        {
          Key: 'Environment',
          Value: process.env.NODE_ENV || 'development',
        },
      ],
    });
    
    const createResult = await dynamoDBClient.send(createTableCommand);
    console.log('✓ Table created successfully');
    console.log(`  Table ARN: ${createResult.TableDescription?.TableArn}`);
    console.log(`  Stream ARN: ${createResult.TableDescription?.LatestStreamArn}`);
    
    // Wait for table to become active
    console.log('\nWaiting for table to become active...');
    await waitForTableActive();
    console.log('✓ Table is now active');
    
    // Enable Point-in-Time Recovery (PITR)
    console.log('\nEnabling Point-in-Time Recovery...');
    const pitrCommand = new UpdateContinuousBackupsCommand({
      TableName: TABLE_CONFIG.tableName,
      PointInTimeRecoverySpecification: {
        PointInTimeRecoveryEnabled: true,
      },
    });
    
    await dynamoDBClient.send(pitrCommand);
    console.log('✓ Point-in-Time Recovery enabled');
    
    // Enable TTL
    console.log('\nEnabling Time To Live (TTL)...');
    const ttlCommand = new UpdateTimeToLiveCommand({
      TableName: TABLE_CONFIG.tableName,
      TimeToLiveSpecification: {
        Enabled: true,
        AttributeName: TABLE_CONFIG.ttlAttribute,
      },
    });
    
    await dynamoDBClient.send(ttlCommand);
    console.log('✓ TTL enabled on attribute:', TABLE_CONFIG.ttlAttribute);
    
    console.log('\n✅ Table setup complete!');
    console.log('\nTable configuration:');
    console.log(`  - Name: ${TABLE_CONFIG.tableName}`);
    console.log(`  - Billing: ${TABLE_CONFIG.billingMode}`);
    console.log(`  - Primary Key: ${TABLE_CONFIG.partitionKey}, ${TABLE_CONFIG.sortKey}`);
    console.log(`  - GSI1: ${TABLE_CONFIG.gsi1.name} (${TABLE_CONFIG.gsi1.partitionKey}, ${TABLE_CONFIG.gsi1.sortKey})`);
    console.log(`  - GSI2: ${TABLE_CONFIG.gsi2.name} (${TABLE_CONFIG.gsi2.partitionKey}, ${TABLE_CONFIG.gsi2.sortKey})`);
    console.log(`  - Streams: Enabled (${TABLE_CONFIG.streamViewType})`);
    console.log(`  - PITR: Enabled`);
    console.log(`  - Encryption: Enabled (KMS)`);
    console.log(`  - TTL: Enabled (${TABLE_CONFIG.ttlAttribute})`);
    
  } catch (error: any) {
    if (error.name === 'ResourceInUseException') {
      console.log('⚠️  Table already exists');
      console.log('Verifying table configuration...');
      await verifyTableConfiguration();
    } else {
      console.error('❌ Error creating table:', error);
      throw error;
    }
  }
}

async function waitForTableActive(maxAttempts = 30, delayMs = 2000): Promise<void> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const describeCommand = new DescribeTableCommand({
      TableName: TABLE_CONFIG.tableName,
    });
    
    const result = await dynamoDBClient.send(describeCommand);
    const status = result.Table?.TableStatus;
    
    if (status === 'ACTIVE') {
      return;
    }
    
    console.log(`  Attempt ${attempt}/${maxAttempts}: Table status is ${status}`);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  
  throw new Error('Table did not become active within expected time');
}

async function verifyTableConfiguration(): Promise<void> {
  const describeCommand = new DescribeTableCommand({
    TableName: TABLE_CONFIG.tableName,
  });
  
  const result = await dynamoDBClient.send(describeCommand);
  const table = result.Table;
  
  if (!table) {
    throw new Error('Table not found');
  }
  
  console.log('\nCurrent table configuration:');
  console.log(`  - Status: ${table.TableStatus}`);
  console.log(`  - Item count: ${table.ItemCount}`);
  console.log(`  - Size: ${table.TableSizeBytes} bytes`);
  console.log(`  - GSIs: ${table.GlobalSecondaryIndexes?.length || 0}`);
  console.log(`  - Streams: ${table.StreamSpecification?.StreamEnabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  - Encryption: ${table.SSEDescription?.Status || 'Unknown'}`);
  
  // Check if all required GSIs exist
  const gsiNames = table.GlobalSecondaryIndexes?.map(gsi => gsi.IndexName) || [];
  const requiredGSIs = [TABLE_CONFIG.gsi1.name, TABLE_CONFIG.gsi2.name];
  const missingGSIs = requiredGSIs.filter(name => !gsiNames.includes(name));
  
  if (missingGSIs.length > 0) {
    console.warn(`  ⚠️  Missing GSIs: ${missingGSIs.join(', ')}`);
  } else {
    console.log('  ✓ All required GSIs present');
  }
}

// Run the script
if (require.main === module) {
  createTable()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

export { createTable };
