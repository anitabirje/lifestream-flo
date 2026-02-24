/**
 * Response formatter for backward compatibility
 * Validates: Requirements 8.1, 8.2, 8.3
 */

import { AgentExecutionResponse } from './types';

/**
 * Format successful response
 */
export function formatSuccessResponse(
  executionId: string,
  agentId: string,
  result: Record<string, unknown>,
  metadata: {
    startTime: string;
    endTime: string;
    duration: number;
    modelUsed: string;
  }
): AgentExecutionResponse {
  return {
    executionId,
    agentId,
    status: 'success',
    result,
    metadata,
  };
}

/**
 * Format error response
 */
export function formatErrorResponse(
  executionId: string,
  agentId: string,
  error: string,
  errorCode?: string
): AgentExecutionResponse {
  return {
    executionId,
    agentId,
    status: 'failure',
    result: {
      errorCode: errorCode || 'UNKNOWN_ERROR',
    },
    error,
    metadata: {
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 0,
      modelUsed: 'unknown',
    },
  };
}

/**
 * Format partial response (when some tools succeeded but others failed)
 */
export function formatPartialResponse(
  executionId: string,
  agentId: string,
  result: Record<string, unknown>,
  error: string,
  metadata: {
    startTime: string;
    endTime: string;
    duration: number;
    modelUsed: string;
  }
): AgentExecutionResponse {
  return {
    executionId,
    agentId,
    status: 'partial',
    result,
    error,
    metadata,
  };
}

/**
 * Format HTTP response for Lambda
 */
export function formatHTTPResponse(
  statusCode: number,
  body: Record<string, unknown> | string
): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  };
}

/**
 * Format error HTTP response
 */
export function formatErrorHTTPResponse(
  statusCode: number,
  message: string,
  errorCode?: string
): {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
} {
  return formatHTTPResponse(statusCode, {
    error: message,
    errorCode: errorCode || 'UNKNOWN_ERROR',
  });
}
