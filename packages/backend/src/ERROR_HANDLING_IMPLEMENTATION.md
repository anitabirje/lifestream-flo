# Error Handling and Resilience Implementation

This document describes the comprehensive error handling and resilience features implemented for the Flo backend system.

## Overview

The error handling and resilience system provides:
- Graceful error handling for agent failures
- Operation queuing for network errors
- Caching layer for DynamoDB unavailability
- DynamoDB-specific error handling with exponential backoff
- Comprehensive error logging to CloudWatch
- Administrator alerting via SNS

## Components

### 1. Error Handler (`src/utils/error-handler.ts`)

Central error handling utility that:
- Categorizes errors by type (agent failure, network, database, etc.)
- Logs errors to CloudWatch with full context
- Sends critical alerts to administrators
- Caches error logs in memory
- Provides user-friendly error messages

**Key Features:**
- Error severity levels (LOW, MEDIUM, HIGH, CRITICAL)
- Error categories for different failure types
- Automatic CloudWatch logging
- Critical alert triggering
- Error log retrieval and filtering

**Usage:**
```typescript
import { errorHandler, ErrorCategory, ErrorSeverity } from '../utils/error-handler';

await errorHandler.handleError(
  error,
  ErrorCategory.AGENT_FAILURE,
  ErrorSeverity.HIGH,
  { agentId, taskId },
  'User-friendly error message'
);
```

### 2. Cache Manager (`src/utils/cache-manager.ts`)

In-memory caching system for data when DynamoDB is unavailable:
- TTL-based cache expiration
- Automatic cleanup of expired entries
- Cache statistics and monitoring
- Pattern-based cache invalidation

**Key Features:**
- Configurable cache size limits
- Automatic eviction of oldest entries
- Cache hit/miss tracking
- Pattern-based key matching
- Cleanup interval for expired entries

**Usage:**
```typescript
import { cacheManager } from '../utils/cache-manager';

// Set cache entry
cacheManager.set('key', data, 5 * 60 * 1000); // 5 minute TTL

// Get cache entry
const data = cacheManager.get('key');

// Get cache statistics
const stats = cacheManager.getStats();
```

### 3. Operation Queue (`src/utils/operation-queue.ts`)

Queues operations that fail due to network errors for retry when connectivity is restored:
- Exponential backoff retry strategy
- Operation status tracking
- Handler registration for different operation types
- Automatic retry processing

**Key Features:**
- Multiple operation status states (PENDING, IN_PROGRESS, COMPLETED, FAILED, RETRYING)
- Configurable retry strategy and delays
- Operation handler registration
- Queue statistics and monitoring
- Automatic retry scheduling

**Usage:**
```typescript
import { operationQueue } from '../utils/operation-queue';

// Register handler
operationQueue.registerHandler('sync_calendar', async (payload) => {
  // Handle operation
});

// Queue operation
const operationId = operationQueue.enqueue('sync_calendar', { sourceId: '123' });

// Check status
const status = operationQueue.getStatus(operationId);
```

### 4. DynamoDB with Cache (`src/data-access/dynamodb-with-cache.ts`)

Wrapper around DynamoDB operations that provides caching fallback:
- Automatic caching of read results
- Write operation queuing when database unavailable
- Graceful degradation to cached data
- Database health tracking

**Key Features:**
- Read operations with cache fallback
- Write operations with queuing
- Batch operations support
- Database availability monitoring
- Automatic write operation retry

**Usage:**
```typescript
import { DynamoDBWithCache } from '../data-access/dynamodb-with-cache';

const dbWithCache = new DynamoDBWithCache(dynamoClient);

// Get with cache fallback
const item = await dbWithCache.get(key);

// Put with write queuing
await dbWithCache.put(item);

// Check database health
const isHealthy = dbWithCache.isDatabaseHealthy();
```

### 5. DynamoDB Error Handler (`src/utils/dynamodb-error-handler.ts`)

Specialized error handling for DynamoDB-specific errors:
- Error categorization (throttling, conditional check failed, etc.)
- Retryability determination
- Suggested retry delays
- User-friendly error messages

**Key Features:**
- DynamoDB error type detection
- Retry eligibility checking
- Exponential backoff calculation
- Parameter validation
- Conditional write failure handling

**Usage:**
```typescript
import { handleDynamoDBError, categorizeDynamoDBError } from '../utils/dynamodb-error-handler';

try {
  // DynamoDB operation
} catch (error) {
  const errorType = categorizeDynamoDBError(error);
  await handleDynamoDBError(error, 'put_item', { key });
}
```

