/**
 * Error Handler Utility
 * Provides centralized error handling, logging, and user-friendly error messages
 * Supports graceful degradation and cached data fallback
 */

import { config } from '../config/env';

// ============================================================================
// TYPES
// ============================================================================

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ErrorCategory {
  AGENT_FAILURE = 'AGENT_FAILURE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface ErrorContext {
  userId?: string;
  familyId?: string;
  operation?: string;
  sourceId?: string;
  taskId?: string;
  agentId?: string;
  [key: string]: any;
}

export interface ErrorLog {
  timestamp: Date;
  severity: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  error: Error;
  context: ErrorContext;
  stackTrace: string;
  userMessage: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  errorCode?: string;
  timestamp: string;
  requestId?: string;
}

// ============================================================================
// ERROR HANDLER CLASS
// ============================================================================

export class ErrorHandler {
  private cloudWatchClient: any;
  private logGroupName: string;
  private logStreamName: string;
  private errorLogs: ErrorLog[] = [];
  private maxCachedLogs: number = 1000;

  constructor() {
    // Try to initialize CloudWatch client if available
    try {
      const { CloudWatchLogsClient } = require('@aws-sdk/client-cloudwatch-logs');
      this.cloudWatchClient = new CloudWatchLogsClient({ region: config.aws.region });
    } catch (error) {
      console.warn('CloudWatch Logs client not available, error logging will be limited');
      this.cloudWatchClient = null;
    }

    this.logGroupName = `/flo/backend/${config.app.nodeEnv}`;
    this.logStreamName = `errors-${new Date().toISOString().split('T')[0]}`;
  }

  /**
   * Handle an error with full context and logging
   */
  async handleError(
    error: Error,
    category: ErrorCategory,
    severity: ErrorSeverity,
    context: ErrorContext = {},
    userMessage?: string
  ): Promise<ErrorResponse> {
    const errorLog: ErrorLog = {
      timestamp: new Date(),
      severity,
      category,
      message: error.message,
      error,
      context,
      stackTrace: error.stack || '',
      userMessage: userMessage || this.getDefaultUserMessage(category)
    };

    // Cache the error log
    this.cacheErrorLog(errorLog);

    // Log to CloudWatch
    await this.logToCloudWatch(errorLog);

    // Send critical alerts
    if (severity === ErrorSeverity.CRITICAL) {
      await this.sendCriticalAlert(errorLog);
    }

    // Log to console in development
    if (config.app.nodeEnv === 'development') {
      console.error(`[${category}] ${error.message}`, {
        context,
        stack: error.stack
      });
    }

    return {
      success: false,
      error: errorLog.userMessage,
      errorCode: this.getErrorCode(category),
      timestamp: new Date().toISOString(),
      requestId: context.requestId
    };
  }

  /**
   * Handle agent failure with graceful degradation
   */
  async handleAgentFailure(
    agentId: string,
    taskId: string,
    error: Error,
    context: ErrorContext = {}
  ): Promise<ErrorResponse> {
    const errorContext = {
      ...context,
      agentId,
      taskId,
      operation: 'agent_execution'
    };

    return this.handleError(
      error,
      ErrorCategory.AGENT_FAILURE,
      ErrorSeverity.HIGH,
      errorContext,
      'Unable to sync calendar data. Using cached information. Please try again later.'
    );
  }

  /**
   * Handle network error with retry queuing
   */
  async handleNetworkError(
    operation: string,
    error: Error,
    context: ErrorContext = {}
  ): Promise<ErrorResponse> {
    const errorContext = {
      ...context,
      operation,
      retryable: true
    };

    return this.handleError(
      error,
      ErrorCategory.NETWORK_ERROR,
      ErrorSeverity.MEDIUM,
      errorContext,
      'Network connection issue. Your changes will be synced when connectivity is restored.'
    );
  }

  /**
   * Handle DynamoDB error with caching fallback
   */
  async handleDatabaseError(
    operation: string,
    error: Error,
    context: ErrorContext = {}
  ): Promise<ErrorResponse> {
    const errorContext = {
      ...context,
      operation,
      fallbackToCache: true
    };

    return this.handleError(
      error,
      ErrorCategory.DATABASE_ERROR,
      ErrorSeverity.HIGH,
      errorContext,
      'Database temporarily unavailable. Using cached data. Your changes will be saved when service is restored.'
    );
  }

  /**
   * Handle external service error
   */
  async handleExternalServiceError(
    serviceName: string,
    error: Error,
    context: ErrorContext = {}
  ): Promise<ErrorResponse> {
    const errorContext = {
      ...context,
      serviceName,
      operation: `external_service_call`
    };

    return this.handleError(
      error,
      ErrorCategory.EXTERNAL_SERVICE_ERROR,
      ErrorSeverity.MEDIUM,
      errorContext,
      `Unable to connect to ${serviceName}. Please try again later.`
    );
  }

