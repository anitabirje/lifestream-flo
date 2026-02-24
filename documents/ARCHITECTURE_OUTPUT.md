# Flo Family Calendar - Architecture Output
## Generated from generate-architecture-diagram.py

**Status**: 85% Complete - Production-Ready MVP

---

## LAYER 1: CLIENT LAYER (Browser)

### React 18 PWA Application (Vite + TypeScript)

#### Pages
- Landing
- Login
- Onboarding
- Dashboard

#### Components (15+)
- Calendar Grid
- Dashboard
- Modals
- Charts

#### Services
- WebSocket
- Cache
- Offline Sync
- Notifications

#### Design System
- Colors
- Typography
- Spacing
- Responsive

---

## LAYER 2: API GATEWAY & ROUTING

### Express.js API Server (Node.js) - Port 3000 / Lambda

#### Auth Routes
- register
- login
- logout

#### Event Routes
- CRUD events
- categories
- allocation

#### Dashboard Routes
- metrics
- thresholds
- suggestions

#### New Routes
- conflicts
- preferences
- sync status

---

## LAYER 3: BUSINESS LOGIC LAYER (33 Services)

### Auth & Access
- auth-service
- session-manager
- password-manager

### Event Management
- event-service
- classifier-service
- extracurricular

### Time Tracking
- dashboard-builder
- metrics-calculator
- time-aggregator

### Notifications
- dispatcher
- builder
- preferences

### Conflict Management
- detector
- resolution-engine
- applier

### Summaries
- generator
- scheduler
- event-triggered

### Thresholds
- threshold-service
- monitor
- alerts

### Calendar Sources
- registry
- integration
- sync

### Data Management
- backup-manager
- recovery
- retention

### Onboarding
- setup-service
- preferences
- validation

---

## LAYER 4: AWS BEDROCK AGENT LAYER (30+ Files)

### Core Components
- lambda-handler
- bedrock-invoker
- agent-registry

### 10 Agent Types
- Weather
- Calendar Query
- Classifier

### Tool Functions
- calendar-tool
- weather-tool
- parser-tool

### Error Handling
- error-handler
- retry-logic
- fallback-mgr

### Data Persistence
- execution-persist
- execution-retrieval
- dynamodb-schema

### Configuration
- config-loader
- config-validator
- config-updater

### Monitoring
- metrics-publisher
- cloudwatch-alarms
- logger

### Event Publishing
- sns-publisher
- event-builder
- validation

---

## LAYER 5: DATA ACCESS LAYER

### DynamoDB Client Wrapper
- dynamodb-client.ts (CRUD)
- dynamodb-with-cache.ts (caching)

#### Features
- Single-table design
- Query optimization
- Connection pooling
- Error handling

---

## LAYER 6: AWS SERVICES LAYER

### DynamoDB
- Data Persistence

### Additional AWS Services (Inferred from codebase)
- AWS Bedrock (AI agent execution)
- AWS Lambda (Serverless compute)
- AWS SNS (Event publishing)
- AWS CloudWatch (Logging & metrics)
- AWS Secrets Manager (Credential management)
- AWS IAM (Access control)

---

## Architecture Flow

```
Browser (React PWA)
    ↓
Express API Gateway
    ↓
Business Logic Services (33 services)
    ↓
AWS Bedrock Agents (10 agent types)
    ↓
Data Access Layer (DynamoDB Client)
    ↓
AWS Services (DynamoDB, SNS, CloudWatch, etc.)
```

---

## Key Architectural Patterns

1. **Layered Architecture**: Clear separation between client, API, business logic, AI agents, and data
2. **Service-Oriented**: 33 specialized services for different business capabilities
3. **Event-Driven**: SNS for event publishing and asynchronous processing
4. **Serverless-Ready**: Lambda handlers for AWS Bedrock integration
5. **Resilient**: Error handling, retry logic, and fallback mechanisms
6. **Observable**: Comprehensive logging, metrics, and monitoring
7. **Secure**: IAM-based access control, session management, password hashing

---

## Technology Stack Summary

- **Frontend**: React 18, Vite, TypeScript, PWA
- **Backend**: Node.js, Express, TypeScript
- **AI/ML**: AWS Bedrock (10 agent types)
- **Database**: DynamoDB (single-table design)
- **Messaging**: AWS SNS
- **Monitoring**: AWS CloudWatch
- **Compute**: AWS Lambda
- **Security**: AWS IAM, Secrets Manager

---

## Implementation Status

- ✅ **Fully Implemented**: 20 major features
- ⚠️ **Partially Implemented**: 5 features (calendar sources, real-time updates, notifications, conflicts, sync)
- ❌ **Not Implemented**: 4 features (OAuth, email delivery, push notifications, mobile UI optimization)

---

## Critical Gaps

1. Calendar Source Management API endpoints
2. OAuth flows (Google Calendar, Outlook)
3. Email notification delivery (SendGrid/SES)
4. Push notification delivery (FCM/Web Push)
5. Real-time dashboard WebSocket connection

---

*Generated from: generate-architecture-diagram.py*
*Date: 2026-02-23*
