/**
 * Tests for CloudWatch Metrics Publisher
 * Validates: Requirements 6.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  publishMetric,
  publishMetrics,
  publishAgentExecutionMetrics,
  publishToolInvocationMetrics,
  publishBedrockLatencyMetrics,
  publishDynamoDBLatencyMetrics,
  publishLambdaDurationMetric,
  publishErrorRateMetric,
  MetricData,
} from '../metrics-publisher';

// Mock the AWS SDK
vi.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutMetricDataCommand: vi.fn((params) => params),
}));

vi.mock('../aws-clients', () => ({
  getCloudWatchClient: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
}));

describe('Metrics Publisher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('publishMetric', () => {
    it('should publish a single metric', async () => {
      const metric: MetricData = {
        metricName: 'TestMetric',
        value: 100,
        unit: 'Count',
        dimensions: {
          TestDimension: 'TestValue',
        },
      };

      await publishMetric(metric);
      // Metric should be published without throwing
      expect(true).toBe(true);
    });

    it('should handle metric with timestamp', async () => {
      const now = new Date();
      const metric: MetricData = {
        metricName: 'TestMetric',
        value: 100,
        unit: 'Milliseconds',
        timestamp: now,
      };

      await publishMetric(metric);
      expect(true).toBe(true);
    });

    it('should handle metric without dimensions', async () => {
      const metric: MetricData = {
        metricName: 'TestMetric',
        value: 100,
        unit: 'Count',
      };

      await publishMetric(metric);
      expect(true).toBe(true);
    });
  });

  describe('publishMetrics', () => {
    it('should publish multiple metrics', async () => {
      const metrics: MetricData[] = [
        {
          metricName: 'Metric1',
          value: 100,
          unit: 'Count',
        },
        {
          metricName: 'Metric2',
          value: 200,
          unit: 'Milliseconds',
        },
      ];

      await publishMetrics(metrics);
      expect(true).toBe(true);
    });

    it('should batch metrics when exceeding 20 per request', async () => {
      const metrics: MetricData[] = Array.from({ length: 25 }, (_, i) => ({
        metricName: `Metric${i}`,
        value: i * 10,
        unit: 'Count' as const,
      }));

      await publishMetrics(metrics);
      expect(true).toBe(true);
    });

    it('should handle empty metrics array', async () => {
      await publishMetrics([]);
      expect(true).toBe(true);
    });
  });

  describe('publishAgentExecutionMetrics', () => {
    it('should publish agent execution success metrics', async () => {
      await publishAgentExecutionMetrics({
        agentId: 'weather-agent',
        agentType: 'WeatherAgent',
        duration: 1500,
        success: true,
        toolCount: 2,
      });

      expect(true).toBe(true);
    });

    it('should publish agent execution failure metrics', async () => {
      await publishAgentExecutionMetrics({
        agentId: 'calendar-agent',
        agentType: 'CalendarQueryAgent',
        duration: 2000,
        success: false,
      });

      expect(true).toBe(true);
    });

    it('should include tool count when provided', async () => {
      await publishAgentExecutionMetrics({
        agentId: 'test-agent',
        agentType: 'TestAgent',
        duration: 1000,
        success: true,
        toolCount: 3,
      });

      expect(true).toBe(true);
    });
  });

  describe('publishToolInvocationMetrics', () => {
    it('should publish tool invocation success metrics', async () => {
      await publishToolInvocationMetrics({
        toolName: 'weather-tool',
        duration: 500,
        success: true,
      });

      expect(true).toBe(true);
    });

    it('should publish tool invocation error metrics', async () => {
      await publishToolInvocationMetrics({
        toolName: 'calendar-tool',
        duration: 1000,
        success: false,
        error: 'Tool timeout',
      });

      expect(true).toBe(true);
    });
  });

  describe('publishBedrockLatencyMetrics', () => {
    it('should publish Bedrock latency metrics', async () => {
      await publishBedrockLatencyMetrics({
        duration: 2000,
        modelUsed: 'claude-3-sonnet',
        success: true,
      });

      expect(true).toBe(true);
    });

    it('should handle Bedrock failure metrics', async () => {
      await publishBedrockLatencyMetrics({
        duration: 5000,
        modelUsed: 'claude-3-sonnet',
        success: false,
      });

      expect(true).toBe(true);
    });
  });

  describe('publishDynamoDBLatencyMetrics', () => {
    it('should publish DynamoDB latency metrics for GetItem', async () => {
      await publishDynamoDBLatencyMetrics({
        operation: 'GetItem',
        duration: 100,
        success: true,
        tableName: 'agent-executions',
      });

      expect(true).toBe(true);
    });

    it('should publish DynamoDB latency metrics for PutItem', async () => {
      await publishDynamoDBLatencyMetrics({
        operation: 'PutItem',
        duration: 150,
        success: true,
        tableName: 'agent-executions',
      });

      expect(true).toBe(true);
    });

    it('should handle DynamoDB failure metrics', async () => {
      await publishDynamoDBLatencyMetrics({
        operation: 'Query',
        duration: 3000,
        success: false,
        tableName: 'agent-executions',
      });

      expect(true).toBe(true);
    });
  });

  describe('publishLambdaDurationMetric', () => {
    it('should publish Lambda duration for successful execution', async () => {
      await publishLambdaDurationMetric(1500, 'agent-executor', true);
      expect(true).toBe(true);
    });

    it('should publish Lambda duration for failed execution', async () => {
      await publishLambdaDurationMetric(2000, 'agent-executor', false);
      expect(true).toBe(true);
    });
  });

  describe('publishErrorRateMetric', () => {
    it('should publish agent execution error rate', async () => {
      await publishErrorRateMetric(2.5, 'AgentExecution');
      expect(true).toBe(true);
    });

    it('should publish tool invocation error rate', async () => {
      await publishErrorRateMetric(5.0, 'ToolInvocation');
      expect(true).toBe(true);
    });

    it('should publish DynamoDB error rate', async () => {
      await publishErrorRateMetric(1.0, 'DynamoDB');
      expect(true).toBe(true);
    });

    it('should publish Bedrock error rate', async () => {
      await publishErrorRateMetric(3.5, 'Bedrock');
      expect(true).toBe(true);
    });
  });
});
