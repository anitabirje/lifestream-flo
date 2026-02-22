/**
 * Bedrock Agent action builder
 * Validates: Requirements 1.1, 2.1, 2.2, 2.3
 */

import { AgentExecutionRequest, AgentConfiguration } from './types';
import { createLogger } from './logger';

/**
 * Build agent action request for Bedrock
 */
export function buildAgentAction(
  request: AgentExecutionRequest,
  config: AgentConfiguration
): Record<string, unknown> {
  const logger = createLogger();

  logger.debug('Building agent action', {
    agentId: request.agentId,
    agentType: request.agentType,
  });

  // Extract parameters with defaults
  const temperature = request.parameters?.temperature ?? config.parameters.temperature;
  const maxTokens = request.parameters?.maxTokens ?? config.parameters.maxTokens;
  const model = request.parameters?.model ?? config.foundationModel;

  // Build tool definitions
  const tools = config.tools.map((tool) => ({
    name: tool.toolName,
    description: tool.description,
    inputSchema: {
      type: 'object',
      properties: {
        // Tool-specific properties would be defined here
        input: {
          type: 'object',
          description: 'Tool input parameters',
        },
      },
      required: ['input'],
    },
  }));

  // Build the agent action
  const action = {
    agentId: config.agentId,
    agentAliasId: 'TSTALIASID', // Test alias ID
    sessionId: request.input.sessionId || `session-${Date.now()}`,
    inputText: JSON.stringify(request.input),
    enableTrace: true,
    sessionState: {
      sessionAttributes: {
        agentType: request.agentType,
        model: model,
        temperature: String(temperature),
        maxTokens: String(maxTokens),
      },
    },
  };

  logger.debug('Agent action built', {
    agentId: request.agentId,
    model,
    temperature,
    maxTokens,
    toolCount: tools.length,
  });

  return action;
}

/**
 * Validate agent action
 */
export function validateAgentAction(
  action: Record<string, unknown>
): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!action.agentId || typeof action.agentId !== 'string') {
    errors.push('agentId is required');
  }

  if (!action.inputText || typeof action.inputText !== 'string') {
    errors.push('inputText is required');
  }

  if (action.sessionState && typeof action.sessionState !== 'object') {
    errors.push('sessionState must be an object');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}

/**
 * Extract model parameters from action
 */
export function extractModelParameters(
  action: Record<string, unknown>
): { temperature: number; maxTokens: number; model: string } {
  const sessionState = action.sessionState as Record<string, any>;
  const sessionAttributes = sessionState?.sessionAttributes || {};

  return {
    temperature: parseFloat(sessionAttributes.temperature || '0.7'),
    maxTokens: parseInt(sessionAttributes.maxTokens || '2048', 10),
    model: sessionAttributes.model || 'claude-3-sonnet',
  };
}

/**
 * Parse Bedrock Agent response
 */
export function parseBedrockResponse(
  response: Record<string, unknown>
): Record<string, unknown> {
  try {
    const output = response.output as string;

    // Try to parse as JSON
    try {
      return JSON.parse(output);
    } catch {
      // If not JSON, return as text
      return { text: output };
    }
  } catch (error) {
    return { error: 'Failed to parse response' };
  }
}

/**
 * Validate Bedrock response
 */
export function validateBedrockResponse(
  response: Record<string, unknown>
): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!response.sessionId || typeof response.sessionId !== 'string') {
    errors.push('sessionId is required in response');
  }

  if (!response.output) {
    errors.push('output is required in response');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
