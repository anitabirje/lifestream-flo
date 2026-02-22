/**
 * AWS SDK client initialization module
 * Validates: Requirements 5.2
 */

import { BedrockAgentRuntimeClient } from '@aws-sdk/client-bedrock-agent-runtime';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';
import { CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { ConfigurationError } from './types';

/**
 * Singleton AWS clients
 */
let bedrockClient: BedrockAgentRuntimeClient | null = null;
let dynamodbClient: DynamoDBClient | null = null;
let snsClient: SNSClient | null = null;
let cloudwatchClient: CloudWatchClient | null = null;

/**
 * Get or create Bedrock Agent Runtime client
 */
export function getBedrockClient(): BedrockAgentRuntimeClient {
  if (!bedrockClient) {
    const region = process.env.AWS_REGION || 'us-east-1';
    bedrockClient = new BedrockAgentRuntimeClient({ region });
  }
  return bedrockClient;
}

/**
 * Get or create DynamoDB client
 */
export function getDynamoDBClient(): DynamoDBClient {
  if (!dynamodbClient) {
    const region = process.env.AWS_REGION || 'us-east-1';
    const endpoint = process.env.DYNAMODB_ENDPOINT;
    
    const config: any = { region };
    if (endpoint) {
      config.endpoint = endpoint;
    }
    
    dynamodbClient = new DynamoDBClient(config);
  }
  return dynamodbClient;
}

/**
 * Get or create SNS client
 */
export function getSNSClient(): SNSClient {
  if (!snsClient) {
    const region = process.env.AWS_REGION || 'us-east-1';
    snsClient = new SNSClient({ region });
  }
  return snsClient;
}

/**
 * Get or create CloudWatch client
 */
export function getCloudWatchClient(): CloudWatchClient {
  if (!cloudwatchClient) {
    const region = process.env.AWS_REGION || 'us-east-1';
    cloudwatchClient = new CloudWatchClient({ region });
  }
  return cloudwatchClient;
}

/**
 * Validate AWS configuration
 */
export function validateAWSConfiguration(): void {
  const requiredEnvVars = ['AWS_REGION'];
  const missingVars = requiredEnvVars.filter(
    (varName) => !process.env[varName]
  );

  if (missingVars.length > 0) {
    throw new ConfigurationError(
      `Missing required AWS configuration: ${missingVars.join(', ')}`
    );
  }
}

/**
 * Close all AWS clients
 */
export async function closeAWSClients(): Promise<void> {
  if (bedrockClient) {
    await bedrockClient.destroy();
    bedrockClient = null;
  }
  if (dynamodbClient) {
    await dynamodbClient.destroy();
    dynamodbClient = null;
  }
  if (snsClient) {
    await snsClient.destroy();
    snsClient = null;
  }
  if (cloudwatchClient) {
    await cloudwatchClient.destroy();
    cloudwatchClient = null;
  }
}
