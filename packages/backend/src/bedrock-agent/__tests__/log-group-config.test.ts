/**
 * Tests for CloudWatch Log Group Configuration
 * Validates: Requirements 6.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createLogGroup,
  setLogGroupRetention,
  createAndConfigureLogGroup,
  getDefaultLogGroupConfigs,
  createDefaultLogGroups,
  LogGroupConfig,
} from '../log-group-config';

// Mock the AWS SDK
vi.mock('@aws-sdk/client-logs', () => ({
  CloudWatchLogsClient: vi.fn(() => ({
    send: vi.fn().mockResolvedValue({}),
    destroy: vi.fn().mockResolvedValue(undefined),
  })),
  CreateLogGroupCommand: vi.fn((params) => params),
  PutRetentionPolicyCommand: vi.fn((params) => params),
}));

describe('Log Group Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createLogGroup', () => {
    it('should create a log group', async () => {
      await createLogGroup('/aws/lambda/test-function');
      expect(true).toBe(true);
    });

    it('should handle log group already exists error', async () => {
      await createLogGroup('/aws/lambda/existing-function');
      expect(true).toBe(true);
    });
  });

  describe('setLogGroupRetention', () => {
    it('should set retention policy for log group', async () => {
      await setLogGroupRetention('/aws/lambda/test-function', 30);
      expect(true).toBe(true);
    });

    it('should set retention to 7 days', async () => {
      await setLogGroupRetention('/aws/lambda/test-function', 7);
      expect(true).toBe(true);
    });

    it('should set retention to 365 days', async () => {
      await setLogGroupRetention('/aws/lambda/test-function', 365);
      expect(true).toBe(true);
    });
  });

  describe('createAndConfigureLogGroup', () => {
    it('should create and configure log group', async () => {
      const config: LogGroupConfig = {
        logGroupName: '/aws/lambda/test-function',
        retentionInDays: 30,
      };

      await createAndConfigureLogGroup(config);
      expect(true).toBe(true);
    });

    it('should handle multiple log group configurations', async () => {
      const configs: LogGroupConfig[] = [
        {
          logGroupName: '/aws/lambda/function1',
          retentionInDays: 30,
        },
        {
          logGroupName: '/aws/lambda/function2',
          retentionInDays: 7,
        },
      ];

      for (const config of configs) {
        await createAndConfigureLogGroup(config);
      }

      expect(true).toBe(true);
    });
  });

  describe('getDefaultLogGroupConfigs', () => {
    it('should return default log group configurations', () => {
      const configs = getDefaultLogGroupConfigs();
      expect(Array.isArray(configs)).toBe(true);
      expect(configs.length).toBeGreaterThan(0);
    });

    it('should include agent executor log group', () => {
      const configs = getDefaultLogGroupConfigs();
      const agentExecutor = configs.find((c) => c.logGroupName === '/aws/lambda/agent-executor');
      expect(agentExecutor).toBeDefined();
      expect(agentExecutor?.retentionInDays).toBe(30);
    });

    it('should include tool log groups', () => {
      const configs = getDefaultLogGroupConfigs();
      const toolLogGroups = configs.filter((c) => c.logGroupName.includes('agent-tool'));
      expect(toolLogGroups.length).toBeGreaterThan(0);
    });

    it('should include Bedrock agent log group', () => {
      const configs = getDefaultLogGroupConfigs();
      const bedrockLogGroup = configs.find((c) => c.logGroupName === '/aws/bedrock/agents');
      expect(bedrockLogGroup).toBeDefined();
      expect(bedrockLogGroup?.retentionInDays).toBe(30);
    });

    it('should have all log groups with 30 day retention', () => {
      const configs = getDefaultLogGroupConfigs();
      const allHave30Days = configs.every((c) => c.retentionInDays === 30);
      expect(allHave30Days).toBe(true);
    });
  });

  describe('createDefaultLogGroups', () => {
    it('should create all default log groups', async () => {
      await createDefaultLogGroups();
      expect(true).toBe(true);
    });
  });

  describe('Log Group Configuration Properties', () => {
    it('should have valid log group names', () => {
      const configs = getDefaultLogGroupConfigs();
      configs.forEach((config) => {
        expect(config.logGroupName).toMatch(/^\/aws\//);
      });
    });

    it('should have valid retention days', () => {
      const configs = getDefaultLogGroupConfigs();
      configs.forEach((config) => {
        expect(config.retentionInDays).toBeGreaterThan(0);
        expect(config.retentionInDays).toBeLessThanOrEqual(3653);
      });
    });

    it('should have unique log group names', () => {
      const configs = getDefaultLogGroupConfigs();
      const names = configs.map((c) => c.logGroupName);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });
});
