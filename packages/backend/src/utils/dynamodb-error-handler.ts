/**
 * DynamoDB Error Handler
 * Specialized error handling for DynamoDB operations
 * Handles throttling, conditional write failures, and other DynamoDB-specific errors
 */

import { errorHandler, ErrorCategory, ErrorSeverity } from './error-handler';

export enum DynamoDBErrorType {
  THROTTLING = 'THROTTLING',
  CONDITIONAL_CHECK_FAILED = 'CONDITIONAL_CHECK_FAILED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  ITEM_COLLECTION_SIZE_LIMIT = 'ITEM_COLLECTION_SIZE_LIMIT',
  TRANSACTION_CONFLICT = 'TRANSACTION_CONFLICT',
  UNKNOWN = 'UNKNOWN'
}

export interface DynamoDBErrorContext {
  operation: string;
  table?: string;
  key?: Record<string, any>;
  errorType: DynamoDBErrorType;
  retryable: boolean;
  suggestedRetryDelayMs?: number;
}

/**
 * Categorize DynamoDB error
 */
export function categorizeDynamoDBError(error: any): DynamoDBErrorType {
  const errorName = error?.name || '';
  const errorCode = error?.Code || '';
  const errorMessage = error?.message || '';

  if (
    errorName === 'ProvisionedThroughputExceededException' ||
    errorName === 'ThrottlingException' ||
    errorCode === 'ProvisionedThroughputExceededException' ||
    errorCode === 'ThrottlingException'
  ) {
    return DynamoDBErrorType.THROTTLING;
  }

  if (
    errorName === 'ConditionalCheckFailedException' ||
    errorCode === 'ConditionalCheckFailedException'
  ) {
    return DynamoDBErrorType.CONDITIONAL_CHECK_FAILED;
  }

  if (
    errorName === 'ValidationException' ||
    errorCode === 'ValidationException'
  ) {
    return DynamoDBErrorType.VALIDATION_ERROR;
  }

  if (
    errorName === 'ResourceNotFoundException' ||
    errorCode === 'ResourceNotFoundException'
  ) {
    return DynamoDBErrorType.RESOURCE_NOT_FOUND;
  }

  if (
    errorMessage.includes('Item collection size limit exceeded') ||
    errorCode === 'ItemCollectionSizeLimitExceededException'
  ) {
    return DynamoDBErrorType.ITEM_COLLECTION_SIZE_LIMIT;
  }

  if (
    errorName === 'TransactionConflictException' ||
    errorCode === 'TransactionConflictException'
  ) {
    return DynamoDBErrorType.TRANSACTION_CONFLICT;
  }

  return DynamoDBErrorType.UNKNOWN;
}

/**
 * Check if error is retryable
 */
export function isRetryableDynamoDBError(errorType: DynamoDBErrorType): boolean {
  const retryableErrors = [
    DynamoDBErrorType.THROTTLING,
    DynamoDBErrorType.TRANSACTION_CONFLICT
  ];

  return retryableErrors.includes(errorType);
}

/**
 * Get suggested retry delay for error
 */
export function getSuggestedRetryDelay(errorType: DynamoDBErrorType, attemptNumber: number): number {
  switch (errorType) {
    case DynamoDBErrorType.THROTTLING:
      // Exponential backoff for throttling
      return Math.min(100 * Math.pow(2, attemptNumber), 5000);
    case DynamoDBErrorType.TRANSACTION_CONFLICT:
      // Shorter backoff for transaction conflicts
      return Math.min(50 * Math.pow(2, attemptNumber), 2000);
    default:
      return 0;
  }
}

/**
 * Handle DynamoDB error with context
 */
