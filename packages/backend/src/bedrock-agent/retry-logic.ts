/**
 * Retry logic with exponential backoff
 * Validates: Requirements 2.5, 11.2
 */

import { BedrockAgentError, ToolInvocationError, DataPersistenceError } from './types';
import { createLogger } from './logger';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_INITIAL_DELAY_MS = 100;
const DEFAULT_MAX_DELAY_MS = 10000;

/**
 * Retry function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const logger = createLogger();
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const initialDelayMs = options.initialDelayMs ?? DEFAULT_INITIAL_DELAY_MS;
  const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      logger.debug('Attempting operation', { attempt: attempt + 1, maxRetries });
      return await fn();
    } catch (error) {
      const err = error as any;
      const isRetryable =
        err.retryable ||
        err instanceof DataPersistenceError ||
        (err instanceof BedrockAgentError && err.retryable) ||
        (err instanceof ToolInvocationError && err.retryable);

      if (!isRetryable || attempt === maxRetries - 1) {
        logger.error('Operation failed and will not be retried', error as Error, {
          attempt: attempt + 1,
          maxRetries,
          retryable: isRetryable,
        });
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(2, attempt),
        maxDelayMs
      );

      logger.warn('Operation failed, retrying with backoff', {
        attempt: attempt + 1,
        maxRetries,
        delayMs: delay,
        error: (error as Error).message,
      });

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error('Retry logic exhausted');
}

/**
 * Retry Bedrock operations
 */
export async function retryBedrockOperation<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries,
    initialDelayMs: 100,
    maxDelayMs: 5000,
  });
}

/**
 * Retry tool operations
 */
export async function retryToolOperation<T>(
  fn: () => Promise<T>,
  maxRetries: number = 2
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries,
    initialDelayMs: 50,
    maxDelayMs: 2000,
  });
}

/**
 * Retry data operations
 */
export async function retryDataOperation<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  return retryWithBackoff(fn, {
    maxRetries,
    initialDelayMs: 100,
    maxDelayMs: 5000,
  });
}
