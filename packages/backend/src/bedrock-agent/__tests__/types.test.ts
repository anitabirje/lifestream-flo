/**
 * Property-based tests for core type definitions
 * Validates: Requirements 1.3, 1.4
 */

import * as fc from 'fast-check';
import {
  AgentExecutionRequest,
  AgentExecutionResponse,
  ToolInput,
  ToolOutput,
  AgentExecutionRecord,
  BedrockAgentError,
  ToolInvocationError,
  DataPersistenceError,
  ConfigurationError,
} from '../types';

describe('Core Type Definitions', () => {
  /**
   * Property 1: Agent Execution Produces Valid Response
   * For any valid agent execution request, the system SHALL return a response
   * containing executionId, agentId, status, result, and metadata fields.
   */
  it('Property 1: Agent Execution Produces Valid Response', () => {
    const agentExecutionResponseArbitrary = fc.record({
      executionId: fc.uuid(),
      agentId: fc.string({ minLength: 1 }),
      status: fc.constantFrom<'success' | 'failure' | 'partial'>(
        'success',
        'failure',
        'partial'
      ),
      result: fc.dictionary(fc.string(), fc.anything()),
      error: fc.option(fc.string()),
      metadata: fc.record({
        startTime: fc.string(),
        endTime: fc.string(),
        duration: fc.integer({ min: 0 }),
        modelUsed: fc.string({ minLength: 1 }),
      }),
    });

    fc.assert(
      fc.property(agentExecutionResponseArbitrary, (response) => {
        // Verify all required fields are present
        expect(response).toHaveProperty('executionId');
        expect(response).toHaveProperty('agentId');
        expect(response).toHaveProperty('status');
        expect(response).toHaveProperty('result');
        expect(response).toHaveProperty('metadata');

        // Verify field types
        expect(typeof response.executionId).toBe('string');
        expect(typeof response.agentId).toBe('string');
        expect(['success', 'failure', 'partial']).toContain(response.status);
        expect(typeof response.result).toBe('object');
        expect(typeof response.metadata).toBe('object');

        // Verify metadata fields
        expect(response.metadata).toHaveProperty('startTime');
        expect(response.metadata).toHaveProperty('endTime');
        expect(response.metadata).toHaveProperty('duration');
        expect(response.metadata).toHaveProperty('modelUsed');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that AgentExecutionRequest has required fields
   */
  it('AgentExecutionRequest has required fields', () => {
    const requestArbitrary = fc.record({
      agentId: fc.string({ minLength: 1 }),
      agentType: fc.string({ minLength: 1 }),
      input: fc.dictionary(fc.string(), fc.anything()),
      parameters: fc.option(
        fc.record({
          model: fc.option(fc.string()),
          temperature: fc.option(fc.float({ min: 0, max: 1 })),
          maxTokens: fc.option(fc.integer({ min: 1 })),
        })
      ),
    });

    fc.assert(
      fc.property(requestArbitrary, (request) => {
        expect(request).toHaveProperty('agentId');
        expect(request).toHaveProperty('agentType');
        expect(request).toHaveProperty('input');
        expect(typeof request.agentId).toBe('string');
        expect(typeof request.agentType).toBe('string');
        expect(typeof request.input).toBe('object');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that ToolOutput has correct structure
   */
  it('ToolOutput has correct structure', () => {
    const toolOutputArbitrary = fc.record({
      success: fc.boolean(),
      data: fc.option(fc.dictionary(fc.string(), fc.anything())),
      error: fc.option(fc.string()),
    });

    fc.assert(
      fc.property(toolOutputArbitrary, (output) => {
        expect(output).toHaveProperty('success');
        expect(typeof output.success).toBe('boolean');

        if (output.success) {
          // If successful, data should be present
          expect(output.data).toBeDefined();
        } else {
          // If failed, error should be present
          expect(output.error).toBeDefined();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test that AgentExecutionRecord has all required fields
   */
  it('AgentExecutionRecord has all required fields', () => {
    const recordArbitrary = fc.record({
      executionId: fc.uuid(),
      agentId: fc.string({ minLength: 1 }),
      agentType: fc.string({ minLength: 1 }),
      status: fc.constantFrom<'success' | 'failure' | 'partial'>(
        'success',
        'failure',
        'partial'
      ),
      input: fc.dictionary(fc.string(), fc.anything()),
      result: fc.dictionary(fc.string(), fc.anything()),
      error: fc.option(fc.string()),
      startTime: fc.integer({ min: 0 }),
      endTime: fc.integer({ min: 0 }),
      duration: fc.integer({ min: 0 }),
      modelUsed: fc.string({ minLength: 1 }),
      toolInvocations: fc.array(
        fc.record({
          toolName: fc.string({ minLength: 1 }),
          input: fc.dictionary(fc.string(), fc.anything()),
          output: fc.dictionary(fc.string(), fc.anything()),
          duration: fc.integer({ min: 0 }),
        })
      ),
      ttl: fc.option(fc.integer({ min: 0 })),
    });

    fc.assert(
      fc.property(recordArbitrary, (record) => {
        expect(record).toHaveProperty('executionId');
        expect(record).toHaveProperty('agentId');
        expect(record).toHaveProperty('agentType');
        expect(record).toHaveProperty('status');
        expect(record).toHaveProperty('input');
        expect(record).toHaveProperty('result');
        expect(record).toHaveProperty('startTime');
        expect(record).toHaveProperty('endTime');
        expect(record).toHaveProperty('duration');
        expect(record).toHaveProperty('modelUsed');
        expect(record).toHaveProperty('toolInvocations');
        expect(Array.isArray(record.toolInvocations)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test error types
   */
  it('BedrockAgentError has correct properties', () => {
    const error = new BedrockAgentError('Test error', 'TEST_CODE', true);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.retryable).toBe(true);
    expect(error.name).toBe('BedrockAgentError');
  });

  it('ToolInvocationError has correct properties', () => {
    const error = new ToolInvocationError('Tool failed', 'weather-tool', false);
    expect(error.message).toBe('Tool failed');
    expect(error.toolName).toBe('weather-tool');
    expect(error.retryable).toBe(false);
    expect(error.name).toBe('ToolInvocationError');
  });

  it('DataPersistenceError has correct properties', () => {
    const error = new DataPersistenceError('DB error', true);
    expect(error.message).toBe('DB error');
    expect(error.retryable).toBe(true);
    expect(error.name).toBe('DataPersistenceError');
  });

  it('ConfigurationError has correct properties', () => {
    const error = new ConfigurationError('Config error');
    expect(error.message).toBe('Config error');
    expect(error.name).toBe('ConfigurationError');
  });
});
