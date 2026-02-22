/**
 * CloudWatch logging utility with structured logging
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4
 */

import { v4 as uuidv4 } from 'uuid';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/**
 * Structured log entry
 */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
  stackTrace?: string;
}

/**
 * Logger for structured logging with correlation IDs
 */
export class StructuredLogger {
  private correlationId: string;
  private logLevel: LogLevel;

  constructor(correlationId?: string, logLevel: LogLevel = 'INFO') {
    this.correlationId = correlationId || uuidv4();
    this.logLevel = logLevel;
  }

  /**
   * Get the current correlation ID
   */
  getCorrelationId(): string {
    return this.correlationId;
  }

  /**
   * Set the correlation ID
   */
  setCorrelationId(correlationId: string): void {
    this.correlationId = correlationId;
  }

  /**
   * Log at DEBUG level
   */
  debug(message: string, metadata?: Record<string, unknown>): void {
    this.log('DEBUG', message, metadata);
  }

  /**
   * Log at INFO level
   */
  info(message: string, metadata?: Record<string, unknown>): void {
    this.log('INFO', message, metadata);
  }

  /**
   * Log at WARN level
   */
  warn(message: string, metadata?: Record<string, unknown>): void {
    this.log('WARN', message, metadata);
  }

  /**
   * Log at ERROR level
   */
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      correlationId: this.correlationId,
      metadata,
      stackTrace: error?.stack,
    };

    this.writeLog(entry);
  }

  /**
   * Internal log method
   */
  private log(
    level: LogLevel,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    const levelOrder: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3,
    };

    // Only log if level is >= configured log level
    if (levelOrder[level] < levelOrder[this.logLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId: this.correlationId,
      metadata,
    };

    this.writeLog(entry);
  }

  /**
   * Write log entry to stdout (CloudWatch will capture this)
   */
  private writeLog(entry: LogEntry): void {
    console.log(JSON.stringify(entry));
  }
}

/**
 * Global logger instance
 */
let globalLogger: StructuredLogger | null = null;

/**
 * Get or create global logger
 */
export function getLogger(correlationId?: string): StructuredLogger {
  if (!globalLogger) {
    const logLevel = (process.env.LOG_LEVEL as LogLevel) || 'INFO';
    globalLogger = new StructuredLogger(correlationId, logLevel);
  } else if (correlationId) {
    globalLogger.setCorrelationId(correlationId);
  }
  return globalLogger;
}

/**
 * Create a new logger instance with correlation ID
 */
export function createLogger(correlationId?: string): StructuredLogger {
  const logLevel = (process.env.LOG_LEVEL as LogLevel) || 'INFO';
  return new StructuredLogger(correlationId, logLevel);
}
