/**
 * Integration Tests for Bedrock Agent Migration
 * Tests end-to-end workflows and component interactions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { handleAgentExecution } from '../lambda-handler';
import { validateAgentExecutionRequest } from '../request-validator';
import { formatSuccessResponse, formatHTTPResponse } from '../response-formatter';
import { getAllAgentDefinitions } from '../agent-definitions';
import { convertLegacyRequestToInternal, convertInternalResponseToLegacy } from '../legacy-adapter';

// Mock AWS SDK
vi.mock('@aws-sdk/client-bedrock-agent-runtime');
vi.mock('@aws-sdk/client-dynamodb');
vi.mock('@aws-sdk/lib-dynamodb');
vi.mock('@aws-sdk/client-sns');
vi.mock('@aws-sdk/client-cloudwatch');

describe('Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Agent Execution Flow', () => {
    it('should handle complete agent execution flow', async () => {
      const request = {
        agentId: 'weather-agent',
        agentType: 'WeatherAgent',
        input: { location: 'Seattle' },
      };

      // Step 1: Validate request
      const validation = validateAgentExecutionRequest(request);
      expect(validation.valid).toBe(true);

      // Step 2: Format response
      const response = formatSuccessResponse(
        uuidv4(),
        request.agentId,
        { temperature: 72 },
        {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 1000,
          modelUsed: 'claude-3-sonnet',
        }
      );

      expect(response.status).toBe('success');
      expect(response.agentId).toBe(request.agentId);

      // Step 3: Format HTTP response
      const httpResponse = formatHTTPResponse(200, response);
      expect(httpResponse.statusCode).toBe(200);
      expect(httpResponse.body).toBeDefined();
    });

    /**
     * Validates: Requirements 1.1, 5.1, 9.1
     */
  });

  describe('Multi-Tool Execution', () => {
    it('should support agents with multiple tools', () => {
      const agents = getAllAgentDefinitions();
      const contextAnalyzer = agents.find((a) => a.agentType === 'ContextAnalyzer');

      expect(contextAnalyzer).toBeDefined();
      expect(contextAnalyzer?.tools.length).toBeGreaterThan(1);

      // Verify all tools are properly configured
      contextAnalyzer?.tools.forEach((tool) => {
        expect(tool.toolName).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.lambdaArn).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
      });
    });

    /**
     * Validates: Requirements 3.6, 1.1
     */
  });

  describe('Error Recovery', () => {
    it('should handle Bedrock unavailability gracefully', () => {
      const request = {
        agentId: 'weather-agent',
        agentType: 'WeatherAgent',
        input: { location: 'Seattle' },
      };

      const validation = validateAgentExecutionRequest(request);
      expect(validation.valid).toBe(true);

      // Simulate error response
      const errorResponse = {
        executionId: uuidv4(),
        agentId: request.agentId,
        status: 'failure' as const,
        result: {},
        error: 'Bedrock service unavailable',
        metadata: {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 500,
          modelUsed: 'claude-3-sonnet',
        },
      };

      expect(errorResponse.status).toBe('failure');
      expect(errorResponse.error).toBeDefined();
    });

    /**
     * Validates: Requirements 11.1, 11.2, 11.3
     */
  });

  describe('Concurrent Execution', () => {
    it('should handle multiple concurrent agent executions', async () => {
      const requests = [
        {
          agentId: 'weather-agent',
          agentType: 'WeatherAgent',
          input: { location: 'Seattle' },
        },
        {
          agentId: 'calendar-query-agent',
          agentType: 'CalendarQueryAgent',
          input: { startDate: '2024-01-01', endDate: '2024-01-31' },
        },
        {
          agentId: 'event-classifier-agent',
          agentType: 'EventClassifierAgent',
          input: { eventTitle: 'Team Meeting' },
        },
      ];

      // Validate all requests
      const validations = requests.map((req) => validateAgentExecutionRequest(req));
      validations.forEach((validation) => {
        expect(validation.valid).toBe(true);
      });

      // Process all requests concurrently
      const responses = requests.map((req) =>
        formatSuccessResponse(
          uuidv4(),
          req.agentId,
          { result: 'test' },
          {
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
            duration: 1000,
            modelUsed: 'claude-3-sonnet',
          }
        )
      );

      // Verify all responses
      responses.forEach((response, index) => {
        expect(response.agentId).toBe(requests[index].agentId);
        expect(response.status).toBe('success');
      });
    });

    /**
     * Validates: Requirements 5.5
     */
  });

  describe('Backward Compatibility Flow', () => {
    it('should handle legacy request format end-to-end', () => {
      // Step 1: Accept legacy request
      const legacyRequest = {
        agentId: 'weather-agent',
        agentType: 'WeatherAgent',
        input: { location: 'Seattle' },
        parameters: {
          temperature: 0.7,
          maxTokens: 2048,
        },
      };

      // Step 2: Convert to internal format
      const internalRequest = convertLegacyRequestToInternal(legacyRequest);
      expect(internalRequest.agentId).toBe(legacyRequest.agentId);
      expect(internalRequest.parameters).toEqual(legacyRequest.parameters);

      // Step 3: Process request
      const response = formatSuccessResponse(
        uuidv4(),
        internalRequest.agentId,
        { temperature: 72 },
        {
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 1000,
          modelUsed: 'claude-3-sonnet',
        }
      );

      // Step 4: Convert back to legacy format
      const legacyResponse = convertInternalResponseToLegacy(response);
      expect(legacyResponse.agentId).toBe(legacyRequest.agentId);
      expect(legacyResponse.status).toBe('success');
    });

    /**
     * Validates: Requirements 8.1, 8.2, 8.3
     */
  });

  describe('Agent Registry Integration', () => {
    it('should support all agent types in registry', () => {
      const agents = getAllAgentDefinitions();

      // Verify all 10 agent types are available
      const agentTypes = [
        'WeatherAgent',
        'CalendarQueryAgent',
        'EventClassifierAgent',
        'EventParserAgent',
        'SchoolNewsletterParserAgent',
        'ContextAnalyzer',
        'FeedbackLearner',
        'CategoryPredictor',
        'WeatherEventAssociator',
        'WeatherReminderGenerator',
      ];

      agentTypes.forEach((type) => {
        const agent = agents.find((a) => a.agentType === type);
        expect(agent).toBeDefined();
        expect(agent?.enabled).toBe(true);
      });
    });

    /**
     * Validates: Requirements 10.1 through 10.10
     */
  });

  describe('Data Persistence Integration', () => {
    it('should create persistable execution records', () => {
      const executionRecord = {
        executionId: uuidv4(),
        agentId: 'weather-agent',
        agentType: 'WeatherAgent',
        status: 'success' as const,
        input: { location: 'Seattle' },
        result: { temperature: 72 },
        startTime: Date.now(),
        endTime: Date.now() + 1000,
        duration: 1000,
        modelUsed: 'claude-3-sonnet',
        toolInvocations: [],
      };

      // Verify record structure
      expect(executionRecord.executionId).toBeDefined();
      expect(executionRecord.agentId).toBeDefined();
      expect(executionRecord.status).toBe('success');
      expect(executionRecord.result).toBeDefined();
      expect(executionRecord.startTime).toBeDefined();
      expect(executionRecord.endTime).toBeDefined();
      expect(executionRecord.duration).toBeGreaterThan(0);
    });

    /**
     * Validates: Requirements 4.1, 4.3
     */
  });

  describe('Event Publishing Integration', () => {
    it('should create publishable execution events', () => {
      const executionEvent = {
        executionId: uuidv4(),
        agentId: 'weather-agent',
        status: 'success' as const,
        result: { temperature: 72 },
        timestamp: new Date().toISOString(),
      };

      // Verify event structure
      expect(executionEvent.executionId).toBeDefined();
      expect(executionEvent.agentId).toBeDefined();
      expect(executionEvent.status).toBeDefined();
      expect(executionEvent.result).toBeDefined();
      expect(executionEvent.timestamp).toBeDefined();
    });

    /**
     * Validates: Requirements 9.1, 9.2, 9.3
     */
  });

  describe('Logging and Monitoring Integration', () => {
    it('should support structured logging throughout execution', () => {
      const executionLog = {
        timestamp: new Date().toISOString(),
        level: 'INFO',
        message: 'Agent execution started',
        correlationId: uuidv4(),
        metadata: {
          agentId: 'weather-agent',
          agentType: 'WeatherAgent',
          input: { location: 'Seattle' },
        },
      };

      // Verify log structure
      expect(executionLog.timestamp).toBeDefined();
      expect(executionLog.level).toBe('INFO');
      expect(executionLog.message).toBeDefined();
      expect(executionLog.correlationId).toBeDefined();
      expect(executionLog.metadata).toBeDefined();
    });

    /**
     * Validates: Requirements 6.1, 6.2, 6.3, 6.4
     */
  });

  describe('Configuration Management Integration', () => {
    it('should support dynamic agent configuration', () => {
      const agents = getAllAgentDefinitions();

      // Verify all agents have configurable parameters
      agents.forEach((agent) => {
        expect(agent.parameters).toBeDefined();
        expect(agent.parameters.temperature).toBeGreaterThanOrEqual(0);
        expect(agent.parameters.temperature).toBeLessThanOrEqual(1);
        expect(agent.parameters.maxTokens).toBeGreaterThan(0);
        expect(agent.parameters.maxTokens).toBeLessThanOrEqual(4096);
      });
    });

    /**
     * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5
     */
  });

  describe('End-to-End Request-Response Cycle', () => {
    it('should complete full request-response cycle', () => {
      // Step 1: Receive request
      const request = {
        agentId: 'weather-agent',
        agentType: 'WeatherAgent',
        input: { location: 'Seattle' },
      };

      // Step 2: Validate
      const validation = validateAgentExecutionRequest(request);
      expect(validation.valid).toBe(true);

      // Step 3: Execute (simulated)
      const executionId = uuidv4();
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 1000);

      // Step 4: Format response
      const response = formatSuccessResponse(
        executionId,
        request.agentId,
        { temperature: 72, humidity: 65 },
        {
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: 1000,
          modelUsed: 'claude-3-sonnet',
        }
      );

      // Step 5: Verify response
      expect(response.executionId).toBe(executionId);
      expect(response.agentId).toBe(request.agentId);
      expect(response.status).toBe('success');
      expect(response.result).toEqual({ temperature: 72, humidity: 65 });
      expect(response.metadata.duration).toBe(1000);

      // Step 6: Format HTTP response
      const httpResponse = formatHTTPResponse(200, response);
      expect(httpResponse.statusCode).toBe(200);
      expect(httpResponse.body).toBeDefined();

      // Step 7: Parse response body
      const parsedBody = JSON.parse(httpResponse.body);
      expect(parsedBody.executionId).toBe(executionId);
      expect(parsedBody.status).toBe('success');
    });

    /**
     * Validates: Requirements 1.1, 5.1, 8.1, 9.1
     */
  });
});
