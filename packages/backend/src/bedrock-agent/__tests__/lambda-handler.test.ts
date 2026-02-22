/**
 * Tests for Lambda handler and request routing
 * Validates: Requirements 5.1, 5.3, 5.4, 8.1, 8.2, 8.3
 */

import * as fc from 'fast-check';
import { handleAgentExecution } from '../lambda-handler';
import { validateAgentExecutionRequest } from '../request-validator';
import {
  formatSuccessResponse,
  formatErrorResponse,
  formatHTTPResponse,
} from '../response-formatter';

describe('Lambda Handler', () => {
  beforeAll(() => {
    process.env.AWS_REGION = 'us-east-1';
  });

  /**
   * Test valid request processing
   */
  it('should process valid agent execution request', async () => {
    const request = {
      agentId: 'weather-agent',
      agentType: 'WeatherAgent',
      input: { location: 'Seattle' },
    };

    const response = await handleAgentExecution(JSON.stringify(request));

    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('executionId');
    expect(body).toHaveProperty('agentId');
    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('result');
    expect(body).toHaveProperty('metadata');
  });

  /**
   * Test invalid request rejection
   */
  it('should reject request with missing agentId', async () => {
    const request = {
      agentType: 'WeatherAgent',
      input: { location: 'Seattle' },
    };

    const response = await handleAgentExecution(JSON.stringify(request));

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error');
  });

  /**
   * Test invalid JSON handling
   */
  it('should handle invalid JSON in request body', async () => {
    const response = await handleAgentExecution('{ invalid json }');

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error');
  });

  /**
   * Test response formatting
   */
  it('should format successful response correctly', () => {
    const response = formatSuccessResponse(
      'exec-123',
      'agent-456',
      { result: 'success' },
      {
        startTime: '2024-01-01T00:00:00Z',
        endTime: '2024-01-01T00:00:01Z',
        duration: 1000,
        modelUsed: 'claude-3-sonnet',
      }
    );

    expect(response.executionId).toBe('exec-123');
    expect(response.agentId).toBe('agent-456');
    expect(response.status).toBe('success');
    expect(response.result).toEqual({ result: 'success' });
    expect(response.metadata.duration).toBe(1000);
  });

  /**
   * Test error response formatting
   */
  it('should format error response correctly', () => {
    const response = formatErrorResponse(
      'exec-123',
      'agent-456',
      'Something went wrong',
      'ERROR_CODE'
    );

    expect(response.executionId).toBe('exec-123');
    expect(response.agentId).toBe('agent-456');
    expect(response.status).toBe('failure');
    expect(response.error).toBe('Something went wrong');
    expect(response.result.errorCode).toBe('ERROR_CODE');
  });

  /**
   * Test HTTP response formatting
   */
  it('should format HTTP response correctly', () => {
    const response = formatHTTPResponse(200, { message: 'success' });

    expect(response.statusCode).toBe(200);
    expect(response.headers['Content-Type']).toBe('application/json');
    expect(response.body).toBe(JSON.stringify({ message: 'success' }));
  });

  /**
   * Property 6: Backward Compatibility Response Format
   * For any agent execution request in legacy format, the system SHALL return
   * a response in legacy format matching the original API contract.
   */
  it('Property 6: Backward Compatibility Response Format', async () => {
    const requestArbitrary = fc.record({
      agentId: fc.string({ minLength: 1 }),
      agentType: fc.string({ minLength: 1 }),
      input: fc.dictionary(fc.string(), fc.anything()),
      parameters: fc.option(
        fc.record({
          model: fc.option(fc.string()),
          temperature: fc.option(fc.float({ min: 0, max: 1 })),
          maxTokens: fc.option(fc.integer({ min: 1, max: 10000 })),
        })
      ),
    });

    await fc.assert(
      fc.asyncProperty(requestArbitrary, async (request) => {
        const response = await handleAgentExecution(JSON.stringify(request));

        // Verify HTTP response format
        expect(response).toHaveProperty('statusCode');
        expect(response).toHaveProperty('headers');
        expect(response).toHaveProperty('body');

        // Verify response is valid JSON
        const body = JSON.parse(response.body);

        // Verify legacy response format
        expect(body).toHaveProperty('executionId');
        expect(body).toHaveProperty('agentId');
        expect(body).toHaveProperty('status');
        expect(body).toHaveProperty('result');
        expect(body).toHaveProperty('metadata');

        // Verify status is one of the valid values
        expect(['success', 'failure', 'partial']).toContain(body.status);

        // Verify metadata has required fields
        expect(body.metadata).toHaveProperty('startTime');
        expect(body.metadata).toHaveProperty('endTime');
        expect(body.metadata).toHaveProperty('duration');
        expect(body.metadata).toHaveProperty('modelUsed');
      }),
      { numRuns: 50 }
    );
  });
});

describe('Request Validator', () => {
  /**
   * Test valid request validation
   */
  it('should validate correct request', () => {
    const request = {
      agentId: 'weather-agent',
      agentType: 'WeatherAgent',
      input: { location: 'Seattle' },
    };

    const result = validateAgentExecutionRequest(request);
    expect(result.valid).toBe(true);
  });

  /**
   * Test missing required fields
   */
  it('should reject request with missing agentId', () => {
    const request = {
      agentType: 'WeatherAgent',
      input: { location: 'Seattle' },
    };

    const result = validateAgentExecutionRequest(request);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.field === 'agentId')).toBe(true);
    }
  });

  /**
   * Test invalid parameter types
   */
  it('should reject request with invalid temperature', () => {
    const request = {
      agentId: 'weather-agent',
      agentType: 'WeatherAgent',
      input: { location: 'Seattle' },
      parameters: {
        temperature: 1.5, // Invalid: > 1
      },
    };

    const result = validateAgentExecutionRequest(request);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(
        result.errors.some((e) => e.field === 'parameters.temperature')
      ).toBe(true);
    }
  });

  /**
   * Test valid optional parameters
   */
  it('should accept valid optional parameters', () => {
    const request = {
      agentId: 'weather-agent',
      agentType: 'WeatherAgent',
      input: { location: 'Seattle' },
      parameters: {
        model: 'claude-3-sonnet',
        temperature: 0.7,
        maxTokens: 2048,
      },
    };

    const result = validateAgentExecutionRequest(request);
    expect(result.valid).toBe(true);
  });
});
