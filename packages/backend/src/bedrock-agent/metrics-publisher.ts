/**
 * CloudWatch Metrics Publisher
 * Publishes custom metrics for agent execution, tool invocation, and system performance
 * Validates: Requirements 6.5
 */

import { PutMetricDataCommand, CloudWatchClient } from '@aws-sdk/client-cloudwatch';
import { getCloudWatchClient } from './aws-clients';
import { StructuredLogger } from './logger';

const logger = new StructuredLogger();

export interface MetricData {
  metricName: string;
  value: number;
  unit: 'Count' | 'Milliseconds' | 'Seconds' | 'Percent' | 'None';
  timestamp?: Date;
  dimensions?: Record<string, string>;
}

export interface AgentExecutionMetrics {
  agentId: string;
  agentType: string;
  duration: number;
  success: boolean;
  toolCount?: number;
  error?: string;
}

export interface ToolInvocationMetrics {
  toolName: string;
  duration: number;
  success: boolean;
  error?: string;
}

export interface BedrockLatencyMetrics {
  duration: number;
  modelUsed: string;
  success: boolean;
}

export interface DynamoDBLatencyMetrics {
  operation: 'GetItem' | 'PutItem' | 'UpdateItem' | 'Query';
  duration: number;
  success: boolean;
  tableName: string;
}

/**
 * Publishes a single metric to CloudWatch
 */
export async function publishMetric(metric: MetricData): Promise<void> {
  try {
    const client = getCloudWatchClient();
    const namespace = process.env.CLOUDWATCH_NAMESPACE || 'BedrockAgentMigration';

    const command = new PutMetricDataCommand({
      Namespace: namespace,
      MetricData: [
        {
          MetricName: metric.metricName,
          Value: metric.value,
          Unit: metric.unit,
          Timestamp: metric.timestamp || new Date(),
          Dimensions: metric.dimensions
            ? Object.entries(metric.dimensions).map(([name, value]) => ({
                Name: name,
                Value: value,
              }))
            : undefined,
        },
      ],
    });

    await client.send(command);
    logger.info(`Published metric: ${metric.metricName}`, { metric });
  } catch (error) {
    logger.error('Failed to publish metric', error instanceof Error ? error : new Error(String(error)), {
      metric: metric.metricName,
    });
    // Don't throw - metrics publishing should not block execution
  }
}

/**
 * Publishes multiple metrics in a batch
 */
export async function publishMetrics(metrics: MetricData[]): Promise<void> {
  try {
    const client = getCloudWatchClient();
    const namespace = process.env.CLOUDWATCH_NAMESPACE || 'BedrockAgentMigration';

    // CloudWatch allows max 20 metrics per request
    const batches = [];
    for (let i = 0; i < metrics.length; i += 20) {
      batches.push(metrics.slice(i, i + 20));
    }

    for (const batch of batches) {
      const command = new PutMetricDataCommand({
        Namespace: namespace,
        MetricData: batch.map((metric) => ({
          MetricName: metric.metricName,
          Value: metric.value,
          Unit: metric.unit,
          Timestamp: metric.timestamp || new Date(),
          Dimensions: metric.dimensions
            ? Object.entries(metric.dimensions).map(([name, value]) => ({
                Name: name,
                Value: value,
              }))
            : undefined,
        })),
      });

      await client.send(command);
    }

    logger.info(`Published ${metrics.length} metrics to CloudWatch`);
  } catch (error) {
    logger.error('Failed to publish metrics batch', error instanceof Error ? error : new Error(String(error)), {
      count: metrics.length,
    });
    // Don't throw - metrics publishing should not block execution
  }
}

/**
 * Publishes agent execution metrics
 */
export async function publishAgentExecutionMetrics(
  metrics: AgentExecutionMetrics
): Promise<void> {
  const metricsList: MetricData[] = [
    {
      metricName: 'AgentExecutionDuration',
      value: metrics.duration,
      unit: 'Milliseconds',
      dimensions: {
        AgentId: metrics.agentId,
        AgentType: metrics.agentType,
        Status: metrics.success ? 'Success' : 'Failure',
      },
    },
    {
      metricName: metrics.success ? 'AgentExecutionSuccess' : 'AgentExecutionFailure',
      value: 1,
      unit: 'Count',
      dimensions: {
        AgentId: metrics.agentId,
        AgentType: metrics.agentType,
      },
    },
  ];

  if (metrics.toolCount !== undefined) {
    metricsList.push({
      metricName: 'AgentToolInvocationCount',
      value: metrics.toolCount,
      unit: 'Count',
      dimensions: {
        AgentId: metrics.agentId,
        AgentType: metrics.agentType,
      },
    });
  }

  await publishMetrics(metricsList);
}

/**
 * Publishes tool invocation metrics
 */
export async function publishToolInvocationMetrics(
  metrics: ToolInvocationMetrics
): Promise<void> {
  const metricsList: MetricData[] = [
    {
      metricName: 'ToolInvocationDuration',
      value: metrics.duration,
      unit: 'Milliseconds',
      dimensions: {
        ToolName: metrics.toolName,
        Status: metrics.success ? 'Success' : 'Failure',
      },
    },
    {
      metricName: metrics.success ? 'ToolInvocationSuccess' : 'ToolInvocationError',
      value: 1,
      unit: 'Count',
      dimensions: {
        ToolName: metrics.toolName,
      },
    },
  ];

  await publishMetrics(metricsList);
}

/**
 * Publishes Bedrock latency metrics
 */
export async function publishBedrockLatencyMetrics(
  metrics: BedrockLatencyMetrics
): Promise<void> {
  const metricsList: MetricData[] = [
    {
      metricName: 'BedrockLatency',
      value: metrics.duration,
      unit: 'Milliseconds',
      dimensions: {
        Model: metrics.modelUsed,
        Status: metrics.success ? 'Success' : 'Failure',
      },
    },
  ];

  await publishMetrics(metricsList);
}

/**
 * Publishes DynamoDB latency metrics
 */
export async function publishDynamoDBLatencyMetrics(
  metrics: DynamoDBLatencyMetrics
): Promise<void> {
  const metricsList: MetricData[] = [
    {
      metricName: 'DynamoDBLatency',
      value: metrics.duration,
      unit: 'Milliseconds',
      dimensions: {
        Operation: metrics.operation,
        TableName: metrics.tableName,
        Status: metrics.success ? 'Success' : 'Failure',
      },
    },
  ];

  await publishMetrics(metricsList);
}

/**
 * Publishes Lambda duration metric
 */
export async function publishLambdaDurationMetric(
  duration: number,
  functionName: string,
  success: boolean
): Promise<void> {
  await publishMetric({
    metricName: 'LambdaDuration',
    value: duration,
    unit: 'Milliseconds',
    dimensions: {
      FunctionName: functionName,
      Status: success ? 'Success' : 'Failure',
    },
  });
}

/**
 * Publishes error rate metric
 */
export async function publishErrorRateMetric(
  errorRate: number,
  metricType: 'AgentExecution' | 'ToolInvocation' | 'DynamoDB' | 'Bedrock'
): Promise<void> {
  await publishMetric({
    metricName: `${metricType}ErrorRate`,
    value: errorRate,
    unit: 'Percent',
    dimensions: {
      MetricType: metricType,
    },
  });
}
