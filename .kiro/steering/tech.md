# Technology Stack & Build System

## Frontend Stack

- **Framework**: React 18.2.0
- **Build Tool**: Vite 5.0.8
- **Language**: TypeScript 5.3.3
- **PWA**: vite-plugin-pwa 0.17.4
- **Testing**: Vitest 1.1.0, jsdom 28.1.0
- **Property Testing**: fast-check 3.15.0

### Frontend Build Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview

# Run tests (single run)
npm run test

# Run tests in watch mode
npm run test:watch
```

## Backend Stack

- **Runtime**: Node.js with TypeScript
- **Framework**: Express 4.18.2
- **Language**: TypeScript 5.3.3
- **AWS SDK**: 
  - @aws-sdk/client-dynamodb 3.490.0
  - @aws-sdk/lib-dynamodb 3.490.0
  - @aws-sdk/client-bedrock-agent-runtime (for Bedrock agents)
  - @aws-sdk/client-sns (for event publishing)
  - @aws-sdk/client-cloudwatch (for metrics)
- **Security**: bcrypt 5.1.1 for password hashing
- **Testing**: Jest 29.7.0, ts-jest 29.1.1
- **Property Testing**: fast-check 3.15.0
- **Utilities**: uuid 9.0.1, dotenv 16.3.1, cors 2.8.5

### Backend Build Commands

```bash
# Development server (with hot reload)
npm run dev

# Production build
npm run build

# Run tests
npm run test

# Run tests in watch mode
npm run test:watch

# Database setup
npm run db:setup
npm run db:create-table
```

## AWS Services

- **Bedrock**: AI agent execution and model invocation
- **Lambda**: Serverless compute for handlers and tools
- **DynamoDB**: NoSQL database for persistence
- **SNS**: Event publishing and notifications
- **CloudWatch**: Logging, metrics, and monitoring
- **Secrets Manager**: Credential and key management
- **IAM**: Identity and access management

## Development Workflow

### Project Structure

```
packages/
├── frontend/                    # React PWA application
│   ├── src/
│   │   ├── components/          # React UI components (15+ components)
│   │   │   ├── WeeklyCalendarGrid.tsx      # 7-day calendar view
│   │   │   ├── TimeTrackingDashboard.tsx   # Analytics dashboard
│   │   │   ├── EventDetailModal.tsx        # Event details
│   │   │   ├── OnboardingWizard.tsx        # Setup flow
│   │   │   ├── PieChart.tsx & BarChart.tsx # Visualizations
│   │   │   ├── WeatherDisplay.tsx          # Weather info
│   │   │   └── ...
│   │   ├── services/            # Business logic services
│   │   │   ├── websocket-service.ts        # Real-time updates (not connected)
│   │   │   ├── notification-permission.ts  # PWA notifications
│   │   │   ├── offline-sync.ts             # Offline support
│   │   │   ├── calendar-cache.ts           # Data caching
│   │   │   └── notification-preferences.ts # User preferences
│   │   ├── api/                 # API client modules
│   │   │   ├── onboardingApi.ts
│   │   │   └── weatherApi.ts
│   │   ├── types/               # TypeScript type definitions
│   │   │   └── calendar.ts
│   │   ├── utils/               # Utility functions
│   │   │   └── dateUtils.ts
│   │   ├── __tests__/           # Test files (5 test files)
│   │   └── App.tsx, main.tsx
│   └── package.json
│
└── backend/                     # Express API server
    ├── src/
    │   ├── bedrock-agent/       # AWS Bedrock integration (30+ files)
    │   │   ├── lambda-handler.ts           # Main Lambda entry point
    │   │   ├── bedrock-invoker.ts          # Bedrock API calls
    │   │   ├── agent-definitions.ts        # 10 agent types
    │   │   ├── agent-registry.ts           # Agent management
    │   │   ├── dynamodb-schema.ts          # Data models
    │   │   ├── execution-persistence.ts    # Data storage
    │   │   ├── metrics-publisher.ts        # CloudWatch metrics
    │   │   ├── cloudwatch-alarms.ts        # Monitoring
    │   │   ├── error-handler.ts            # Error handling
    │   │   ├── retry-logic.ts              # Exponential backoff
    │   │   ├── sns-publisher.ts            # Event publishing
    │   │   ├── config-loader.ts            # Configuration
    │   │   ├── logger.ts                   # Structured logging
    │   │   ├── tools/                      # Tool Lambda functions
    │   │   ├── __tests__/                  # 17 Bedrock tests
    │   │   └── DEPLOYMENT_GUIDE.md, API_DOCUMENTATION.md, OPERATIONAL_RUNBOOK.md
    │   │
    │   ├── agents/              # Agent orchestration (6 files)
    │   │   ├── agent-health-monitor.ts
    │   │   ├── result-aggregator.ts
    │   │   ├── task-queue.ts
    │   │   ├── weather-api-service.ts
    │   │   ├── types.ts
    │   │   └── index.ts
    │   │
    │   ├── services/            # Business logic services (33 files)
    │   │   ├── event-management-service.ts
    │   │   ├── dashboard-data-builder.ts
    │   │   ├── metrics-calculator.ts
    │   │   ├── time-aggregator.ts
    │   │   ├── threshold-monitor.ts
    │   │   ├── notification-dispatcher.ts
    │   │   ├── notification-builder.ts
    │   │   ├── notification-preference-service.ts
    │   │   ├── summary-generator.ts
    │   │   ├── summary-scheduler.ts
    │   │   ├── event-triggered-summary-service.ts
    │   │   ├── conflict-detector.ts
    │   │   ├── conflict-resolution-engine.ts
    │   │   ├── conflict-notification-service.ts
    │   │   ├── conflict-resolution-applier.ts
    │   │   ├── category-service.ts
    │   │   ├── event-classifier-service.ts
    │   │   ├── ideal-allocation-service.ts
    │   │   ├── extracurricular-activity-service.ts
    │   │   ├── onboarding-service.ts
    │   │   ├── calendar-source-registry.ts
    │   │   ├── time-booking-suggestion-service.ts
    │   │   ├── time-booking-acceptance-service.ts
    │   │   ├── backup-manager.ts
    │   │   ├── backup-monitor.ts
    │   │   ├── recovery-manager.ts
    │   │   ├── data-retention-manager.ts
    │   │   ├── audit-logger.ts
    │   │   ├── admin-alert-service.ts
    │   │   └── __tests__/ (comprehensive test suite)
    │   │
    │   ├── routes/              # API endpoints (10 route files)
    │   │   ├── auth.ts                     # Authentication
    │   │   ├── events.ts                   # Event CRUD
    │   │   ├── family-members.ts           # Family management
    │   │   ├── categories.ts               # Category management
    │   │   ├── ideal-allocation.ts         # Time allocation
    │   │   ├── dashboard.ts                # Dashboard metrics
    │   │   ├── thresholds.ts               # Threshold management
    │   │   ├── booking-suggestions.ts      # Time booking
    │   │   ├── extracurricular-activities.ts
    │   │   └── onboarding.ts               # Onboarding flow
    │   │   ❌ MISSING: calendar-sources.ts (calendar source management)
    │   │   ❌ MISSING: conflicts.ts (conflict management)
    │   │   ❌ MISSING: notification-preferences.ts (notification settings)
    │   │   ❌ MISSING: sync.ts (sync management)
    │   │
    │   ├── middleware/          # Express middleware
    │   │   ├── error-logging.ts
    │   │   └── access-control.ts
    │   │
    │   ├── scripts/             # Database setup scripts
    │   │   ├── create-table.ts
    │   │   └── setup-dynamodb.ts
    │   │
    │   ├── __tests__/           # Test files
    │   │   └── (comprehensive test suite)
    │   │
    │   ├── config/              # Configuration
    │   │   └── env.ts
    │   │
    │   ├── data-access/         # Data layer
    │   │   └── dynamodb-client.ts
    │   │
    │   ├── models/              # Data models
    │   │   └── event.ts
    │   │
    │   └── index.ts             # Express app entry point
    │
    ├── dist/                    # Compiled JavaScript (generated)
    ├── package.json
    ├── tsconfig.json
    ├── jest.config.js
    ├── .env.example
    └── SECURITY_CHECKLIST.md
