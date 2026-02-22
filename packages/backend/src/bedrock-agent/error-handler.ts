/**
 * Error handling for Bedrock Agent integration
 * Validates: Requirements 11.1, 11.2, 11.3, 11.4
 */

import { getLogger } from './logger';
import { BedrockAgentError, ToolInvocationError, DataPersistenceError } from './types';

const logger = getLogger();

/**
 * Error categories for different failure scenarios
 */
export enum ErrorCategory {
  BEDROCK_UNAVAILABLE = 'BEDROCK_UNAVAILABLE',
  RATE_LIMITING = 'RATE_LIMITING',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  TOOL_FAILURE = 'TOOL_FAILURE',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',
  DATA_PERSISTENCE = 'DATA_PERSISTENCE',
  CONFIGURATION = 'CONFIGURATION',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof BedrockAgentError) {
    return error.retryable;
  }
  if (error instanceof ToolInvocationError) {
    return error.retryable;
  }
  if (error instanceof DataPersistenceError) {
    return error.retryable;
  }

  // Check for AWS SDK errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const code = (error as any).code?.toLowerCase() || '';

    // Retryable AWS errors
    if (
      code === 'throttlingexception' ||
      code === 'requestlimitexceeded' ||
      code === 'serviceunvailable' ||
      code === 'internalservererror' ||
      message.includes('throttl') ||
      message.includes('rate limit') ||
      message.includes('timeout') ||
      message.includes('temporarily unavailable')
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Categorize an error for logging and handling
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (error instanceof BedrockAgentError) {
    if (error.code === 'MODEL_UNAVAILABLE') {
      return ErrorCategory.BEDROCK_UNAVAILABLE;
    }
    if (error.code === 'RATE_LIMIT') {
      return ErrorCategory.RATE_LIMITING;
    }
    if (error.code === 'INVALID_PARAMETERS') {
      return ErrorCategory.INVALID_PARAMETERS;
    }
  }

  if (error instanceof ToolInvocationError) {
    if (error.toolName.includes('timeout')) {
      return ErrorCategory.TOOL_TIMEOUT;
    }
    return ErrorCategory.TOOL_FAILURE;
  }

  if (error instanceof DataPersistenceError) {
    return ErrorCategory.DATA_PERSISTENCE;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    const code = (error as any).code?.toLowerCase() || '';

    if (code === 'throttlingexception' || message.includes('throttl')) {
      return ErrorCategory.RATE_LIMITING;
    }
    if (message.includes('unavailable') || message.includes('offline')) {
      return ErrorCategory.BEDROCK_UNAVAILABLE;
    }
    if (message.includes('timeout')) {
      return ErrorCategory.TOOL_TIMEOUT;
    }
  }

  return ErrorCategory.UNKNOWN;
}

/**
 * Get a user-friendly error message
 */
export function getUserFriendlyMessage(error: unknown, category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.BEDROCK_UNAVAILABLE:
      return 'The AI service is temporarily unavailable. Please try again in a few moments.';
    case ErrorCategory.RATE_LIMITING:
      return 'Too many requests. Please wait a moment and try again.';
    case ErrorCategory.INVALID_PARAMETERS:
      return 'Invalid request parameters. Please check your input and try again.';
    case ErrorCategory.TOOL_FAILURE:
      return 'A tool operation failed. Please try again.';
    case ErrorCategory.TOOL_TIMEOUT:
      return 'A tool operation timed out. Please try again.';
    case ErrorCategory.DATA_PERSISTENCE:
      return 'Failed to save data. Please try again.';
    case ErrorCategory.CONFIGURATION:
      return 'Configuration error. Please contact support.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Log an error with context
 */
export function logError(
  error: unknown,
  context: Record<string, unknown> = {}
): ErrorCategory {
  const category = categorizeError(error);
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  logger.error(`Error: ${category}`, error instanceof Error ? error : new Error(message), {
    category,
    message,
    ...context,
  });

  return category;
}

/**
 * Handle Bedrock-specific errors
 */
export function handleBedrockError(error: unknown): BedrockAgentError {
  if (error instanceof BedrockAgentError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const code = (error as any).code || 'UNKNOWN';

  // Map AWS SDK error codes to our error codes
  let errorCode = 'BEDROCK_ERROR';
  let retryable = false;

  if (code === 'ThrottlingException' || code === 'RequestLimitExceeded') {
    errorCode = 'RATE_LIMIT';
    retryable = true;
  } else if (code === 'ServiceUnavailable' || code === 'InternalServerError') {
    errorCode = 'MODEL_UNAVAILABLE';
    retryable = true;
  } else if (code === 'ValidationException' || code === 'InvalidParameterException') {
    errorCode = 'INVALID_PARAMETERS';
    retryable = false;
  }

  return new BedrockAgentError(message, errorCode, retryable);
}

/**
 * Handle tool-specific errors
 */
export function handleToolError(toolName: string, error: unknown): ToolInvocationError {
  if (error instanceof ToolInvocationError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const retryable = isRetryableError(error);

  return new ToolInvocationError(message, toolName, retryable);
}

/**
 * Handle data persistence errors
 */
export function handleDataError(error: unknown): DataPersistenceError {
  if (error instanceof DataPersistenceError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);
  const retryable = isRetryableError(error);

  return new DataPersistenceError(message, retryable);
}

/**
 * Create a fallback response when service is unavailable
 */
export function createFallbackResponse(
  executionId: string,
  agentId: string,
  error: unknown
): Record<string, unknown> {
  const category = categorizeError(error);
  const userMessage = getUserFriendlyMessage(error, category);

  return {
    executionId,
    agentId,
    status: 'failure',
    result: {
      fallback: true,
      reason: category,
    },
    error: userMessage,
    metadata: {
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      duration: 0,
      modelUsed: 'fallback',
    },
  };
}
