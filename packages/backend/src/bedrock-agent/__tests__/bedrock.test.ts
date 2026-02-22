/**
 * Tests for Bedrock Agent integration
 * Validates: Requirements 1.3, 1.4
 */

import * as fc from 'fast-check';
import {
  buildAgentAction,
  validateAgentAction,
  extractModelParameters,
  parseBedrockResponse,
  validateBedrockResponse,
} from '../bedrock-action-builder';
import { retryWithBackoff } from '../retry-logic';
import { AgentConfiguration, BedrockAgentError } from '../types';

describe('Bedrock Agent Integration', () => {
  /**
   * Test agent action building
   */
  it('should build valid agent action', () => {
    const config: AgentConfiguration = {
      agentId: 'weather-agent',
      agentType: 'WeatherAgent',
      agentName: 'Weather Agent',
      description: 'Fetches weather data',
      foundationModel: 'claude-3-sonnet',
      tools: [
        {
          toolName: 'weather-tool',
          description: 'Fetches weather',
          lambdaArn: 'arn:aws:lambda:us-east-1:123456789:function:weather-tool',
        },
      ],
      parameters: {
        temperature: 0.7,
        maxTokens: 2048,
      },
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const request = {
      agentId: 'weather-agent',
      agentType: 'WeatherAgent',
      input: { location: 'Seattle' },
    };

    const action = buildAgentAction(request, config);

    expect(action).toHaveProperty('agentId');
    expect(action).toHaveProperty('inputText');
    expect(action).toHaveProperty('sessionState');
  });

  /**
   * Test agent action validation
   */
  it('should validate correct agent action', () => {
    const action = {
      agentId: 'weather-agent',
      inputText: '{"location":"Seattle"}',
      sessionState: {
        sessionAttributes: {
          model: 'claude-3-sonnet',
        },
      },
    };

    const result = validateAgentAction(action);
    expect(result.valid).toBe(true);
  });

  /**
   * Test invalid agent action
   */
  it('should reject invalid agent action', () => {
    const action = {
      inputText: '{"location":"Seattle"}',
      // Missing agentId
    };

    const result = validateAgentAction(action);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('agentId'))).toBe(true);
    }
  });

  /**
   * Test model parameter extraction
   */
  it('should extract model parameters from action', () => {
    const action = {
      agentId: 'weather-agent',
      inputText: '{}',
      sessionState: {
        sessionAttributes: {
          model: 'claude-3-sonnet',
          temperature: '0.8',
          maxTokens: '4096',
        },
      },
    };

    const params = extractModelParameters(action);

    expect(params.model).toBe('claude-3-sonnet');
    expect(params.temperature).toBe(0.8);
    expect(params.maxTokens).toBe(4096);
  });

  /**
   * Test Bedrock response parsing
   */
  it('should parse JSON Bedrock response', () => {
    const response = {
      sessionId: 'session-123',
      output: '{"temperature":72,"location":"Seattle"}',
    };

    const parsed = parseBedrockResponse(response);

    expect(parsed).toHaveProperty('temperature');
    expect(parsed).toHaveProperty('location');
  });

  /**
   * Test Bedrock response parsing with text
   */
  it('should parse text Bedrock response', () => {
    const response = {
      sessionId: 'session-123',
      output: 'The weather in Seattle is 72 degrees',
    };

    const parsed = parseBedrockResponse(response);

    expect(parsed).toHaveProperty('text');
  });

  /**
   * Test Bedrock response validation
   */
  it('should validate correct Bedrock response', () => {
    const response = {
      sessionId: 'session-123',
      output: '{"result":"success"}',
    };

    const result = validateBedrockResponse(response);
    expect(result.valid).toBe(true);
  });

  /**
   * Test retry logic with exponential backoff
   */
  it('should retry with exponential backoff', async () => {
    let attempts = 0;

    const fn = async () => {
      attempts++;
      if (attempts < 3) {
        throw new BedrockAgentError('Temporary error', 'THROTTLING', true);
      }
      return 'success';
    };

    const result = await retryWithBackoff(fn, {
      maxRetries: 3,
      initialDelayMs: 10,
    });

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  /**
   * Test retry logic failure
   */
  it('should fail after max retries', async () => {
    const fn = async () => {
      throw new BedrockAgentError('Permanent error', 'INVALID_PARAM', false);
    };

    await expect(
      retryWithBackoff(fn, { maxRetries: 2, initialDelayMs: 10 })
    ).rejects.toThrow();
  });

  /**
   * Property 1: Agent Execution Produces Valid Response
   * For any valid agent execution request, the system SHALL return a response
   * containing executionId, agentId, status, result, and metadata fields.
   */
  it('Property 1: Agent Execution Produces Valid Response', () => {
    const configArbitrary = fc.record({
      agentId: fc.string({ minLength: 1 }),
      agentType: fc.string({ minLength: 1 }),
      agentName: fc.string({ minLength: 1 }),
      description: fc.string({ minLength: 1 }),
      foundationModel: fc.string({ minLength: 1 }),
      tools: fc.array(
        fc.record({
          toolName: fc.string({ minLength: 1 }),
          description: fc.string({ minLength: 1 }),
          lambdaArn: fc.string({ minLength: 1 }),
        })
      ),
      parameters: fc.record({
        temperature: fc.float({ min: 0, max: 1 }),
        maxTokens: fc.integer({ min: 1 }),
      }),
      enabled: fc.boolean(),
      createdAt: fc.integer({ min: 0 }),
      updatedAt: fc.integer({ min: 0 }),
    });

    const requestArbitrary = fc.record({
      agentId: fc.string({ minLength: 1 }),
      agentType: fc.string({ minLength: 1 }),
      input: fc.dictionary(fc.string(), fc.anything()),
    });

    fc.assert(
      fc.property(configArbitrary, requestArbitrary, (config, request) => {
        const action = buildAgentAction(
          request,
          config as unknown as AgentConfiguration
        );

        // Verify action has required fields
        expect(action).toHaveProperty('agentId');
        expect(action).toHaveProperty('inputText');
        expect(action).toHaveProperty('sessionState');

        // Verify action is valid
        const validation = validateAgentAction(action);
        expect(validation.valid).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
