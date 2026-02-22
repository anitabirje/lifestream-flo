/**
 * Configuration validator for agent definitions
 * Validates: Requirements 12.5
 */

import { AgentConfiguration, ConfigurationError } from './types';

/**
 * Validate agent configuration
 */
export function validateAgentConfiguration(
  config: unknown
): { valid: true; config: AgentConfiguration } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    errors.push('Configuration must be an object');
    return { valid: false, errors };
  }

  const cfg = config as Record<string, unknown>;

  // Validate required fields
  if (!cfg.agentId || typeof cfg.agentId !== 'string') {
    errors.push('agentId is required and must be a string');
  }

  if (!cfg.agentType || typeof cfg.agentType !== 'string') {
    errors.push('agentType is required and must be a string');
  }

  if (!cfg.agentName || typeof cfg.agentName !== 'string') {
    errors.push('agentName is required and must be a string');
  }

  if (!cfg.description || typeof cfg.description !== 'string') {
    errors.push('description is required and must be a string');
  }

  if (!cfg.foundationModel || typeof cfg.foundationModel !== 'string') {
    errors.push('foundationModel is required and must be a string');
  }

  // Validate tools array
  if (!Array.isArray(cfg.tools)) {
    errors.push('tools is required and must be an array');
  } else {
    cfg.tools.forEach((tool, index) => {
      if (typeof tool !== 'object' || tool === null) {
        errors.push(`tools[${index}] must be an object`);
        return;
      }

      const t = tool as Record<string, unknown>;
      if (!t.toolName || typeof t.toolName !== 'string') {
        errors.push(`tools[${index}].toolName is required and must be a string`);
      }

      if (!t.description || typeof t.description !== 'string') {
        errors.push(`tools[${index}].description is required and must be a string`);
      }

      if (!t.lambdaArn || typeof t.lambdaArn !== 'string') {
        errors.push(`tools[${index}].lambdaArn is required and must be a string`);
      }
    });
  }

  // Validate parameters
  if (!cfg.parameters || typeof cfg.parameters !== 'object') {
    errors.push('parameters is required and must be an object');
  } else {
    const params = cfg.parameters as Record<string, unknown>;

    if (typeof params.temperature !== 'number') {
      errors.push('parameters.temperature is required and must be a number');
    } else if (params.temperature < 0 || params.temperature > 1) {
      errors.push('parameters.temperature must be between 0 and 1');
    }

    if (!Number.isInteger(params.maxTokens)) {
      errors.push('parameters.maxTokens is required and must be an integer');
    } else if ((params.maxTokens as number) < 1) {
      errors.push('parameters.maxTokens must be at least 1');
    }
  }

  // Validate enabled flag
  if (typeof cfg.enabled !== 'boolean') {
    errors.push('enabled is required and must be a boolean');
  }

  // Validate timestamps
  if (!Number.isInteger(cfg.createdAt)) {
    errors.push('createdAt is required and must be an integer');
  }

  if (!Number.isInteger(cfg.updatedAt)) {
    errors.push('updatedAt is required and must be an integer');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, config: cfg as unknown as AgentConfiguration };
}

/**
 * Validate model parameters
 */
export function validateModelParameters(params: {
  temperature?: number;
  maxTokens?: number;
}): { valid: true } | { valid: false; errors: string[] } {
  const errors: string[] = [];

  if (params.temperature !== undefined) {
    if (typeof params.temperature !== 'number') {
      errors.push('temperature must be a number');
    } else if (params.temperature < 0 || params.temperature > 1) {
      errors.push('temperature must be between 0 and 1');
    }
  }

  if (params.maxTokens !== undefined) {
    if (!Number.isInteger(params.maxTokens)) {
      errors.push('maxTokens must be an integer');
    } else if (params.maxTokens < 1) {
      errors.push('maxTokens must be at least 1');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
