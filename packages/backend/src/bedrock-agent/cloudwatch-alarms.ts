/**
 * CloudWatch Alarms Configuration
 * Defines and manages CloudWatch alarms for monitoring system health
 * Validates: Requirements 6.5
 */

import {
  PutMetricAlarmCommand,
  CloudWatchClient,
  ComparisonOperator,
  Statistic,
} from '@aws-sdk/client-cloudwatch';
import { getCloudWatchClient } from './aws-clients';
import { StructuredLogger } from './logger';

const logger = new StructuredLogger();

export interface AlarmConfig {
  alarmName: string;
  metricName: string;
  namespace: string;
  statistic: Statistic;
  period: number; // seconds
  evaluationPeriods: number;
  threshold: number;
  comparisonOperator: ComparisonOperator;
  alarmDescription: string;
  treatMissingData?: 'missing' | 'notBreaching' | 'breaching' | 'insufficient_data';
  dimensions?: Array<{
    name: string;
    value: string;
  }>;
}

/**
 * Creates or updates a CloudWatch alarm
 */
export async function createOrUpdateAlarm(config: AlarmConfig): Promise<void> {
  try {
    const client = getCloudWatchClient();
    const namespace = process.env.CLOUDWATCH_NAMESPACE || 'BedrockAgentMigration';

    const command = new PutMetricAlarmCommand({
      AlarmName: config.alarmName,
      MetricName: config.metricName,
      Namespace: namespace,
      Statistic: config.statistic,
      Period: config.period,
      EvaluationPeriods: config.evaluationPeriods,
      Threshold: config.threshold,
      ComparisonOperator: config.comparisonOperator,
      AlarmDescription: config.alarmDescription,
      TreatMissingData: config.treatMissingData || 'notBreaching',
      Dimensions: config.dimensions?.map((dim) => ({
        Name: dim.name,
        Value: dim.value,
      })),
    });

    await client.send(command);
    logger.info(`Created/updated alarm: ${config.alarmName}`);
  } catch (error) {
    logger.error('Failed to create/update alarm', error instanceof Error ? error : new Error(String(error)), {
      alarmName: config.alarmName,
    });
    throw error;
  }
}

/**
 * Creates all default alarms for the system
 */
export async function createDefaultAlarms(): Promise<void> {
  const namespace = process.env.CLOUDWATCH_NAMESPACE || 'BedrockAgentMigration';
  const snsTopicArn = process.env.ALARM_SNS_TOPIC_ARN;

  const alarms: AlarmConfig[] = [
    {
      alarmName: 'AgentExecutionFailureRate',
      metricName: 'AgentExecutionFailure',
      namespace,
      statistic: 'Sum',
      period: 300, // 5 minutes
      evaluationPeriods: 1,
      threshold: 5, // More than 5 failures in 5 minutes
      comparisonOperator: 'GreaterThanThreshold',
      alarmDescription: 'Alert when agent execution failure rate exceeds 5%',
      treatMissingData: 'notBreaching',
    },
    {
      alarmName: 'ToolInvocationErrorRate',
      metricName: 'ToolInvocationError',
      namespace,
      statistic: 'Sum',
      period: 300, // 5 minutes
      evaluationPeriods: 1,
      threshold: 10, // More than 10 errors in 5 minutes
      comparisonOperator: 'GreaterThanThreshold',
      alarmDescription: 'Alert when tool invocation error rate exceeds 10%',
      treatMissingData: 'notBreaching',
    },
    {
      alarmName: 'LambdaDurationHigh',
      metricName: 'LambdaDuration',
      namespace,
      statistic: 'Average',
      period: 300, // 5 minutes
      evaluationPeriods: 2,
      threshold: 30000, // 30 seconds in milliseconds
      comparisonOperator: 'GreaterThanThreshold',
      alarmDescription: 'Alert when Lambda duration exceeds 30 seconds',
      treatMissingData: 'notBreaching',
    },
    {
      alarmName: 'DynamoDBThrottling',
      metricName: 'DynamoDBLatency',
      namespace,
      statistic: 'Average',
      period: 60, // 1 minute
      evaluationPeriods: 2,
      threshold: 5000, // 5 seconds in milliseconds
      comparisonOperator: 'GreaterThanThreshold',
      alarmDescription: 'Alert when DynamoDB latency indicates throttling',
      treatMissingData: 'notBreaching',
    },
    {
      alarmName: 'BedrockRateLimiting',
      metricName: 'BedrockLatency',
      namespace,
      statistic: 'Average',
      period: 60, // 1 minute
      evaluationPeriods: 2,
      threshold: 10000, // 10 seconds in milliseconds
      comparisonOperator: 'GreaterThanThreshold',
      alarmDescription: 'Alert when Bedrock latency indicates rate limiting',
      treatMissingData: 'notBreaching',
    },
  ];

  for (const alarm of alarms) {
    try {
      await createOrUpdateAlarm(alarm);
    } catch (error) {
      logger.error(`Failed to create alarm: ${alarm.alarmName}`, error instanceof Error ? error : new Error(String(error)));
      // Continue creating other alarms even if one fails
    }
  }

  logger.info(`Created ${alarms.length} default alarms`);
}

