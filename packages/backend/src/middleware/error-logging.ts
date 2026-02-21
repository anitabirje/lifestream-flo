/**
 * Error Logging Middleware
 * Comprehensive error logging for Express applications
 * Logs errors to CloudWatch with full context
 * Displays generic messages to users
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { errorHandler, ErrorCategory, categorizeError, ErrorSeverity } from '../utils/error-handler';

/**
 * Extend Express Request to include requestId
 */
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      startTime: Date;
    }
  }
}

/**
 * Request ID middleware
 * Adds unique request ID to each request for tracking
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  req.requestId = uuidv4();
  req.startTime = new Date();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.requestId);

  next();
}

/**
 * Error logging middleware
 * Catches and logs errors with full context
 */
export function errorLoggingMiddleware(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const requestDuration = Date.now() - req.startTime.getTime();
  const errorCategory = categorizeError(err);

  // Determine error severity
  let severity = ErrorSeverity.MEDIUM;
  if (res.statusCode >= 500) {
    severity = ErrorSeverity.HIGH;
  } else if (res.statusCode >= 400) {
    severity = ErrorSeverity.LOW;
  }

  // Build error context
  const context = {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    requestDurationMs: requestDuration,
    userId: (req as any).user?.id,
    familyId: (req as any).user?.familyId,
    ip: req.ip,
    userAgent: req.get('user-agent')
  };

  // Log error
  errorHandler.handleError(
    err,
    errorCategory,
    severity,
    context,
    getErrorMessageForStatus(res.statusCode)
  ).catch(logError => {
    console.error('Failed to log error:', logError);
  });

  // Send error response
  const errorResponse = {
    success: false,
    error: getErrorMessageForStatus(res.statusCode),
    errorCode: getErrorCodeForStatus(res.statusCode),
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  };

  res.status(res.statusCode || 500).json(errorResponse);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Get error message for HTTP status code
 */
function getErrorMessageForStatus(statusCode: number): string {
  const messages: Record<number, string> = {
    400: 'Invalid request. Please check your input.',
    401: 'Authentication required. Please log in.',
    403: 'Access denied. You do not have permission.',
    404: 'Resource not found.',
    409: 'Conflict detected. Please refresh and try again.',
    429: 'Too many requests. Please try again later.',
    500: 'Internal server error. Please try again later.',
    502: 'Service temporarily unavailable. Please try again later.',
    503: 'Service temporarily unavailable. Please try again later.',
    504: 'Request timeout. Please try again later.'
  };

  return messages[statusCode] || 'An error occurred. Please try again later.';
}

/**
 * Get error code for HTTP status code
 */
function getErrorCodeForStatus(statusCode: number): string {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    429: 'RATE_LIMITED',
    500: 'INTERNAL_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT'
  };

  return codes[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * Request logging middleware
 * Logs all incoming requests
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request
  console.log(`[${req.requestId}] ${req.method} ${req.path}`, {
    query: req.query,
    userId: (req as any).user?.id
  });

  // Intercept response to log it
  const originalSend = res.send;
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    console.log(`[${req.requestId}] ${req.method} ${req.path} - ${statusCode} (${duration}ms)`);

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Error boundary middleware
 * Catches uncaught errors in middleware chain
 */
export function errorBoundaryMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    next();
  } catch (error) {
    console.error(`[${req.requestId}] Uncaught error in middleware:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId: req.requestId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * 404 handler
 * Handles requests to non-existent routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Resource not found',
    errorCode: 'NOT_FOUND',
    requestId: req.requestId,
    timestamp: new Date().toISOString()
  });
}
