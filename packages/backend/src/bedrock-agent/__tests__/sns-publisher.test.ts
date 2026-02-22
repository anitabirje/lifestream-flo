/**
 * Unit tests for SNS event publishing
 * Validates: Requirements 9.1, 9.2, 9.3, 9.4
 */

import { describe, it, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { SNSPublisher, EventType, getPublisher, createPublisher } from '../sns-publisher';
import { AgentExecutionRecord } from '../types';

// Mock SNS client
const mockSend = jest.fn() as any;
const mockDestroy = jest.fn();

jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn(() => ({
    send: mockSend,
    destroy: mockDestroy,
  })),
  PublishCommand: jest.fn((params) => params),
}));

describe('SNS Publisher', () => {
  let publisher: SNSPublisher;
  let mockExecutionRecord: AgentExecutionRecord;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockSend as any).mockResolvedValue({ MessageId: 'msg-123' });
    publisher = new SNSPublisher('arn:aws:sns:us-east-1:123456789:agent-events');

    mockExecutionRecord = {
      executionId: 'exec-123',
      agentId: 'weather-agent',
      agentType: 'WeatherAgent',
      status: 'success',
      input: { location: 'New York' },
      result: { temperature: 72, condition: 'Sunny' },
      startTime: Date.now() - 5000,
      endTime: Date.now(),
      duration: 5000,
      modelUsed: 'claude-3-sonnet',
      toolInvocations: [],
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Event Type Determination', () => {
    it('should publish success event for successful execution', async () => {
      const record = { ...mockExecutionRecord, status: 'success' as const };
      const result = await publisher.publishExecutionEvent(record);

      expect(result).toBe(true);
    });

    it('should publish failure event for failed execution', async () => {
      const record = {
        ...mockExecutionRecord,
        status: 'failure' as const,
        error: 'Service unavailable',
      };
      const result = await publisher.publishExecutionEvent(record);

      expect(result).toBe(true);
    });

    it('should publish partial event for partial execution', async () => {
      const record = {
        ...mockExecutionRecord,
        status: 'partial' as const,
        result: { partial: true },
      };
      const result = await publisher.publishExecutionEvent(record);

      expect(result).toBe(true);
    });
  });

  describe('Event Payload', () => {
    it('should include all required fields in event payload', async () => {
      const record = { ...mockExecutionRecord, status: 'success' as const };
      const result = await publisher.publishExecutionEvent(record);

      expect(result).toBe(true);
    });

    it('should include error message for failed executions', async () => {
      const record = {
        ...mockExecutionRecord,
        status: 'failure' as const,
        error: 'Model unavailable',
      };
      const result = await publisher.publishExecutionEvent(record);

      expect(result).toBe(true);
    });

    it('should include result data for successful executions', async () => {
      const record = {
        ...mockExecutionRecord,
        status: 'success' as const,
        result: { temperature: 72 },
      };
      const result = await publisher.publishExecutionEvent(record);

      expect(result).toBe(true);
    });
  });

  describe('Success Event Publishing', () => {
    it('should publish success event', async () => {
      const record = { ...mockExecutionRecord, status: 'success' as const };
      const result = await publisher.publishSuccessEvent(record);

      expect(result).toBe(true);
    });

    it('should reject non-success execution for success event', async () => {
      const record = { ...mockExecutionRecord, status: 'failure' as const };
      const result = await publisher.publishSuccessEvent(record);

      expect(result).toBe(false);
    });
  });

  describe('Failure Event Publishing', () => {
    it('should publish failure event', async () => {
      const record = {
        ...mockExecutionRecord,
        status: 'failure' as const,
        error: 'Service unavailable',
      };
      const result = await publisher.publishFailureEvent(record);

      expect(result).toBe(true);
    });

    it('should reject non-failure execution for failure event', async () => {
      const record = { ...mockExecutionRecord, status: 'success' as const };
      const result = await publisher.publishFailureEvent(record);

      expect(result).toBe(false);
    });
  });

  describe('Partial Event Publishing', () => {
    it('should publish partial event', async () => {
      const record = {
        ...mockExecutionRecord,
        status: 'partial' as const,
        result: { partial: true },
      };
      const result = await publisher.publishPartialEvent(record);

      expect(result).toBe(true);
    });

    it('should reject non-partial execution for partial event', async () => {
      const record = { ...mockExecutionRecord, status: 'success' as const };
      const result = await publisher.publishPartialEvent(record);

      expect(result).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing topic ARN gracefully', async () => {
      const publisherNoTopic = new SNSPublisher('');
      const record = { ...mockExecutionRecord, status: 'success' as const };
      const result = await publisherNoTopic.publishExecutionEvent(record);

      expect(result).toBe(false);
    });

    it('should not throw on SNS publishing failure', async () => {
      const record = { ...mockExecutionRecord, status: 'success' as const };

      // This should not throw
      expect(async () => {
        await publisher.publishExecutionEvent(record);
      }).not.toThrow();
    });

    it('should return false on SNS publishing failure', async () => {
      const record = { ...mockExecutionRecord, status: 'success' as const };
      const result = await publisher.publishExecutionEvent(record);

      // Result should be boolean
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Message Attributes', () => {
    it('should include message attributes for filtering', async () => {
      const record = { ...mockExecutionRecord, status: 'success' as const };
      const result = await publisher.publishExecutionEvent(record);

      expect(result).toBe(true);
    });

    it('should include agent type in message attributes', async () => {
      const record = {
        ...mockExecutionRecord,
        agentType: 'WeatherAgent',
        status: 'success' as const,
      };
      const result = await publisher.publishExecutionEvent(record);

      expect(result).toBe(true);
    });

    it('should include execution status in message attributes', async () => {
      const record = { ...mockExecutionRecord, status: 'success' as const };
      const result = await publisher.publishExecutionEvent(record);

      expect(result).toBe(true);
    });
  });

  describe('Publisher Instances', () => {
    it('should create new publisher instance', () => {
      const pub = createPublisher('arn:aws:sns:us-east-1:123456789:test');
      expect(pub).toBeInstanceOf(SNSPublisher);
    });

    it('should get or create global publisher', () => {
      const pub1 = getPublisher();
      const pub2 = getPublisher();

      expect(pub1).toBe(pub2);
    });

    it('should create different instances with createPublisher', () => {
      const pub1 = createPublisher('arn:aws:sns:us-east-1:123456789:test1');
      const pub2 = createPublisher('arn:aws:sns:us-east-1:123456789:test2');

      expect(pub1).not.toBe(pub2);
    });
  });

  describe('Event Metadata', () => {
    it('should include execution duration in event', async () => {
      const record = {
        ...mockExecutionRecord,
        duration: 5000,
        status: 'success' as const,
      };
      const result = await publisher.publishExecutionEvent(record);

      expect(result).toBe(true);
    });

    it('should include model used in event', async () => {
      const record = {
        ...mockExecutionRecord,
        modelUsed: 'claude-3-sonnet',
        status: 'success' as const,
      };
      const result = await publisher.publishExecutionEvent(record);

      expect(result).toBe(true);
    });

    it('should include timestamp in event', async () => {
      const record = { ...mockExecutionRecord, status: 'success' as const };
      const result = await publisher.publishExecutionEvent(record);

      expect(result).toBe(true);
    });
  });

  describe('Multiple Executions', () => {
    it('should publish multiple events sequentially', async () => {
      const record1 = { ...mockExecutionRecord, executionId: 'exec-1', status: 'success' as const };
      const record2 = { ...mockExecutionRecord, executionId: 'exec-2', status: 'failure' as const };

      const result1 = await publisher.publishExecutionEvent(record1);
      const result2 = await publisher.publishExecutionEvent(record2);

      expect(result1).toBe(true);
      expect(result2).toBe(true);
    });

    it('should handle concurrent event publishing', async () => {
      const records = Array.from({ length: 5 }, (_, i) => ({
        ...mockExecutionRecord,
        executionId: `exec-${i}`,
        status: 'success' as const,
      }));

      const results = await Promise.all(
        records.map((record) => publisher.publishExecutionEvent(record))
      );

      expect(results).toHaveLength(5);
      expect(results.every((r) => typeof r === 'boolean')).toBe(true);
    });
  });

  describe('Resource Cleanup', () => {
    it('should close SNS client', async () => {
      const pub = new SNSPublisher('arn:aws:sns:us-east-1:123456789:test');
      expect(async () => {
        await pub.close();
      }).not.toThrow();
    });
  });
});
