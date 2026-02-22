/**
 * Unit tests for error handling and resilience
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  isRetryableError,
  categorizeError,
  getUserFriendlyMessage,
  logError,
  handleBedrockError,
  handleToolError,
  handleDataError,
  createFallbackResponse,
  ErrorCategory,
} from '../error-handler';
import {
  getCachedResponse,
  cacheResponse,
  createFallbackFromCache,
  createDegradedResponse,
  recordFallbackUsage,
  getFallbackAuditTrail,
  getFallbackStats,
  clearFallbackData,
  generateCacheKey,
} from '../fallback-manager';
import { BedrockAgentError, ToolInvocationError, DataPersistenceError } from '../types';

describe('Error Handler', () => {
  describe('isRetryableError', () => {
    it('should return true for retryable BedrockAgentError', () => {
      const error = new BedrockAgentError('Rate limited', 'RATE_LIMIT', true);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable BedrockAgentError', () => {
      const error = new BedrockAgentError('Invalid params', 'INVALID_PARAMETERS', false);
      expect(isRetryableError(error)).toBe(false);
    });

    it('should return true for retryable ToolInvocationError', () => {
      const error = new ToolInvocationError('Timeout', 'calendar-tool', true);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return true for retryable DataPersistenceError', () => {
      const error = new DataPersistenceError('DynamoDB throttled', true);
      expect(isRetryableError(error)).toBe(true);
    });

    it('should detect throttling in error message', () => {
      const error = new Error('ThrottlingException');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should detect rate limiting in error message', () => {
      const error = new Error('Rate limit exceeded');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should detect timeout in error message', () => {
      const error = new Error('Request timeout');
      expect(isRetryableError(error)).toBe(true);
    });

    it('should return false for non-retryable errors', () => {
      const error = new Error('Invalid input');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('categorizeError', () => {
    it('should categorize model unavailable error', () => {
      const error = new BedrockAgentError('Model unavailable', 'MODEL_UNAVAILABLE', true);
      expect(categorizeError(error)).toBe(ErrorCategory.BEDROCK_UNAVAILABLE);
    });

    it('should categorize rate limiting error', () => {
      const error = new BedrockAgentError('Rate limited', 'RATE_LIMIT', true);
      expect(categorizeError(error)).toBe(ErrorCategory.RATE_LIMITING);
    });

    it('should categorize invalid parameters error', () => {
      const error = new BedrockAgentError('Invalid params', 'INVALID_PARAMETERS', false);
      expect(categorizeError(error)).toBe(ErrorCategory.INVALID_PARAMETERS);
    });

    it('should categorize tool failure error', () => {
      const error = new ToolInvocationError('Tool failed', 'calendar-tool', false);
      expect(categorizeError(error)).toBe(ErrorCategory.TOOL_FAILURE);
    });

    it('should categorize tool timeout error', () => {
      const error = new ToolInvocationError('Timeout', 'calendar-tool-timeout', false);
      expect(categorizeError(error)).toBe(ErrorCategory.TOOL_TIMEOUT);
    });

    it('should categorize data persistence error', () => {
      const error = new DataPersistenceError('DynamoDB error', true);
      expect(categorizeError(error)).toBe(ErrorCategory.DATA_PERSISTENCE);
    });

    it('should categorize unknown error', () => {
      const error = new Error('Unknown error');
      expect(categorizeError(error)).toBe(ErrorCategory.UNKNOWN);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return appropriate message for unavailable service', () => {
      const message = getUserFriendlyMessage(
        new Error('Service unavailable'),
        ErrorCategory.BEDROCK_UNAVAILABLE
      );
      expect(message).toContain('temporarily unavailable');
    });

    it('should return appropriate message for rate limiting', () => {
      const message = getUserFriendlyMessage(
        new Error('Rate limited'),
        ErrorCategory.RATE_LIMITING
      );
      expect(message).toContain('Too many requests');
    });

    it('should return appropriate message for invalid parameters', () => {
      const message = getUserFriendlyMessage(
        new Error('Invalid params'),
        ErrorCategory.INVALID_PARAMETERS
      );
      expect(message).toContain('Invalid request parameters');
    });

    it('should return appropriate message for tool failure', () => {
      const message = getUserFriendlyMessage(
        new Error('Tool failed'),
        ErrorCategory.TOOL_FAILURE
      );
      expect(message).toContain('tool operation failed');
    });

    it('should return appropriate message for tool timeout', () => {
      const message = getUserFriendlyMessage(
        new Error('Timeout'),
        ErrorCategory.TOOL_TIMEOUT
      );
      expect(message).toContain('timed out');
    });

    it('should return appropriate message for data persistence error', () => {
      const message = getUserFriendlyMessage(
        new Error('DynamoDB error'),
        ErrorCategory.DATA_PERSISTENCE
      );
      expect(message).toContain('Failed to save data');
    });
  });

  describe('handleBedrockError', () => {
    it('should return BedrockAgentError if already one', () => {
      const error = new BedrockAgentError('Already error', 'RATE_LIMIT', true);
      const result = handleBedrockError(error);
      expect(result).toBe(error);
    });

    it('should convert ThrottlingException to RATE_LIMIT', () => {
      const error = new Error('ThrottlingException');
      (error as any).code = 'ThrottlingException';
      const result = handleBedrockError(error);
      expect(result.code).toBe('RATE_LIMIT');
      expect(result.retryable).toBe(true);
    });

    it('should convert ServiceUnavailable to MODEL_UNAVAILABLE', () => {
      const error = new Error('ServiceUnavailable');
      (error as any).code = 'ServiceUnavailable';
      const result = handleBedrockError(error);
      expect(result.code).toBe('MODEL_UNAVAILABLE');
      expect(result.retryable).toBe(true);
    });

    it('should convert ValidationException to INVALID_PARAMETERS', () => {
      const error = new Error('ValidationException');
      (error as any).code = 'ValidationException';
      const result = handleBedrockError(error);
      expect(result.code).toBe('INVALID_PARAMETERS');
      expect(result.retryable).toBe(false);
    });
  });

  describe('handleToolError', () => {
    it('should return ToolInvocationError if already one', () => {
      const error = new ToolInvocationError('Already error', 'calendar-tool', true);
      const result = handleToolError('calendar-tool', error);
      expect(result).toBe(error);
    });

    it('should create ToolInvocationError from generic error', () => {
      const error = new Error('Tool failed');
      const result = handleToolError('calendar-tool', error);
      expect(result).toBeInstanceOf(ToolInvocationError);
      expect(result.toolName).toBe('calendar-tool');
    });
  });

  describe('handleDataError', () => {
    it('should return DataPersistenceError if already one', () => {
      const error = new DataPersistenceError('Already error', true);
      const result = handleDataError(error);
      expect(result).toBe(error);
    });

    it('should create DataPersistenceError from generic error', () => {
      const error = new Error('DynamoDB error');
      const result = handleDataError(error);
      expect(result).toBeInstanceOf(DataPersistenceError);
    });
  });

  describe('createFallbackResponse', () => {
    it('should create fallback response with error details', () => {
      const error = new BedrockAgentError('Service unavailable', 'MODEL_UNAVAILABLE', true);
      const response = createFallbackResponse('exec-1', 'agent-1', error);

      expect(response.executionId).toBe('exec-1');
      expect(response.agentId).toBe('agent-1');
      expect(response.status).toBe('failure');
      expect(response.result).toHaveProperty('fallback', true);
      expect(response.error).toBeDefined();
    });

    it('should include metadata in fallback response', () => {
      const error = new Error('Unknown error');
      const response = createFallbackResponse('exec-1', 'agent-1', error);

      expect(response.metadata).toBeDefined();
      expect(response.metadata).toHaveProperty('startTime');
      expect(response.metadata).toHaveProperty('endTime');
      expect(response.metadata).toHaveProperty('modelUsed', 'fallback');
    });
  });
});

describe('Fallback Manager', () => {
  beforeEach(() => {
    clearFallbackData();
  });

  describe('Cache Management', () => {
    it('should generate consistent cache keys', () => {
      const input = { location: 'New York', units: 'fahrenheit' };
      const key1 = generateCacheKey('weather-tool', input);
      const key2 = generateCacheKey('weather-tool', input);
      expect(key1).toBe(key2);
    });

    it('should generate different cache keys for different inputs', () => {
      const input1 = { location: 'New York' };
      const input2 = { location: 'London' };
      const key1 = generateCacheKey('weather-tool', input1);
      const key2 = generateCacheKey('weather-tool', input2);
      expect(key1).not.toBe(key2);
    });

    it('should cache successful responses', () => {
      const input = { location: 'New York' };
      const output = {
        success: true,
        data: { temperature: 72, condition: 'Sunny' },
      };

      cacheResponse('weather-tool', input, output);
      const cached = getCachedResponse('weather-tool', input);

      expect(cached).toBeDefined();
      expect(cached?.temperature).toBe(72);
    });

    it('should not cache failed responses', () => {
      const input = { location: 'New York' };
      const output = {
        success: false,
        error: 'Failed to fetch weather',
      };

      cacheResponse('weather-tool', input, output);
      const cached = getCachedResponse('weather-tool', input);

      expect(cached).toBeNull();
    });

    it('should respect cache TTL', (done) => {
      const input = { location: 'New York' };
      const output = {
        success: true,
        data: { temperature: 72 },
      };

      cacheResponse('weather-tool', input, output, 100); // 100ms TTL
      expect(getCachedResponse('weather-tool', input)).not.toBeNull();

      setTimeout(() => {
        expect(getCachedResponse('weather-tool', input)).toBeNull();
        done();
      }, 150);
    });
  });

  describe('Fallback Responses', () => {
    it('should create fallback from cache', () => {
      const input = { location: 'New York' };
      const output = {
        success: true,
        data: { temperature: 72, condition: 'Sunny' },
      };

      cacheResponse('weather-tool', input, output);
      const fallback = createFallbackFromCache('weather-tool', input);

      expect(fallback).not.toBeNull();
      expect(fallback?.success).toBe(true);
      expect(fallback?.data?._fallback).toBe(true);
    });

    it('should return null if no cached response', () => {
      const fallback = createFallbackFromCache('weather-tool', { location: 'Unknown' });
      expect(fallback).toBeNull();
    });

    it('should create degraded response', () => {
      const response = createDegradedResponse('weather-tool', 'Service unavailable');

      expect(response.success).toBe(false);
      expect(response.error).toContain('weather-tool');
      expect(response.error).toContain('temporarily unavailable');
    });
  });

  describe('Audit Trail', () => {
    it('should record fallback usage', () => {
      recordFallbackUsage('weather-tool', 'Service unavailable', 'cached', 'exec-1');
      const entries = getFallbackAuditTrail();

      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].toolName).toBe('weather-tool');
      expect(entries[0].fallbackType).toBe('cached');
    });

    it('should track multiple fallback usages', () => {
      recordFallbackUsage('weather-tool', 'Service unavailable', 'cached', 'exec-1');
      recordFallbackUsage('calendar-tool', 'Timeout', 'degraded', 'exec-2');

      const entries = getFallbackAuditTrail();
      expect(entries.length).toBe(2);
    });

    it('should provide fallback statistics', () => {
      recordFallbackUsage('weather-tool', 'Service unavailable', 'cached', 'exec-1');
      recordFallbackUsage('calendar-tool', 'Timeout', 'degraded', 'exec-2');

      const stats = getFallbackStats();
      expect(stats.audit.totalEntries).toBe(2);
      expect(stats.audit.cachedFallbacks).toBe(1);
      expect(stats.audit.degradedFallbacks).toBe(1);
    });

    it('should limit audit trail size', () => {
      // Record many entries
      for (let i = 0; i < 15000; i++) {
        recordFallbackUsage('tool', 'reason', 'cached', `exec-${i}`);
      }

      const stats = getFallbackStats();
      expect(stats.audit.totalEntries).toBeLessThanOrEqual(10000);
    });
  });

  describe('Cache Statistics', () => {
    it('should report cache statistics', () => {
      const input = { location: 'New York' };
      const output = {
        success: true,
        data: { temperature: 72 },
      };

      cacheResponse('weather-tool', input, output);
      const stats = getFallbackStats();

      expect(stats.cache.size).toBeGreaterThan(0);
      expect(stats.cache.maxSize).toBe(1000);
    });
  });

  describe('Clear Fallback Data', () => {
    it('should clear all fallback data', () => {
      const input = { location: 'New York' };
      const output = {
        success: true,
        data: { temperature: 72 },
      };

      cacheResponse('weather-tool', input, output);
      recordFallbackUsage('weather-tool', 'Service unavailable', 'cached', 'exec-1');

      clearFallbackData();

      expect(getCachedResponse('weather-tool', input)).toBeNull();
      expect(getFallbackAuditTrail().length).toBe(0);
    });
  });
});
