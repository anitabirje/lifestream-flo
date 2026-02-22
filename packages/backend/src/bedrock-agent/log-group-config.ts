/**
 * CloudWatch Log Group Configuration
 * Manages log group creation and configuration
 * Validates: Requirements 6.6
 */

import {
  CreateLogGroupCommand,
  PutRetentionPolicyCommand,
  CloudWatchLogsClient,
} from '@aws-sdk/client-logs';
import { StructuredLogger } from './logger';

const logger = new StructuredLogger();

export interface LogGroupConfig {
  logGroupName: string;
  retentionInDays: number;
}

/**
 * Creates a CloudWatch log group if it doesn't exist
 */
export async function createLogGroup(logGroupName: string): Promise<void> {
  try {
    const client = new CloudWatchLogsClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    try {
      const command = new CreateLogGroupCommand({
        logGroupName,
      });
      await client.send(command);
      logger.info(`Created log group: ${logGroupName}`);
    } catch (error: any) {
      // Log group already exists
      if (error.name === 'ResourceAlreadyExistsException') {
        logger.info(`Log group already exists: ${logGroupName}`);
      } else {
        throw error;
      }
    }

    await client.destroy();
  } catch (error) {
    logger.error('Failed to create log group', {
      error: error instanceof Error ? error.message : String(error),
      logGroupName,
    });
    throw error;
  }
}

/**
 * Sets retention policy for a log group
 */
export async function setLogGroupRetention(
  logGroupName: string,
  retentionInDays: number
): Promise<void> {
  try {
    const client = new CloudWatchLogsClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    const command = new PutRetentionPolicyCommand({
      logGroupName,
      retentionInDays,
    });

    await client.send(command);
    logger.info(`Set retention policy for log group: ${logGroupName}`, {
      retentionInDays,
    });

    await client.destroy();
  } catch (error) {
    logger.error('Failed to set log group retention', {
      error: error instanceof Error ? error.message : String(error),
      logGroupName,
      retentionInDays,
    });
    throw error;
  }
}

/**
 * Creates and configures a log group with retention policy
 */
export async function createAndConfigureLogGroup(
  config: LogGroupConfig
): Promise<void> {
  await createLogGroup(config.logGroupName);
  await setLogGroupRetention(config.logGroupName, config.retentionInDays);
}

/**
 * Gets default log group configurations
 */
export function getDefaultLogGroupConfigs(): LogGroupConfig[] {
  return [
    {
      logGroupName: '/aws/lambda/agent-executor',
      retentionInDays: 30,
    },
    {
      logGroupName: '/aws/lambda/agent-tool-calendar',
      retentionInDays: 30,
    },
    {
      logGroupName: '/aws/lambda/agent-tool-weather',
      retentionInDays: 30,
    },
    {
      logGroupName: '/aws/lambda/agent-tool-classifier',
      retentionInDays: 30,
    },
    {
      logGroupName: '/aws/lambda/agent-tool-parser',
      retentionInDays: 30,
    },
    {
      logGroupName: '/aws/lambda/agent-tool-newsletter-parser',
      retentionInDays: 30,
    },
    {
      logGroupName: '/aws/bedrock/agents',
      retentionInDays: 30,
    },
  ];
}

/**
 * Creates all default log groups
 */
export async function createDefaultLogGroups(): Promise<void> {
  const configs = getDefaultLogGroupConfigs();

  for (const config of configs) {
    try {
      await createAndConfigureLogGroup(config);
    } catch (error) {
      logger.error(`Failed to create log group: ${config.logGroupName}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue creating other log groups even if one fails
    }
  }

  logger.info(`Created ${configs.length} log groups with retention policies`);
}
