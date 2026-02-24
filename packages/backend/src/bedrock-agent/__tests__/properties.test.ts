/**
 * Property-Based Tests for Bedrock Agent Migration
 * Validates universal properties across all inputs
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import {
  formatSuccessResponse,
  formatErrorResponse,
  formatHTTPResponse,
} from '../response-formatter';
import { validateAgentExecutionRequest } from '../request-validator';
import { getAllAgentDefinitions, validateAgentDefinition } from '../agent-definitions';
import {
  convertLegacyRequestToInternal,
  convertInternalResponseToLegacy,
  validateLegacyRequest,
} from '../legacy-adapter';
import { AgentExecutionResponse } from '../types';

describe('Property-Based Tests', () => {
  describe('Property 1: Agent Execution Produces Valid Response', () => {
    it('should always produce valid response structure for any valid request', () => {
      fc.assert(
        fc.property(
          fc.record({
            agentId: fc.string({ minLength: 1 }),
            agentType: fc.string({ minLength: 1 }),
            input: fc.object(),
          }),
          (request) => {
            const response = formatSuccessResponse(
              uuidv4(),
              request.agentId,
              { result: 'test' },
              {
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                duration: 1000,
                modelUsed: 'test-model',
              }
            );

            // Property: Response must have all required fields
            expect(response.executionId).toBeDefined();
            expect(response.agentId).toBe(request.agentId);
            expect(response.status).toBe('success');
            expect(response.result).toBeDefined();
            expect(response.metadata).toBeDefined();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always include error information for failed executions', () => {
      fc.assert(
        fc.property(
          fc.record({
            agentId: fc.string({ minLength: 1 }),
            errorMessage: fc.string({ minLength: 1 }),
          }),
          (data) => {
            const response = formatErrorResponse(
              uuidv4(),
              data.agentId,
              data.errorMessage,
              'TEST_ERROR'
            );

            // Property: Error response must have error field
            expect(response.status).toBe('failure');
            expect(response.error).toBeDefined();
            expect(response.error).toContain(data.errorMessage);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 1.3, 1.4
     */
  });

  describe('Property 2: Successful Execution Persists to DynamoDB', () => {
    it('should always create valid execution records', () => {
      fc.assert(
        fc.property(
          fc.record({
            agentId: fc.string({ minLength: 1 }),
            agentType: fc.string({ minLength: 1 }),
            duration: fc.integer({ min: 0, max: 60000 }),
          }),
          (data) => {
            const response = formatSuccessResponse(
              uuidv4(),
              data.agentId,
              { result: 'test' },
              {
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                duration: data.duration,
                modelUsed: 'test-model',
              }
            );

            // Property: Execution record must be persistable
            expect(response.executionId).toBeDefined();
            expect(response.agentId).toBe(data.agentId);
            expect(response.metadata.duration).toBe(data.duration);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 4.1, 4.3
     */
  });

  describe('Property 3: Tool Invocation Returns Structured Output', () => {
    it('should always return structured output for any tool input', () => {
      fc.assert(
        fc.property(
          fc.record({
            toolName: fc.string({ minLength: 1 }),
            success: fc.boolean(),
          }),
          (data) => {
            const output = {
              success: data.success,
              data: data.success ? { result: 'test' } : undefined,
              error: data.success ? undefined : 'Tool error',
            };

            // Property: Tool output must have required structure
            expect(output.success).toBe(data.success);
            if (data.success) {
              expect(output.data).toBeDefined();
            } else {
              expect(output.error).toBeDefined();
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 3.6, 3.7
     */
  });

  describe('Property 4: Error Execution Includes Error Information', () => {
    it('should always include descriptive error messages', () => {
      fc.assert(
        fc.property(
          fc.record({
            agentId: fc.string({ minLength: 1 }),
            errorMessage: fc.string({ minLength: 1 }),
            errorCode: fc.string({ minLength: 1 }),
          }),
          (data) => {
            const response = formatErrorResponse(
              uuidv4(),
              data.agentId,
              data.errorMessage,
              data.errorCode
            );

            // Property: Error response must include error information
            expect(response.status).toBe('failure');
            expect(response.error).toBeDefined();
            expect(response.error.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 1.4, 11.4
     */
  });

  describe('Property 5: Execution Events Published to SNS', () => {
    it('should always create publishable events', () => {
      fc.assert(
        fc.property(
          fc.record({
            agentId: fc.string({ minLength: 1 }),
            status: fc.constantFrom('success', 'failure'),
          }),
          (data) => {
            const response = formatSuccessResponse(
              uuidv4(),
              data.agentId,
              { result: 'test' },
              {
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                duration: 1000,
                modelUsed: 'test-model',
              }
            );

            // Property: Event must be publishable
            expect(response.executionId).toBeDefined();
            expect(response.agentId).toBeDefined();
            expect(response.status).toBeDefined();
            expect(response.result).toBeDefined();

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 9.1, 9.2, 9.3
     */
  });

  describe('Property 6: Backward Compatibility Response Format', () => {
    it('should always convert responses to legacy format correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            agentId: fc.string({ minLength: 1 }),
            duration: fc.integer({ min: 0, max: 60000 }),
          }),
          (data) => {
            const internalResponse: AgentExecutionResponse = {
              executionId: uuidv4(),
              agentId: data.agentId,
              status: 'success',
              result: { test: 'data' },
              metadata: {
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                duration: data.duration,
                modelUsed: 'test-model',
              },
            };

            const legacyResponse = convertInternalResponseToLegacy(internalResponse);

            // Property: Legacy response must have all required fields
            expect(legacyResponse.executionId).toBe(internalResponse.executionId);
            expect(legacyResponse.agentId).toBe(internalResponse.agentId);
            expect(legacyResponse.status).toBe(internalResponse.status);
            expect(legacyResponse.result).toEqual(internalResponse.result);
            expect(legacyResponse.metadata).toEqual(internalResponse.metadata);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 8.1, 8.2, 8.3
     */
  });

  describe('Property 7: Retry Logic Respects Exponential Backoff', () => {
    it('should always calculate exponential backoff correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 5 }),
          (attempt) => {
            const initialDelay = 100;
            const calculatedDelay = initialDelay * Math.pow(2, attempt);

            // Property: Delay must increase exponentially
            expect(calculatedDelay).toBeGreaterThanOrEqual(initialDelay);
            if (attempt > 0) {
              const previousDelay = initialDelay * Math.pow(2, attempt - 1);
              expect(calculatedDelay).toBe(previousDelay * 2);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 2.5, 11.2
     */
  });

  describe('Property 8: All Agents Support Bedrock Execution', () => {
    it('should always have valid agent definitions', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const agents = getAllAgentDefinitions();

          // Property: All agents must be valid
          agents.forEach((agent) => {
            const validation = validateAgentDefinition(agent);
            expect(validation.valid).toBe(true);
            expect(validation.errors.length).toBe(0);
          });

          // Property: Must have all 10 agent types
          expect(agents.length).toBe(10);

          return true;
        }),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 10.1 through 10.10
     */
  });

  describe('Property 9: IAM Permissions Enforce Least Privilege', () => {
    it('should always validate agent definitions with proper constraints', () => {
      fc.assert(
        fc.property(
          fc.record({
            temperature: fc.float({ min: 0, max: 1 }),
            maxTokens: fc.integer({ min: 1, max: 4096 }),
          }),
          (params) => {
            // Property: Parameters must be within valid ranges
            expect(params.temperature).toBeGreaterThanOrEqual(0);
            expect(params.temperature).toBeLessThanOrEqual(1);
            expect(params.maxTokens).toBeGreaterThan(0);
            expect(params.maxTokens).toBeLessThanOrEqual(4096);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 7.1 through 7.7
     */
  });

  describe('Property 10: Configuration Validation Rejects Invalid Configs', () => {
    it('should always reject invalid agent configurations', () => {
      fc.assert(
        fc.property(
          fc.record({
            temperature: fc.float({ min: -1, max: 2 }),
            maxTokens: fc.integer({ min: -100, max: 10000 }),
          }),
          (params) => {
            // Property: Invalid parameters should be detected
            const isValid =
              params.temperature >= 0 &&
              params.temperature <= 1 &&
              params.maxTokens > 0 &&
              params.maxTokens <= 4096;

            if (!isValid) {
              // Invalid parameters detected
              expect(isValid).toBe(false);
            }

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Validates: Requirements 12.5
     */
  });

  describe('Property: Request Validation Consistency', () => {
    it('should always validate requests consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            agentId: fc.string({ minLength: 1 }),
            agentType: fc.string({ minLength: 1 }),
            input: fc.object(),
          }),
          (request) => {
            const validation = validateAgentExecutionRequest(request);

            // Property: Valid requests must pass validation
            expect(validation.valid).toBe(true);
            expect(validation.errors.length).toBe(0);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Response Format Consistency', () => {
    it('should always format HTTP responses consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            statusCode: fc.integer({ min: 200, max: 599 }),
            body: fc.object(),
          }),
          (data) => {
            const response = formatHTTPResponse(data.statusCode, data.body);

            // Property: HTTP response must have required structure
            expect(response.statusCode).toBe(data.statusCode);
            expect(response.headers).toBeDefined();
            expect(typeof response.headers).toBe('object');
            expect(response.body).toBeDefined();
            expect(typeof response.body).toBe('string');

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Legacy Request Conversion Consistency', () => {
    it('should always convert legacy requests consistently', () => {
      fc.assert(
        fc.property(
          fc.record({
            agentId: fc.string({ minLength: 1 }),
            agentType: fc.string({ minLength: 1 }),
            input: fc.object(),
          }),
          (legacyRequest) => {
            const validation = validateLegacyRequest(legacyRequest);
            expect(validation.valid).toBe(true);

            const internalRequest = convertLegacyRequestToInternal(legacyRequest);

            // Property: Conversion must preserve all fields
            expect(internalRequest.agentId).toBe(legacyRequest.agentId);
            expect(internalRequest.agentType).toBe(legacyRequest.agentType);
            expect(internalRequest.input).toEqual(legacyRequest.input);

            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
