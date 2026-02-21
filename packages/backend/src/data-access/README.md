# DynamoDB Data Access Layer

This directory contains the DynamoDB data access layer implementation for the Flo Family Calendar application.

## Overview

The data access layer provides a robust wrapper around AWS DynamoDB operations with:
- Single-table design pattern for optimal performance
- Batch read/write operations
- Conditional writes for conflict prevention
- Exponential backoff for throttling
- Comprehensive error handling and retry logic

## Files

### `dynamodb-client.ts`
Main data access wrapper providing:
- **Basic Operations**: get, put, update, delete, query
- **Batch Operations**: batchGet, batchWrite with automatic chunking
- **Transactional Operations**: transactWrite for ACID guarantees
- **Conditional Writes**: putIfNotExists, updateIfExists, deleteIfExists
- **Retry Logic**: Exponential backoff with jitter for throttling errors

### `../config/schema.ts`
Schema design and TypeScript types:
- Table configuration (keys, GSIs, TTL, streams)
- 13 access patterns documented
- Key builders for all entity types
- TypeScript interfaces for all entities
- Query pattern helpers

### `../scripts/create-table.ts`
Table creation script that:
- Creates FamilyCalendar table with PK/SK
- Configures GSI1 (date range queries) and GSI2 (status queries)
- Enables Point-in-Time Recovery (PITR)
- Enables encryption at rest (KMS)
- Configures TTL for auto-expiring items
- Enables DynamoDB Streams for audit logging

## Usage

### Creating the Table

```bash
cd packages/backend
npm run db:create-table
```

### Basic Operations

```typescript
import { dynamoDBDataAccess } from './data-access/dynamodb-client';
import { KeyBuilder, EventEntity } from './config/schema';

// Put an item
const event: EventEntity = {
  ...KeyBuilder.event(familyId, eventId),
  ...KeyBuilder.eventByDate(familyId, '2026-02-21', eventId),
  EntityType: 'EVENT',
  id: eventId,
  familyId,
  familyMemberId,
  title: 'Team Meeting',
  startTime: '2026-02-21T10:00:00Z',
  endTime: '2026-02-21T11:00:00Z',
  category: 'Work',
  source: 'google',
  isDeleted: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

await dynamoDBDataAccess.put(event);

// Get an item
const key = KeyBuilder.event(familyId, eventId);
const retrieved = await dynamoDBDataAccess.get<EventEntity>(key);

// Query events by date range
const { items } = await dynamoDBDataAccess.query<EventEntity>(
  'GSI1PK = :gsi1pk AND GSI1SK BETWEEN :start AND :end',
  {
    ':gsi1pk': `FAMILY#${familyId}#EVENTS`,
    ':start': '2026-02-01',
    ':end': '2026-02-28~',
  },
  { indexName: 'GSI1' }
);
```

### Batch Operations

```typescript
// Batch write
await dynamoDBDataAccess.batchWrite([
  { PutRequest: { Item: event1 } },
  { PutRequest: { Item: event2 } },
  { DeleteRequest: { Key: keyToDelete } },
]);

// Batch read
const keys = [
  KeyBuilder.event(familyId, eventId1),
  KeyBuilder.event(familyId, eventId2),
];
const items = await dynamoDBDataAccess.batchGet<EventEntity>(keys);
```

### Conditional Writes

```typescript
// Put only if doesn't exist
await dynamoDBDataAccess.putIfNotExists(event);

// Update only if exists
await dynamoDBDataAccess.updateIfExists(
  key,
  'SET #status = :status',
  { '#status': 'status' },
  { ':status': 'completed' }
);
```

## Access Patterns

The schema supports 13 access patterns:

1. **Get family by ID**: `PK = FAMILY#<id>, SK = FAMILY#<id>`
2. **Get all family members**: `PK = FAMILY#<id>, SK begins_with MEMBER#`
3. **Get all events for family**: `PK = FAMILY#<id>, SK begins_with EVENT#`
4. **Get events by date range**: GSI1 query on `FAMILY#<id>#EVENTS`
5. **Get user sessions**: `PK = USER#<id>, SK begins_with SESSION#`
6. **Get agent tasks by status**: GSI2 query on `AGENT_TASKS`
7. **Get weather data by date**: `PK = FAMILY#<id>, SK = WEATHER#<date>`
8. **Get activity thresholds**: `PK = FAMILY#<id>, SK begins_with THRESHOLD#`
9. **Get notifications for user**: `PK = USER#<id>, SK begins_with NOTIFICATION#`
10. **Get agent by ID**: `PK = AGENT#<id>, SK = AGENT#<id>`
11. **Get calendar sources**: `PK = FAMILY#<id>, SK begins_with SOURCE#`
12. **Get extracurricular activities**: `PK = FAMILY#<id>, SK begins_with EXTRACURRICULAR#`
13. **Get audit logs**: `PK = FAMILY#<id>, SK begins_with AUDIT#`

## Error Handling

The client automatically retries on:
- `ProvisionedThroughputExceededException`
- `ThrottlingException`
- `RequestLimitExceeded`
- `InternalServerError`
- `ServiceUnavailable`

Retry configuration:
- Max retries: 5
- Base delay: 100ms
- Max delay: 5000ms
- Strategy: Exponential backoff with jitter

## Testing

Property-based tests verify data persistence round-trip:

```bash
cd packages/backend
npm test -- data-persistence.test.ts
```

**Note**: Tests require DynamoDB to be running (local or AWS).

## Configuration

Set environment variables in `.env`:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
DYNAMODB_ENDPOINT=http://localhost:8000  # For local DynamoDB
DYNAMODB_TABLE_NAME=FamilyCalendar
```

## Data Retention

- **Events**: Auto-deleted after 3 months (application logic)
- **Sessions**: Auto-deleted via TTL when expired
- **Weather Data**: Auto-deleted after 30 days via TTL
- **Notifications**: Auto-deleted after 90 days via TTL
- **Audit Logs**: Auto-deleted after 1 year via TTL
- **User Data**: Retained indefinitely

## Performance Considerations

- Use batch operations for multiple items (up to 25 writes, 100 reads)
- Query with GSIs for efficient date range and status queries
- Conditional writes prevent race conditions
- Exponential backoff handles throttling gracefully
- Single-table design minimizes cross-table joins