/**
 * Gets alarm configuration for execution failure rate
 */
export function getExecutionFailureRateAlarmConfig(): AlarmConfig {
  return {
    alarmName: 'AgentExecutionFailureRate',
    metricName: 'AgentExecutionFailure',
    namespace: process.env.CLOUDWATCH_NAMESPACE || 'BedrockAgentMigration',
    statistic: 'Sum',
    period: 300,
    evaluationPeriods: 1,
    threshold: 5,
    comparisonOperator: 'GreaterThanThreshold',
    alarmDescription: 'Alert when agent execution failure rate exceeds 5%',
  };
}

/**
 * Gets alarm configuration for tool error rate
 */
export function getToolErrorRateAlarmConfig(): AlarmConfig {
  return {
    alarmName: 'ToolInvocationErrorRate',
    metricName: 'ToolInvocationError',
    namespace: process.env.CLOUDWATCH_NAMESPACE || 'BedrockAgentMigration',
    statistic: 'Sum',
    period: 300,
    evaluationPeriods: 1,
    threshold: 10,
    comparisonOperator: 'GreaterThanThreshold',
    alarmDescription: 'Alert when tool invocation error rate exceeds 10%',
  };
}

/**
 * Gets alarm configuration for Lambda duration
 */
export function getLambdaDurationAlarmConfig(): AlarmConfig {
  return {
    alarmName: 'LambdaDurationHigh',
    metricName: 'LambdaDuration',
    namespace: process.env.CLOUDWATCH_NAMESPACE || 'BedrockAgentMigration',
    statistic: 'Average',
    period: 300,
    evaluationPeriods: 2,
    threshold: 30000,
    comparisonOperator: 'GreaterThanThreshold',
    alarmDescription: 'Alert when Lambda duration exceeds 30 seconds',
  };
}

/**
 * Gets alarm configuration for DynamoDB throttling
 */
export function getDynamoDBThrottlingAlarmConfig(): AlarmConfig {
  return {
    alarmName: 'DynamoDBThrottling',
    metricName: 'DynamoDBLatency',
    namespace: process.env.CLOUDWATCH_NAMESPACE || 'BedrockAgentMigration',
    statistic: 'Average',
    period: 60,
    evaluationPeriods: 2,
    threshold: 5000,
    comparisonOperator: 'GreaterThanThreshold',
    alarmDescription: 'Alert when DynamoDB latency indicates throttling',
  };
}

/**
 * Gets alarm configuration for Bedrock rate limiting
 */
export function getBedrockRateLimitingAlarmConfig(): AlarmConfig {
  return {
    alarmName: 'BedrockRateLimiting',
    metricName: 'BedrockLatency',
    namespace: process.env.CLOUDWATCH_NAMESPACE || 'BedrockAgentMigration',
    statistic: 'Average',
    period: 60,
    evaluationPeriods: 2,
    threshold: 10000,
    comparisonOperator: 'GreaterThanThreshold',
    alarmDescription: 'Alert when Bedrock latency indicates rate limiting',
  };
}