  /**
   * Log error to CloudWatch
   */
  private async logToCloudWatch(errorLog: ErrorLog): Promise<void> {
    if (!this.cloudWatchClient) {
      console.log('CloudWatch client not available, skipping CloudWatch logging');
      return;
    }

    try {
      const { PutLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
      const logMessage = JSON.stringify({
        timestamp: errorLog.timestamp.toISOString(),
        severity: errorLog.severity,
        category: errorLog.category,
        message: errorLog.message,
        context: errorLog.context,
        stackTrace: errorLog.stackTrace
      });

      const params = {
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [
          {
            message: logMessage,
            timestamp: Date.now()
          }
        ]
      };

      await this.cloudWatchClient.send(new PutLogEventsCommand(params));
    } catch (error) {
      // Fail silently to avoid cascading errors
      console.error('Failed to log to CloudWatch:', error);
    }
  }

  /**
   * Send critical alert via admin alert service
   */
  private async sendCriticalAlert(errorLog: ErrorLog): Promise<void> {
    try {
      // Dynamically import to avoid circular dependency
      const adminAlertModule = await import('../services/admin-alert-service');
      await adminAlertModule.adminAlertService.sendCriticalAlert(errorLog);
    } catch (error) {
      console.error('Failed to send critical alert:', error);
    }
  }

  /**
   * Cache error log in memory
   */
  private cacheErrorLog(errorLog: ErrorLog): void {
    this.errorLogs.push(errorLog);

    // Keep only recent logs
    if (this.errorLogs.length > this.maxCachedLogs) {
      this.errorLogs = this.errorLogs.slice(-this.maxCachedLogs);
    }
  }

  /**
   * Get default user message for error category
   */
  private getDefaultUserMessage(category: ErrorCategory): string {
    const messages: Record<ErrorCategory, string> = {
      [ErrorCategory.AGENT_FAILURE]: 'Unable to sync calendar data. Please try again later.',
      [ErrorCategory.NETWORK_ERROR]: 'Network connection issue. Please check your connection.',
      [ErrorCategory.DATABASE_ERROR]: 'Database temporarily unavailable. Please try again later.',
      [ErrorCategory.AUTHENTICATION_ERROR]: 'Authentication failed. Please log in again.',
      [ErrorCategory.VALIDATION_ERROR]: 'Invalid input provided. Please check your data.',
      [ErrorCategory.EXTERNAL_SERVICE_ERROR]: 'External service unavailable. Please try again later.',
      [ErrorCategory.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again later.'
    };

    return messages[category];
  }

  /**
   * Get error code for category
   */
  private getErrorCode(category: ErrorCategory): string {
    const codes: Record<ErrorCategory, string> = {
      [ErrorCategory.AGENT_FAILURE]: 'AGENT_001',
      [ErrorCategory.NETWORK_ERROR]: 'NET_001',
      [ErrorCategory.DATABASE_ERROR]: 'DB_001',
      [ErrorCategory.AUTHENTICATION_ERROR]: 'AUTH_001',
      [ErrorCategory.VALIDATION_ERROR]: 'VAL_001',
      [ErrorCategory.EXTERNAL_SERVICE_ERROR]: 'EXT_001',
      [ErrorCategory.UNKNOWN_ERROR]: 'UNK_001'
    };

    return codes[category];
  }

  /**
   * Get recent error logs
   */
  getRecentErrorLogs(limit: number = 100): ErrorLog[] {
    return this.errorLogs.slice(-limit);
  }

  /**
   * Get error logs by category
   */
  getErrorLogsByCategory(category: ErrorCategory, limit: number = 100): ErrorLog[] {
    return this.errorLogs
      .filter(log => log.category === category)
      .slice(-limit);
  }

  /**
   * Get error logs by severity
   */
  getErrorLogsBySeverity(severity: ErrorSeverity, limit: number = 100): ErrorLog[] {
    return this.errorLogs
      .filter(log => log.severity === severity)
      .slice(-limit);
  }

  /**
   * Clear cached error logs
   */
  clearErrorLogs(): void {
    this.errorLogs = [];
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const errorHandler = new ErrorHandler();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create error response for API endpoints
 */
export function createErrorResponse(
  error: Error,
  category: ErrorCategory,
  userMessage?: string
): ErrorResponse {
  return {
    success: false,
    error: userMessage || 'An error occurred. Please try again later.',
    errorCode: getErrorCodeForCategory(category),
    timestamp: new Date().toISOString()
  };
}

/**
 * Get error code for category
 */
function getErrorCodeForCategory(category: ErrorCategory): string {
  const codes: Record<ErrorCategory, string> = {
    [ErrorCategory.AGENT_FAILURE]: 'AGENT_001',
    [ErrorCategory.NETWORK_ERROR]: 'NET_001',
    [ErrorCategory.DATABASE_ERROR]: 'DB_001',
    [ErrorCategory.AUTHENTICATION_ERROR]: 'AUTH_001',
    [ErrorCategory.VALIDATION_ERROR]: 'VAL_001',
    [ErrorCategory.EXTERNAL_SERVICE_ERROR]: 'EXT_001',
    [ErrorCategory.UNKNOWN_ERROR]: 'UNK_001'
  };

  return codes[category];
}

/**
 * Determine error category from error
 */
export function categorizeError(error: any): ErrorCategory {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorName = error?.name?.toLowerCase() || '';

  if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorMessage.includes('econnrefused')) {
    return ErrorCategory.NETWORK_ERROR;
  }

  if (errorMessage.includes('dynamodb') || errorMessage.includes('database') || errorName.includes('dynamodb')) {
    return ErrorCategory.DATABASE_ERROR;
  }

  if (errorMessage.includes('auth') || errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
    return ErrorCategory.AUTHENTICATION_ERROR;
  }

  if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
    return ErrorCategory.VALIDATION_ERROR;
  }

  if (errorMessage.includes('agent') || errorMessage.includes('orchestrator')) {
    return ErrorCategory.AGENT_FAILURE;
  }

  if (errorMessage.includes('service') || errorMessage.includes('api')) {
    return ErrorCategory.EXTERNAL_SERVICE_ERROR;
  }

  return ErrorCategory.UNKNOWN_ERROR;
}