### 6. Error Logging Middleware (`src/middleware/error-logging.ts`)

Express middleware for comprehensive error logging:
- Request ID tracking
- Error logging with full context
- Async error handling
- 404 handling
- Request/response logging

**Key Features:**
- Unique request ID generation
- Request duration tracking
- User context capture
- Generic error messages to clients
- Detailed error logging to CloudWatch

**Usage:**
```typescript
import { 
  requestIdMiddleware, 
  errorLoggingMiddleware, 
  asyncHandler 
} from '../middleware/error-logging';

app.use(requestIdMiddleware);

app.get('/api/endpoint', asyncHandler(async (req, res) => {
  // Route handler
}));

app.use(errorLoggingMiddleware);
```

### 7. Admin Alert Service (`src/services/admin-alert-service.ts`)

Manages critical error alerts to administrators:
- SNS notification sending
- Alert throttling to prevent fatigue
- Alert history tracking
- Alert acknowledgment
- Alert statistics

**Key Features:**
- Critical error detection
- SNS topic integration
- Alert throttling per error category
- Alert history with acknowledgment
- Alert statistics and monitoring

**Usage:**
```typescript
import { adminAlertService } from '../services/admin-alert-service';

// Send critical alert
await adminAlertService.sendCriticalAlert(errorLog);

// Get unacknowledged alerts
const alerts = adminAlertService.getUnacknowledgedAlerts();

// Acknowledge alert
adminAlertService.acknowledgeAlert(alertId, 'admin@example.com');
```

## Integration Points

### Agent Orchestrator
- Catches agent execution errors
- Logs errors to CloudWatch
- Marks agents as failed
- Caches error information

### Sync Scheduler
- Handles sync failures
- Queues failed syncs for retry
- Logs network errors
- Retries via operation queue

### DynamoDB Client
- Implements exponential backoff for throttling
- Logs DynamoDB errors
- Handles conditional write failures
- Supports graceful degradation

## Error Flow

1. **Error Occurs** → Error is caught in try/catch block
2. **Categorization** → Error is categorized by type
3. **Logging** → Error is logged to CloudWatch with context
4. **Caching** → Error information is cached in memory
5. **Alerting** → Critical errors trigger SNS alerts
6. **User Response** → Generic error message sent to user
7. **Retry** → Operation is queued for retry if applicable

## Configuration

### Environment Variables
- `AWS_REGION`: AWS region for CloudWatch and SNS
- `SNS_TOPIC_ARN`: SNS topic for critical alerts (optional)
- `NODE_ENV`: Environment (production enables alerts)

### Error Handler Configuration
```typescript
const errorHandler = new ErrorHandler();
// Automatically uses environment configuration
```

### Cache Manager Configuration
```typescript
const cacheManager = new CacheManager(10000); // Max 10,000 entries
```

### Operation Queue Configuration
```typescript
const operationQueue = new OperationQueue({
  maxRetries: 5,
  initialRetryDelayMs: 1000,
  maxRetryDelayMs: 60000,
  backoffMultiplier: 2
});
```

## Monitoring

### Error Logs
- Access via `errorHandler.getRecentErrorLogs(limit)`
- Filter by category: `errorHandler.getErrorLogsByCategory(category)`
- Filter by severity: `errorHandler.getErrorLogsBySeverity(severity)`

### Cache Statistics
- `cacheManager.getStats()` returns hit/miss rates and entry count

### Operation Queue Statistics
- `operationQueue.getStats()` returns pending, in-progress, completed, and failed counts

### Admin Alerts
- `adminAlertService.getAlertStats()` returns alert statistics
- `adminAlertService.getUnacknowledgedAlerts()` returns pending alerts

## Best Practices

1. **Always use error handler** for consistent error logging
2. **Provide context** when logging errors for better debugging
3. **Use user-friendly messages** to avoid exposing technical details
4. **Monitor cache hit rates** to optimize cache configuration
5. **Review unacknowledged alerts** regularly
6. **Test error scenarios** to ensure graceful degradation
7. **Configure appropriate retry strategies** for different operation types

## Testing

Error handling can be tested by:
1. Simulating network failures
2. Making DynamoDB unavailable
3. Triggering agent failures
4. Verifying cache fallback behavior
5. Checking CloudWatch logs
6. Verifying SNS alerts
7. Testing operation queue retry logic

## Future Enhancements

- Metrics collection and dashboards
- Error rate alerting
- Automatic error recovery strategies
- Machine learning-based error prediction
- Advanced retry strategies (circuit breaker pattern)
- Error correlation and root cause analysis
