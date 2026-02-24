# Bedrock Agent Migration - API Documentation

## Overview

This document describes the API endpoints for the Bedrock Agent system.

## Base URL

```
https://api.example.com/agents
```

## Authentication

All requests require authentication via API key or AWS IAM credentials.

```bash
# Example with API key
curl -H "Authorization: Bearer YOUR_API_KEY" \
  https://api.example.com/agents/weather-agent/execute
```

## Endpoints

### Execute Agent

Execute an agent with the specified input.

**Endpoint**: `POST /agents/{agentId}/execute`

**Path Parameters**:
- `agentId` (string, required): The ID of the agent to execute

**Request Body**:
```json
{
  "agentId": "weather-agent",
  "agentType": "WeatherAgent",
  "input": {
    "location": "Seattle"
  },
  "parameters": {
    "temperature": 0.7,
    "maxTokens": 2048
  }
}
```

**Response** (200 OK):
```json
{
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "agentId": "weather-agent",
  "status": "success",
  "result": {
    "temperature": 72,
    "humidity": 65,
    "condition": "Partly Cloudy"
  },
  "metadata": {
    "startTime": "2024-01-15T10:30:45.123Z",
    "endTime": "2024-01-15T10:30:47.456Z",
    "duration": 2333,
    "modelUsed": "claude-3-sonnet"
  }
}
```

**Error Response** (400 Bad Request):
```json
{
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "agentId": "weather-agent",
  "status": "failure",
  "error": "Invalid input: location is required",
  "metadata": {
    "startTime": "2024-01-15T10:30:45.123Z",
    "endTime": "2024-01-15T10:30:45.234Z",
    "duration": 111,
    "modelUsed": "claude-3-sonnet"
  }
}
```

### Get Execution Record

Retrieve a previously executed agent's record.

**Endpoint**: `GET /agents/{agentId}/executions/{executionId}`

**Path Parameters**:
- `agentId` (string, required): The ID of the agent
- `executionId` (string, required): The ID of the execution

**Response** (200 OK):
```json
{
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "agentId": "weather-agent",
  "agentType": "WeatherAgent",
  "status": "success",
  "input": {
    "location": "Seattle"
  },
  "result": {
    "temperature": 72,
    "humidity": 65,
    "condition": "Partly Cloudy"
  },
  "startTime": 1705318245123,
  "endTime": 1705318247456,
  "duration": 2333,
  "modelUsed": "claude-3-sonnet",
  "toolInvocations": [
    {
      "toolName": "weather-tool",
      "input": { "location": "Seattle" },
      "output": { "temperature": 72, "humidity": 65 },
      "duration": 1500
    }
  ]
}
```

### List Agent Executions

List execution records for an agent.

**Endpoint**: `GET /agents/{agentId}/executions`

**Path Parameters**:
- `agentId` (string, required): The ID of the agent

**Query Parameters**:
- `startDate` (string, optional): ISO 8601 start date
- `endDate` (string, optional): ISO 8601 end date
- `status` (string, optional): Filter by status (success, failure, partial)
- `limit` (integer, optional): Maximum number of results (default: 100)

**Response** (200 OK):
```json
{
  "executions": [
    {
      "executionId": "550e8400-e29b-41d4-a716-446655440000",
      "agentId": "weather-agent",
      "status": "success",
      "startTime": 1705318245123,
      "endTime": 1705318247456,
      "duration": 2333
    }
  ],
  "total": 150,
  "limit": 100,
  "offset": 0
}
```

## Agent Types

### WeatherAgent

Fetches weather data and generates weather-related insights.

**Input**:
```json
{
  "location": "Seattle",
  "units": "fahrenheit",
  "forecastDays": 5
}
```

**Output**:
```json
{
  "temperature": 72,
  "humidity": 65,
  "condition": "Partly Cloudy",
  "forecast": [...]
}
```

### CalendarQueryAgent

Queries calendar data and extracts event information.

**Input**:
```json
{
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "categories": ["work", "personal"],
  "attendees": ["user@example.com"]
}
```

**Output**:
```json
{
  "events": [
    {
      "title": "Team Meeting",
      "startTime": "2024-01-15T10:00:00Z",
      "endTime": "2024-01-15T11:00:00Z",
      "category": "work"
    }
  ]
}
```

### EventClassifierAgent

Classifies events into predefined categories.

**Input**:
```json
{
  "eventTitle": "Team Meeting",
  "eventDescription": "Weekly sync with the team",
  "availableCategories": ["work", "personal", "health"]
}
```

**Output**:
```json
{
  "category": "work",
  "confidence": 0.95,
  "alternatives": [
    { "category": "personal", "confidence": 0.03 }
  ]
}
```

### EventParserAgent

Parses event data from various formats.

**Input**:
```json
{
  "eventData": "Team Meeting on Jan 15 at 10am",
  "format": "text"
}
```

**Output**:
```json
{
  "title": "Team Meeting",
  "startTime": "2024-01-15T10:00:00Z",
  "duration": 3600
}
```

### SchoolNewsletterParserAgent

Parses school newsletter content.

**Input**:
```json
{
  "newsletterContent": "...",
  "schoolName": "Lincoln Elementary"
}
```

**Output**:
```json
{
  "events": [...],
  "announcements": [...],
  "importantDates": [...]
}
```

## Error Codes

| Code | Status | Description |
|------|--------|-------------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Authentication failed |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |
| 503 | Service Unavailable | Service temporarily unavailable |

## Rate Limiting

- **Limit**: 1000 requests per minute per API key
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests per minute
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

## Backward Compatibility

The API maintains backward compatibility with the legacy format. Legacy requests are automatically converted to the new format.

**Legacy Request Format**:
```json
{
  "agentId": "weather-agent",
  "agentType": "WeatherAgent",
  "input": { "location": "Seattle" }
}
```

**Legacy Response Format**:
```json
{
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "agentId": "weather-agent",
  "status": "success",
  "result": { "temperature": 72 },
  "metadata": {
    "startTime": "2024-01-15T10:30:45.123Z",
    "endTime": "2024-01-15T10:30:47.456Z",
    "duration": 2333,
    "modelUsed": "claude-3-sonnet"
  }
}
```

## Examples

### Execute Weather Agent

```bash
curl -X POST https://api.example.com/agents/weather-agent/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "agentId": "weather-agent",
    "agentType": "WeatherAgent",
    "input": {
      "location": "Seattle"
    }
  }'
```

### Query Calendar Events

```bash
curl -X POST https://api.example.com/agents/calendar-query-agent/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "agentId": "calendar-query-agent",
    "agentType": "CalendarQueryAgent",
    "input": {
      "startDate": "2024-01-01",
      "endDate": "2024-01-31"
    }
  }'
```

### Classify Event

```bash
curl -X POST https://api.example.com/agents/event-classifier-agent/execute \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{
    "agentId": "event-classifier-agent",
    "agentType": "EventClassifierAgent",
    "input": {
      "eventTitle": "Team Meeting",
      "availableCategories": ["work", "personal"]
    }
  }'
```

## Webhooks

Agents can be configured to send webhooks on completion.

**Webhook Payload**:
```json
{
  "executionId": "550e8400-e29b-41d4-a716-446655440000",
  "agentId": "weather-agent",
  "status": "success",
  "result": { "temperature": 72 },
  "timestamp": "2024-01-15T10:30:47.456Z"
}
```

## Support

For API support, contact: api-support@example.com