```

### Actual Implementation Status

**Backend Services Implemented**: 33 services covering all major features
**API Routes Implemented**: 10 routes (auth, events, family, categories, allocation, dashboard, thresholds, booking, extracurricular, onboarding)
**Missing API Routes**: 4 critical routes (calendar-sources, conflicts, notification-preferences, sync)
**Frontend Components**: 15+ React components with full UI
**Tests**: 50+ unit tests, 10 property-based tests, 10+ integration tests
**Bedrock Integration**: 30+ files, 10 agent types, complete Lambda handler

### Key Commands

**Frontend** (from `packages/frontend/`):
- `npm run dev` - Start development server on http://localhost:5173
- `npm run build` - Build for production
- `npm run test` - Run tests once
- `npm run test:watch` - Run tests in watch mode

**Backend** (from `packages/backend/`):
- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm run test` - Run tests once
- `npm run test:watch` - Run tests in watch mode
- `npm run db:setup` - Initialize DynamoDB tables

### Implementation Notes

**What's Working:**
- All core business logic services (33 services)
- Complete Bedrock agent integration (30+ files)
- Comprehensive test suite (100+ tests)
- Full frontend UI (15+ components)
- PWA features (offline, caching, permissions)
- Authentication and access control
- Event management and categorization
- Dashboard and analytics
- Conflict detection
- Time tracking and thresholds
- Weekly summaries
- Extracurricular activities
- Onboarding wizard UI

**What's Partially Working:**
- Calendar source management (internal services exist, no API endpoints)
- Real-time updates (WebSocket service exists, not connected to dashboard)
- Notification system (queuing works, delivery not implemented)

**What's Not Working:**
- Calendar source OAuth flows (Google, Outlook)
- Email notification delivery (stubbed, not sent)
- Push notification delivery (not implemented)
- Mobile UI optimization (PWA works but not optimized)
- Notification preferences API endpoints
- Conflict management API endpoints
- Sync management API endpoints
- Calendar source management API endpoints

## Code Quality Standards

- **TypeScript**: Strict mode enabled, no implicit any
- **Testing**: Unit tests + property-based tests for all new functionality
- **Security**: Follow OWASP Top 10, implement least-privilege IAM
- **Logging**: Structured logging with correlation IDs
- **Error Handling**: Comprehensive error handling with descriptive messages

## Environment Configuration

Backend uses `.env` file for configuration:
- AWS credentials and region
- DynamoDB table names
- SNS topic ARNs
- Bedrock model IDs
- Application settings (port, log level, etc.)

See `.env.example` for required variables.

## Testing Strategy

- **Unit Tests**: Test individual functions and components
- **Property-Based Tests**: Validate universal properties across random inputs
- **Integration Tests**: Test end-to-end workflows
- **Load Tests**: Verify performance under concurrent load

Use `fast-check` for property-based testing in both frontend and backend.