export async function handleDynamoDBError(
  error: any,
  operation: string,
  context: Partial<DynamoDBErrorContext> = {}
): Promise<void> {
  const errorType = categorizeDynamoDBError(error);
  const isRetryable = isRetryableDynamoDBError(errorType);
  const suggestedRetryDelay = isRetryable ? getSuggestedRetryDelay(errorType, 0) : undefined;

  const fullContext = {
    operation,
    errorType,
    retryable: isRetryable,
    suggestedRetryDelayMs: suggestedRetryDelay,
    ...context
  };

  // Determine severity based on error type
  let severity = ErrorSeverity.MEDIUM;
  if (errorType === DynamoDBErrorType.VALIDATION_ERROR) {
    severity = ErrorSeverity.LOW;
  } else if (errorType === DynamoDBErrorType.RESOURCE_NOT_FOUND) {
    severity = ErrorSeverity.LOW;
  } else if (errorType === DynamoDBErrorType.ITEM_COLLECTION_SIZE_LIMIT) {
    severity = ErrorSeverity.HIGH;
  }

  // Log error
  await errorHandler.handleError(
    error,
    ErrorCategory.DATABASE_ERROR,
    severity,
    fullContext,
    getErrorMessage(errorType)
  );
}

/**
 * Get user-friendly error message for DynamoDB error type
 */
export function getErrorMessage(errorType: DynamoDBErrorType): string {
  const messages: Record<DynamoDBErrorType, string> = {
    [DynamoDBErrorType.THROTTLING]: 'Database is temporarily busy. Your request will be retried automatically.',
    [DynamoDBErrorType.CONDITIONAL_CHECK_FAILED]: 'Unable to update item due to a conflict. Please refresh and try again.',
    [DynamoDBErrorType.VALIDATION_ERROR]: 'Invalid data provided. Please check your input.',
    [DynamoDBErrorType.RESOURCE_NOT_FOUND]: 'Requested resource not found.',
    [DynamoDBErrorType.ITEM_COLLECTION_SIZE_LIMIT]: 'Item collection size limit exceeded. Please delete some items.',
    [DynamoDBErrorType.TRANSACTION_CONFLICT]: 'Transaction conflict detected. Your request will be retried.',
    [DynamoDBErrorType.UNKNOWN]: 'Database error occurred. Please try again later.'
  };

  return messages[errorType];
}

/**
 * Handle conditional write failure
 */
export async function handleConditionalWriteFailure(
  operation: string,
  key: Record<string, any>,
  reason: string
): Promise<void> {
  console.warn(`Conditional write failed for ${operation}:`, {
    key,
    reason
  });

  await errorHandler.handleError(
    new Error(`Conditional write failed: ${reason}`),
    ErrorCategory.DATABASE_ERROR,
    ErrorSeverity.MEDIUM,
    {
      operation,
      key,
      reason,
      errorType: DynamoDBErrorType.CONDITIONAL_CHECK_FAILED
    },
    'Unable to update item due to a conflict. Please refresh and try again.'
  );
}

/**
 * Handle throttling error
 */
export async function handleThrottlingError(
  operation: string,
  attemptNumber: number
): Promise<number> {
  const retryDelay = getSuggestedRetryDelay(DynamoDBErrorType.THROTTLING, attemptNumber);

  console.warn(`DynamoDB throttling detected for ${operation}. Retrying after ${retryDelay}ms`);

  await errorHandler.handleError(
    new Error('DynamoDB throttling'),
    ErrorCategory.DATABASE_ERROR,
    ErrorSeverity.MEDIUM,
    {
      operation,
      attemptNumber,
      retryDelayMs: retryDelay,
      errorType: DynamoDBErrorType.THROTTLING
    },
    'Database is temporarily busy. Your request will be retried automatically.'
  );

  return retryDelay;
}

/**
 * Validate DynamoDB operation parameters
 */
export function validateDynamoDBParams(
  operation: string,
  params: any
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate common parameters
  if (!params.TableName) {
    errors.push('TableName is required');
  }

  if (operation === 'put' || operation === 'update' || operation === 'delete') {
    if (!params.Key && !params.Item) {
      errors.push('Key or Item is required');
    }
  }

  if (operation === 'query') {
    if (!params.KeyConditionExpression) {
      errors.push('KeyConditionExpression is required');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
