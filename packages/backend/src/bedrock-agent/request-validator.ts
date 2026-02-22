/**
 * Agent request validator
 * Validates: Requirements 5.1
 */

import { AgentExecutionRequest } from './types';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate agent execution request
 */
export function validateAgentExecutionRequest(
  request: unknown
): { valid: true } | { valid: false; errors: ValidationError[] } {
  const errors: ValidationError[] = [];

  if (!request || typeof request !== 'object') {
    errors.push({
      field: 'root',
      message: 'Request must be an object',
    });
    return { valid: false, errors };
  }

  const req = request as Record<string, unknown>;

  // Validate required fields
  if (typeof req.agentId !== 'string') {
    errors.push({
      field: 'agentId',
      message: 'agentId is required and must be a string',
    });
  }

  if (typeof req.agentType !== 'string') {
    errors.push({
      field: 'agentType',
      message: 'agentType is required and must be a string',
    });
  }

  if (!req.input || typeof req.input !== 'object') {
    errors.push({
      field: 'input',
      message: 'input is required and must be an object',
    });
  }

  // Validate optional parameters
  if (req.parameters !== undefined) {
    if (typeof req.parameters !== 'object' || req.parameters === null) {
      errors.push({
        field: 'parameters',
        message: 'parameters must be an object',
      });
    } else {
      const params = req.parameters as Record<string, unknown>;

      if (params.model !== undefined && typeof params.model !== 'string') {
        errors.push({
          field: 'parameters.model',
          message: 'model must be a string',
        });
      }

      if (params.temperature !== undefined) {
        if (typeof params.temperature !== 'number') {
          errors.push({
            field: 'parameters.temperature',
            message: 'temperature must be a number',
          });
        } else if (params.temperature < 0 || params.temperature > 1) {
          errors.push({
            field: 'parameters.temperature',
            message: 'temperature must be between 0 and 1',
          });
        }
      }

      if (params.maxTokens !== undefined) {
        if (!Number.isInteger(params.maxTokens)) {
          errors.push({
            field: 'parameters.maxTokens',
            message: 'maxTokens must be an integer',
          });
        } else if ((params.maxTokens as number) < 1) {
          errors.push({
            field: 'parameters.maxTokens',
            message: 'maxTokens must be at least 1',
          });
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true };
}
