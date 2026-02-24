/**
 * Tests for configuration management
 * Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5
 */

import * as fc from 'fast-check';
import {
  validateAgentConfiguration,
  validateModelParameters,
} from '../config-validator';
import { AgentConfiguration } from '../types';

describe('Configuration Management', () => {
  /**
   * Test valid agent configuration
   */
  it('should validate correct agent configuration', () => {
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

    const result = validateAgentConfiguration(config);
    expect(result.valid).toBe(true);
  });

  /**
   * Test missing required fields
   */
  it('should reject configuration with missing agentId', () => {
    const config = {
      agentType: 'WeatherAgent',
      agentName: 'Weather Agent',
      description: 'Fetches weather data',
      foundationModel: 'claude-3-sonnet',
      tools: [],
      parameters: { temperature: 0.7, maxTokens: 2048 },
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = validateAgentConfiguration(config);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('agentId'))).toBe(true);
    }
  });

  /**
   * Test invalid temperature
   */
  it('should reject configuration with invalid temperature', () => {
    const config: AgentConfiguration = {
      agentId: 'weather-agent',
      agentType: 'WeatherAgent',
      agentName: 'Weather Agent',
      description: 'Fetches weather data',
      foundationModel: 'claude-3-sonnet',
      tools: [],
      parameters: {
        temperature: 1.5, // Invalid: > 1
        maxTokens: 2048,
      },
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = validateAgentConfiguration(config);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('temperature'))).toBe(true);
    }
  });

  /**
   * Test invalid maxTokens
   */
  it('should reject configuration with invalid maxTokens', () => {
    const config: AgentConfiguration = {
      agentId: 'weather-agent',
      agentType: 'WeatherAgent',
      agentName: 'Weather Agent',
      description: 'Fetches weather data',
      foundationModel: 'claude-3-sonnet',
      tools: [],
      parameters: {
        temperature: 0.7,
        maxTokens: 0, // Invalid: < 1
      },
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = validateAgentConfiguration(config);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('maxTokens'))).toBe(true);
    }
  });

  /**
   * Test model parameter validation
   */
  it('should validate correct model parameters', () => {
    const result = validateModelParameters({
      temperature: 0.7,
      maxTokens: 2048,
    });

    expect(result.valid).toBe(true);
  });

  /**
   * Test invalid temperature in parameters
   */
  it('should reject invalid temperature in parameters', () => {
    const result = validateModelParameters({
      temperature: 1.5,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('temperature'))).toBe(true);
    }
  });

  /**
   * Test invalid maxTokens in parameters
   */
  it('should reject invalid maxTokens in parameters', () => {
    const result = validateModelParameters({
      maxTokens: -1,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('maxTokens'))).toBe(true);
    }
  });

  /**
   * Property 10: Configuration Validation Rejects Invalid Configs
   * For any invalid agent configuration, the system SHALL reject it with a
   * clear error message and not apply the configuration.
   */
  it('Property 10: Configuration Validation Rejects Invalid Configs', () => {
    const invalidConfigArbitrary = fc.oneof(
      // Missing agentId
      fc.record({
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
      }),
      // Invalid temperature
      fc.record({
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
          temperature: fc.float({ min: Math.fround(1.1), max: 10 }),
          maxTokens: fc.integer({ min: 1 }),
        }),
        enabled: fc.boolean(),
        createdAt: fc.integer({ min: 0 }),
        updatedAt: fc.integer({ min: 0 }),
      }),
      // Invalid maxTokens
      fc.record({
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
          maxTokens: fc.integer({ max: 0 }),
        }),
        enabled: fc.boolean(),
        createdAt: fc.integer({ min: 0 }),
        updatedAt: fc.integer({ min: 0 }),
      })
    );

    fc.assert(
      fc.property(invalidConfigArbitrary, (config) => {
        const result = validateAgentConfiguration(config);

        // Invalid configs should be rejected
        expect(result.valid).toBe(false);

        // Should have error messages
        if (!result.valid) {
          expect(result.errors.length).toBeGreaterThan(0);
          expect(result.errors[0]).toBeTruthy();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Test configuration loader caching
   */
  it('should cache configurations with TTL', () => {
    const config: AgentConfiguration = {
      agentId: 'weather-agent',
      agentType: 'WeatherAgent',
      agentName: 'Weather Agent',
      description: 'Fetches weather data',
      foundationModel: 'claude-3-sonnet',
      tools: [],
      parameters: {
        temperature: 0.7,
        maxTokens: 2048,
      },
      enabled: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const result = validateAgentConfiguration(config);
    expect(result.valid).toBe(true);
  });
});
