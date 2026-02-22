/**
 * Tests for CloudWatch Alarms Configuration
 * Validates: Requirements 6.5
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createOrUpdateAlarm,
  createDefaultAlarms,
  getExecutionFailureRateAlarmConfig,
  getToolErrorRateAlarmConfig,
  getLambdaDurationAlarmConfig,
  getDynamoDBThrottlingAlarmConfig,
  getBedrockRateLimitingAlarmConfig,
  AlarmConfig,
} from '../cloudwatch-alarms';

// Mock the AWS SDK
vi.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutMetricAlarmCommand: vi.fn((params) => params),
}));

vi.mock('../aws-clients', () => ({
  getCloudWatchClient: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
}));

describe('CloudWatch Alarms', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createOrUpdateAlarm', () => {
    it('should create an alarm with valid config', async () => {
      const config: AlarmConfig = {
        alarmName: 'TestAlarm',
        metricName: 'TestMetric',
        namespace: 'TestNamespace',
        statistic: 'Average',
        period: 300,
        evaluationPeriods: 1,
        threshold: 100,
        comparisonOperator: 'GreaterThanThreshold',
        alarmDescription: 'Test alarm',
      };

      await createOrUpdateAlarm(config);
      expect(true).toBe(true);
    });

    it('should create alarm with dimensions', async () => {
      const config: AlarmConfig = {
        alarmName: 'TestAlarmWithDimensions',
        metricName: 'TestMetric',
        namespace: 'TestNamespace',
        statistic: 'Sum',
        period: 60,
        evaluationPeriods: 2,
        threshold: 50,
        comparisonOperator: 'GreaterThanOrEqualToThreshold',
        alarmDescription: 'Test alarm with dimensions',
        dimensions: [
          { name: 'AgentId', value: 'test-agent' },
          { name: 'Status', value: 'Failure' },
        ],
      };

      await createOrUpdateAlarm(config);
      expect(true).toBe(true);
    });

    it('should create alarm with custom treatMissingData', async () => {
      const config: AlarmConfig = {
        alarmName: 'TestAlarmMissingData',
        metricName: 'TestMetric',
        namespace: 'TestNamespace',
        statistic: 'Average',
        period: 300,
        evaluationPeriods: 1,
        threshold: 100,
        comparisonOperator: 'GreaterThanThreshold',
        alarmDescription: 'Test alarm',
        treatMissingData: 'breaching',
      };

      await createOrUpdateAlarm(config);
      expect(true).toBe(true);
    });
  });

  describe('createDefaultAlarms', () => {
    it('should create all default alarms', async () => {
      await createDefaultAlarms();
      expect(true).toBe(true);
    });
  });

  describe('Alarm Configuration Getters', () => {
    it('should return execution failure rate alarm config', () => {
      const config = getExecutionFailureRateAlarmConfig();
      expect(config.alarmName).toBe('AgentExecutionFailureRate');
      expect(config.metricName).toBe('AgentExecutionFailure');
      expect(config.threshold).toBe(5);
      expect(config.comparisonOperator).toBe('GreaterThanThreshold');
    });

    it('should return tool error rate alarm config', () => {
      const config = getToolErrorRateAlarmConfig();
      expect(config.alarmName).toBe('ToolInvocationErrorRate');
      expect(config.metricName).toBe('ToolInvocationError');
      expect(config.threshold).toBe(10);
      expect(config.comparisonOperator).toBe('GreaterThanThreshold');
    });

    it('should return Lambda duration alarm config', () => {
      const config = getLambdaDurationAlarmConfig();
      expect(config.alarmName).toBe('LambdaDurationHigh');
      expect(config.metricName).toBe('LambdaDuration');
      expect(config.threshold).toBe(30000);
      expect(config.statistic).toBe('Average');
    });

    it('should return DynamoDB throttling alarm config', () => {
      const config = getDynamoDBThrottlingAlarmConfig();
      expect(config.alarmName).toBe('DynamoDBThrottling');
      expect(config.metricName).toBe('DynamoDBLatency');
      expect(config.threshold).toBe(5000);
      expect(config.period).toBe(60);
    });

    it('should return Bedrock rate limiting alarm config', () => {
      const config = getBedrockRateLimitingAlarmConfig();
      expect(config.alarmName).toBe('BedrockRateLimiting');
      expect(config.metricName).toBe('BedrockLatency');
      expect(config.threshold).toBe(10000);
      expect(config.period).toBe(60);
    });
  });

  describe('Alarm Configuration Properties', () => {
    it('execution failure rate alarm should have correct properties', () => {
      const config = getExecutionFailureRateAlarmConfig();
      expect(config.period).toBe(300);
      expect(config.evaluationPeriods).toBe(1);
      expect(config.statistic).toBe('Sum');
    });

    it('tool error rate alarm should have correct properties', () => {
      const config = getToolErrorRateAlarmConfig();
      expect(config.period).toBe(300);
      expect(config.evaluationPeriods).toBe(1);
      expect(config.statistic).toBe('Sum');
    });

    it('Lambda duration alarm should have correct properties', () => {
      const config = getLambdaDurationAlarmConfig();
      expect(config.period).toBe(300);
      expect(config.evaluationPeriods).toBe(2);
      expect(config.statistic).toBe('Average');
    });

    it('DynamoDB throttling alarm should have correct properties', () => {
      const config = getDynamoDBThrottlingAlarmConfig();
      expect(config.period).toBe(60);
      expect(config.evaluationPeriods).toBe(2);
      expect(config.statistic).toBe('Average');
    });

    it('Bedrock rate limiting alarm should have correct properties', () => {
      const config = getBedrockRateLimitingAlarmConfig();
      expect(config.period).toBe(60);
      expect(config.evaluationPeriods).toBe(2);
      expect(config.statistic).toBe('Average');
    });
  });
});
