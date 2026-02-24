# Project Structure & Organization

## Directory Layout

```
lifestream-flo/
├── .kiro/                          # Kiro configuration and specs
│   ├── specs/                      # Feature specifications
│   │   └── bedrock-agent-migration/
│   │       ├── requirements.md
│   │       ├── design.md
│   │       └── tasks.md
│   └── steering/                   # Steering documents (this folder)
│
├── packages/
│   ├── frontend/                   # React PWA application
│   │   ├── src/
│   │   │   ├── components/         # React UI components
│   │   │   │   ├── *.tsx           # Component files
│   │   │   │   └── *.css           # Component styles
│   │   │   ├── services/           # Business logic services
│   │   │   │   ├── websocket-service.ts
│   │   │   │   ├── calendar-cache.ts
│   │   │   │   ├── offline-sync.ts
│   │   │   │   ├── notification-*.ts
│   │   │   │   └── ...
│   │   │   ├── api/                # API client modules
│   │   │   │   ├── weatherApi.ts
│   │   │   │   ├── onboardingApi.ts
│   │   │   │   └── ...
│   │   │   ├── types/              # TypeScript type definitions
│   │   │   │   └── calendar.ts
│   │   │   ├── utils/              # Utility functions
│   │   │   │   └── dateUtils.ts
│   │   │   ├── __tests__/          # Test files
│   │   │   │   ├── *.test.ts
│   │   │   │   └── ...
│   │   │   ├── App.tsx             # Root component
│   │   │   ├── main.tsx            # Entry point
│   │   │   ├── index.css           # Global styles
│   │   │   └── App.css
│   │   ├── public/                 # Static assets
│   │   │   └── manifest.json       # PWA manifest
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── index.html
│   │
│   └── backend/                    # Express API server
│       ├── src/
│       │   ├── middleware/         # Express middleware
│       │   │   ├── error-logging.ts
│       │   │   ├── access-control.ts
│       │   │   └── ...
│       │   ├── services/           # Business logic services
│       │   │   ├── agent-task-dispatcher.ts
│       │   │   ├── bedrock-agent-executor.ts
│       │   │   ├── calendar-source-registry.ts
│       │   │   ├── conflict-detector.ts
│       │   │   ├── event-classifier-service.ts
│       │   │   ├── notification-*.ts
│       │   │   ├── summary-*.ts
│       │   │   ├── time-booking-*.ts
│       │   │   ├── dashboard-data-builder.ts
│       │   │   ├── data-retention-manager.ts
│       │   │   ├── backup-*.ts
│       │   │   ├── recovery-manager.ts
│       │   │   ├── sync-scheduler.ts
│       │   │   └── ...
│       │   ├── scripts/            # Database and setup scripts
│       │   │   ├── create-table.ts
│       │   │   └── setup-dynamodb.ts
│       │   ├── __tests__/          # Test files
│       │   │   └── *.test.ts
│       │   └── index.ts            # Entry point
│       ├── dist/                   # Compiled JavaScript (generated)
│       ├── package.json
│       ├── tsconfig.json
│       ├── jest.config.js
│       ├── .env.example
│       └── SECURITY_CHECKLIST.md
│
└── README.md (if exists)
```

## Key Directories Explained

### Frontend (`packages/frontend/`)

- **components/**: Reusable React components for UI
  - Calendar views, charts, modals, settings panels
  - Each component has associated CSS file
- **services/**: Business logic and state management
  - WebSocket communication
  - Offline sync and caching
  - Notification handling
- **api/**: API client modules for backend communication
- **types/**: Shared TypeScript type definitions
- **utils/**: Helper functions (date utilities, etc.)
- **__tests__/**: Test files co-located with source

### Backend (`packages/backend/`)

- **middleware/**: Express middleware for cross-cutting concerns
  - Error logging, access control, CORS
- **services/**: Core business logic organized by domain
  - Agent execution and Bedrock integration
  - Calendar and event management
  - Notifications and alerts
  - Data persistence and retention
  - Conflict detection and resolution
  - Time tracking and analytics
- **scripts/**: Database initialization and setup utilities
- **__tests__/**: Test files for services and handlers

## Naming Conventions

### Files

- **Components**: PascalCase (e.g., `WeeklyCalendarGrid.tsx`)
- **Services**: kebab-case (e.g., `calendar-cache.ts`)
- **Tests**: `*.test.ts` or `*.test.tsx`
- **Styles**: Match component name (e.g., `WeeklyCalendarGrid.css`)

### Code

- **Classes/Interfaces**: PascalCase
- **Functions/Variables**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Types**: PascalCase with `I` prefix for interfaces (optional)

## Module Organization

### Frontend Services Pattern

Services are organized by feature/domain:
- `notification-preferences.ts` - Notification settings management
- `websocket-service.ts` - Real-time communication
- `calendar-cache.ts` - Calendar data caching
- `offline-sync.ts` - Offline data synchronization

### Backend Services Pattern

Services are organized by business capability:
- `bedrock-agent-executor.ts` - Bedrock agent invocation
- `event-classifier-service.ts` - Event classification logic
- `conflict-detector.ts` - Conflict detection
- `notification-dispatcher.ts` - Notification delivery
- `dashboard-data-builder.ts` - Dashboard data aggregation

## Testing Organization

- Tests are co-located with source files using `.test.ts` suffix
- Test files mirror the source structure
- Use `fast-check` for property-based testing
- Use Jest/Vitest for unit testing

## Configuration Files

- **tsconfig.json**: TypeScript compiler configuration (strict mode)
- **package.json**: Dependencies and scripts
- **.env.example**: Template for environment variables
- **jest.config.js**: Jest testing configuration
- **vite.config.ts**: Vite build configuration
- **SECURITY_CHECKLIST.md**: Security requirements and status

## Monorepo Structure

This is a monorepo using npm workspaces:
- Frontend and backend are separate packages
- Each has its own `package.json`, `tsconfig.json`, and build configuration
- Shared types can be referenced across packages
- Build and test commands run independently per package
