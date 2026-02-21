# Technical Design Document: Consolidated Weekly Family Calendar with Time Tracking Dashboard

## Overview

The Consolidated Weekly Family Calendar with Time Tracking Dashboard is an AI agent-based web system that aggregates calendar events from multiple external sources (Google Calendar, Outlook, Kids School Newsletter, Kids Connect) into a unified weekly view. The system leverages an agent orchestration layer to coordinate multiple specialized AI agents that handle querying external sources, parsing event data, classifying events, and aggregating information. The system provides real-time visibility into family schedules and includes a time tracking dashboard that monitors time spent across five activity categories: Work, Family Time, Health/Fitness, Upskilling, and Relaxation.

The system architecture follows an AI agent-based design with clear separation of concerns:
- **Agent Orchestration Layer**: Coordinates multiple AI agents, manages task assignment, and aggregates results
- **Calendar Query Agents**: AI agents that query external calendar sources using intelligent retrieval strategies
- **Event Parser Agents**: AI agents that extract and structure event information from various data formats
- **Event Classifier Agents**: AI agents that automatically categorize events using contextual understanding
- **Synchronization Engine**: Manages real-time event updates and conflict resolution
- **Analytics & Dashboard Layer**: Computes time tracking metrics and generates visualizations
- **Notification Engine**: Manages threshold alerts and summary distribution
- **Persistence Layer**: Handles data storage, backup, and recovery

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web Frontend                              │
│  (React/Vue - Consolidated Calendar View, Dashboard, Settings)  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                    HTTP/WebSocket
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    API Gateway & Auth                            │
│  (Session Management, Token Validation, Rate Limiting)          │
└────────────────────────┬────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────────┐  ┌──▼──────────┐  ┌─▼──────────────┐
│ Agent            │  │ Event       │  │ Analytics &    │
│ Orchestration    │  │ Management  │  │ Notification   │
│ Service          │  │ Service     │  │ Service        │
└───────┬──────────┘  └──┬──────────┘  └─┬──────────────┘
        │                │               │
        │                │               │
┌───────▼──────────────────────────────────────────────┐
│           Agent Orchestration Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │ Calendar     │  │ Event Parser │  │ Event      │ │
│  │ Query Agents │  │ Agents       │  │ Classifier │ │
│  │              │  │              │  │ Agents     │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                       │
│  ┌──────────────────────────────────────────────┐   │
│  │ Agent Task Queue & Result Aggregator         │   │
│  └──────────────────────────────────────────────┘   │
└───────┬───────────────────────────────────────────┬─┘
        │                                           │
        │                                           │
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼──────────┐
│ Sync Engine  │  │  DynamoDB   │  │ ElastiCache    │
│ & Queue      │  │  Tables     │  │ (Sessions,     │
│              │  │             │  │  Agent State)  │
└───────┬──────┘  └─────────────┘  └────────────────┘
        │
┌───────▼──────────────────────────────────────────┐
│ External Calendar Sources                        │
│ (Google Calendar, Outlook, Kids School, etc.)   │
└────────────────────────────────────────────────┘
```

### Data Flow Diagram

```
External Calendar Sources
        │
        ▼
┌──────────────────────────────┐
│ Agent Orchestrator           │
│ (Task Assignment & Routing)  │
└──────────┬───────────────────┘
           │
    ┌──────┴──────┬──────────────┐
    │             │              │
    ▼             ▼              ▼
┌─────────┐  ┌─────────┐  ┌──────────┐
│Calendar │  │Calendar │  │ Event    │
│Query    │  │Query    │  │ Parser   │
│Agent 1  │  │Agent 2  │  │ Agent    │
│(Google) │  │(Outlook)│  │ (School) │
└────┬────┘  └────┬────┘  └────┬─────┘
     │            │            │
     └────────────┼────────────┘
                  │
                  ▼
┌──────────────────────────────┐
│ Agent Result Aggregator      │
│ (Collect & Normalize Events) │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────┐
│ Event Classifier     │
│ Agent                │
│ (AI-Based Category   │
│  Assignment)         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Sync Engine          │
│ (Conflict Detection) │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Database             │
│ (Normalized Events)  │
└──────────┬───────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌──────────────┐
│ Calendar│  │ Analytics    │
│ View    │  │ Dashboard    │
└─────────┘  └──────────────┘
    │             │
    └──────┬──────┘
           │
           ▼
┌──────────────────────┐
│ Notification Engine  │
│ (Threshold Alerts,  │
│  Weekly Summaries)   │
└──────────────────────┘
```

## Components and Interfaces

### 1. Agent Orchestration Service

**Responsibility**: Coordinate multiple AI agents, manage task assignment, aggregate results, and handle agent lifecycle.

**Key Components**:
- `AgentOrchestrator`: Central coordinator that manages all AI agents
- `TaskQueue`: Manages pending agent tasks with priority and scheduling
- `AgentRegistry`: Tracks available agents and their capabilities
- `ResultAggregator`: Collects and normalizes results from multiple agents
- `AgentHealthMonitor`: Monitors agent performance and availability

**Interfaces**:

```typescript
interface IAgent {
  id: string;
  type: 'calendar_query' | 'event_parser' | 'event_classifier';
  capabilities: string[];
  status: 'idle' | 'busy' | 'failed' | 'offline';
  execute(task: AgentTask): Promise<AgentResult>;
  healthCheck(): Promise<boolean>;
}

interface AgentTask {
  id: string;
  type: 'query_calendar' | 'parse_events' | 'classify_event';
  priority: 'high' | 'medium' | 'low';
  payload: any;
  sourceId?: string;
  createdAt: Date;
  assignedTo?: string; // Agent ID
  retryCount: number;
  maxRetries: number;
}

interface AgentResult {
  taskId: string;
  agentId: string;
  status: 'success' | 'partial_success' | 'failed';
  data: any;
  errors?: string[];
  executionTime: number; // milliseconds
  completedAt: Date;
}

interface AgentOrchestrationConfig {
  maxConcurrentAgents: number;
  taskTimeout: number; // milliseconds
  retryStrategy: 'exponential' | 'linear' | 'fixed';
  retryDelay: number; // milliseconds
  healthCheckInterval: number; // milliseconds
}
```

### 2. Calendar Query Agent Service

**Responsibility**: AI agents that query external calendar sources using intelligent retrieval strategies.

**Key Components**:
- `GoogleCalendarQueryAgent`: AI agent for querying Google Calendar
- `OutlookCalendarQueryAgent`: AI agent for querying Outlook Calendar
- `KidsConnectQueryAgent`: AI agent for querying Kids Connect platform
- `AgentAuthManager`: Manages authentication for AI agents accessing external sources

**Interfaces**:

```typescript
interface ICalendarQueryAgent extends IAgent {
  sourceType: 'google' | 'outlook' | 'kids_connect';
  authenticate(credentials: AuthCredentials): Promise<AuthToken>;
  queryEvents(query: CalendarQuery): Promise<ExternalEvent[]>;
  createEvent(event: EventData): Promise<string>; // Returns event ID
  updateEvent(eventId: string, event: EventData): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
}

interface CalendarQuery {
  startDate: Date;
  endDate: Date;
  filters?: {
    keywords?: string[];
    attendees?: string[];
    categories?: string[];
  };
  maxResults?: number;
}

interface ExternalEvent {
  sourceId: string;
  externalId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  source: 'google' | 'outlook' | 'kids_school' | 'kids_connect';
  rawData?: any; // Original data from source
}

interface CalendarSource {
  id: string;
  familyMemberId: string;
  type: 'google' | 'outlook' | 'kids_school' | 'kids_connect';
  credentials: EncryptedCredentials;
  lastSyncTime: Date;
  syncStatus: 'active' | 'failed' | 'disconnected';
  retryCount: number;
  assignedAgentId?: string;
}
```

### 3. Event Parser Agent Service

**Responsibility**: AI agents that extract and structure event information from various data formats.

**Key Components**:
- `SchoolNewsletterParserAgent`: AI agent for parsing school newsletter emails
- `UnstructuredDataParserAgent`: AI agent for parsing unstructured event data
- `DataNormalizer`: Normalizes parsed data into standard event format

**Interfaces**:

```typescript
interface IEventParserAgent extends IAgent {
  parseFormat: 'email' | 'html' | 'pdf' | 'text' | 'json';
  parse(rawData: string | Buffer): Promise<ParsedEvent[]>;
  extractEventDetails(text: string): Promise<EventDetails>;
  validateParsedData(event: ParsedEvent): boolean;
}

interface ParsedEvent {
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  confidence: number; // 0-1, how confident the parser is
  extractedFields: string[]; // Which fields were successfully extracted
  rawText?: string;
}

interface EventDetails {
  dates: Date[];
  times: string[];
  locations: string[];
  participants: string[];
  keywords: string[];
}
```

### 4. Event Classifier Agent Service

**Responsibility**: AI agents that automatically categorize events using contextual understanding and machine learning.

**Key Components**:
- `AIEventClassifier`: AI-powered event classification agent
- `ContextAnalyzer`: Analyzes event context for better classification
- `FeedbackLearner`: Learns from user corrections to improve classification
- `CategoryPredictor`: Predicts activity categories with confidence scores

**Interfaces**:

```typescript
interface IEventClassifierAgent extends IAgent {
  classify(event: Event): Promise<ClassificationResult>;
  classifyBatch(events: Event[]): Promise<ClassificationResult[]>;
  learnFromFeedback(feedback: ClassificationFeedback): Promise<void>;
  getConfidenceThreshold(): number;
}

interface ClassificationResult {
  category: ActivityCategory;
  confidence: number; // 0-1
  requiresUserInput: boolean;
  suggestedAlternatives?: ActivityCategory[];
  reasoning?: string; // AI explanation for classification
}

interface ActivityCategory {
  id: string;
  name: 'Work' | 'Family Time' | 'Health/Fitness' | 'Upskilling' | 'Relaxation';
  keywords: string[];
  color: string;
  icon: string;
}

interface ClassificationFeedback {
  eventId: string;
  assignedCategory: ActivityCategory;
  userSelectedCategory: ActivityCategory;
  timestamp: Date;
  familyMemberId: string;
  eventContext: {
    title: string;
    description?: string;
    time: Date;
  };
}
```

### 5. Calendar Integration Service (Legacy Wrapper)

**Responsibility**: Provides backward compatibility layer and manages agent-based calendar operations.

**Key Components**:
- `AgentBasedCalendarConnector`: Wraps agent operations in traditional interface
- `CalendarSourceRegistry`: Manages active calendar source connections
- `AgentTaskDispatcher`: Dispatches calendar operations to appropriate agents

**Interfaces**:

```typescript
interface ICalendarConnector {
  authenticate(credentials: AuthCredentials): Promise<AuthToken>;
  fetchEvents(startDate: Date, endDate: Date): Promise<ExternalEvent[]>;
  createEvent(event: EventData): Promise<string>; // Returns event ID
  updateEvent(eventId: string, event: EventData): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
  disconnect(): Promise<void>;
}
```

### 6. Synchronization Engine

**Responsibility**: Manage real-time event synchronization, conflict detection, and agent task coordination.

**Key Components**:
- `SyncScheduler`: Triggers sync operations every 5 minutes and coordinates agents
- `ConflictDetector`: Identifies overlapping events for same family member
- `SyncQueue`: Manages pending sync operations with retry logic
- `ChangeDetector`: Identifies new, updated, and deleted events
- `AgentSyncCoordinator`: Coordinates multiple agents for parallel synchronization

**Interfaces**:

```typescript
interface SyncOperation {
  id: string;
  sourceId: string;
  operationType: 'full_sync' | 'incremental_sync';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
}

interface ConflictDetectionResult {
  hasConflict: boolean;
  conflictingEvents: Event[];
  familyMemberId: string;
  timeRange: { start: Date; end: Date };
}

interface SyncResult {
  newEvents: Event[];
  updatedEvents: Event[];
  deletedEvents: string[]; // Event IDs
  conflicts: ConflictDetectionResult[];
  syncDuration: number; // milliseconds
}
```

### 7. Analytics & Dashboard Service

**Responsibility**: Compute time tracking metrics and generate dashboard data.

**Key Components**:
- `TimeAggregator`: Calculates total time per category
- `MetricsCalculator`: Computes comparative metrics and insights
- `DashboardDataBuilder`: Prepares data for visualization
- `CacheManager`: Caches computed metrics for performance

**Interfaces**:

```typescript
interface TimeAllocation {
  category: ActivityCategory;
  totalHours: number;
  percentage: number;
  eventCount: number;
}

interface DashboardMetrics {
  weekStartDate: Date;
  weekEndDate: Date;
  familyMemberId?: string; // If filtered to specific member
  timeAllocations: TimeAllocation[];
  comparativeMetrics: {
    averageTimePerCategory: Record<string, number>;
    familyMemberComparison: Record<string, TimeAllocation[]>;
  };
  generatedAt: Date;
}

interface DashboardQuery {
  familyMemberId?: string;
  startDate: Date;
  endDate: Date;
  groupBy?: 'category' | 'family_member' | 'day';
}
```

### 8. Notification Engine

**Responsibility**: Manage threshold alerts and summary distribution.

**Key Components**:
- `ThresholdMonitor`: Tracks time against configured thresholds
- `NotificationBuilder`: Constructs notification messages
- `NotificationDispatcher`: Sends notifications via email and in-app
- `SummaryGenerator`: Creates weekly consolidated summaries
- `NotificationQueue`: Manages async notification delivery

**Interfaces**:

```typescript
interface ActivityThreshold {
  id: string;
  familyId: string;
  category: ActivityCategory;
  maxHours?: number;
  minHours?: number;
  notificationRecipients: string[]; // Family member IDs
  enabled: boolean;
}

interface ThresholdViolation {
  type: 'max_exceeded' | 'min_not_met';
  category: ActivityCategory;
  familyMemberId: string;
  currentHours: number;
  thresholdHours: number;
  violationTime: Date;
}

interface Notification {
  id: string;
  type: 'threshold_alert' | 'weekly_summary' | 'event_update';
  recipientId: string;
  subject: string;
  content: string;
  htmlContent?: string;
  channels: ('email' | 'in_app')[];
  status: 'pending' | 'sent' | 'failed';
  createdAt: Date;
  sentAt?: Date;
}

interface ConsolidatedSummary {
  weekStartDate: Date;
  weekEndDate: Date;
  eventsByDay: Record<string, Event[]>;
  timeTrackingMetrics: DashboardMetrics;
  insights: string[];
  generatedAt: Date;
}
```

### 9. Event Management Service

**Responsibility**: Handle event creation, updates, and deletions.

**Key Components**:
- `EventValidator`: Validates event data and constraints
- `EventPersistence`: Stores events in database
- `EventSynchronizer`: Syncs events back to source calendars
- `AuditLogger`: Logs all event changes

**Interfaces**:

```typescript
interface Event {
  id: string;
  externalId?: string;
  sourceId: string;
  familyMemberId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  category: ActivityCategory;
  attendees?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  source: 'google' | 'outlook' | 'kids_school' | 'kids_connect' | 'internal';
}

interface EventData {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  category: ActivityCategory;
  attendees?: string[];
}

interface AuditLogEntry {
  id: string;
  eventId: string;
  changeType: 'created' | 'updated' | 'deleted';
  changedBy: string;
  timestamp: Date;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}
```

### 10. Authentication & Access Control Service

**Responsibility**: Manage user authentication and authorization.

**Key Components**:
- `AuthenticationManager`: Handles login/logout and session management
- `PasswordManager`: Manages password hashing and validation
- `SessionManager`: Creates and validates session tokens
- `AccessControlManager`: Enforces permission rules

**Interfaces**:

```typescript
interface User {
  id: string;
  email: string;
  passwordHash: string;
  familyId: string;
  role: 'admin' | 'member';
  createdAt: Date;
  lastLoginAt?: Date;
}

interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
}

interface AuthCredentials {
  email: string;
  password: string;
}

interface AuthResult {
  success: boolean;
  user?: User;
  session?: Session;
  error?: string;
}

interface AccessControl {
  familyMemberId: string;
  canViewCalendar: boolean;
  canCreateEvents: boolean;
  canEditEvents: boolean;
  canDeleteEvents: boolean;
  canManageSources: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
}
```

### 11. Data Persistence Service

**Responsibility**: Handle DynamoDB operations and backup management.

**Key Components**:
- `DynamoDBClient`: Manages DynamoDB connections and operations
- `BackupManager`: Manages Point-in-Time Recovery and on-demand backups
- `BackupMonitor`: Monitors backup status via CloudWatch
- `RecoveryManager`: Handles data restoration from backups

**Interfaces**:

```typescript
interface DynamoDBConfig {
  tableName: string;
  region: string;
  endpoint?: string; // For local development
  maxRetries: number;
  timeout: number; // milliseconds
}

interface BackupStatus {
  pitrEnabled: boolean;
  latestRestorableTime: Date;
  onDemandBackups: OnDemandBackup[];
}

interface OnDemandBackup {
  backupArn: string;
  backupName: string;
  backupCreationDate: Date;
  backupSizeBytes: number;
  backupStatus: 'CREATING' | 'AVAILABLE' | 'DELETED';
  retentionUntil: Date;
}

interface DynamoDBHealthCheck {
  isAvailable: boolean;
  responseTime: number; // milliseconds
  lastCheck: Date;
  status: 'healthy' | 'degraded' | 'unavailable';
  throttlingErrors: number;
}
```

## Data Models

### DynamoDB Single-Table Design

The system uses a single-table design pattern for optimal performance and cost efficiency.

**Table Name**: `FamilyCalendar`

**Primary Key Structure**:
- **PK (Partition Key)**: Entity identifier (e.g., `FAMILY#123`, `USER#abc`)
- **SK (Sort Key)**: Sub-entity or relationship (e.g., `MEMBER#xyz`, `EVENT#evt1`)

**Global Secondary Indexes**:
1. **GSI1**: `GSI1PK` (PK) + `GSI1SK` (SK) - For querying by date ranges
2. **GSI2**: `GSI2PK` (PK) + `GSI2SK` (SK) - For querying by status/type

### Access Patterns and Key Design

```typescript
// Pattern 1: Get family by ID
PK: FAMILY#<familyId>
SK: FAMILY#<familyId>

// Pattern 2: Get all family members
PK: FAMILY#<familyId>
SK: MEMBER#<memberId>

// Pattern 3: Get all events for a family
PK: FAMILY#<familyId>
SK: EVENT#<eventId>

// Pattern 4: Get events by date range (using GSI1)
GSI1PK: FAMILY#<familyId>#EVENTS
GSI1SK: <YYYY-MM-DD>#<eventId>

// Pattern 5: Get user sessions
PK: USER#<userId>
SK: SESSION#<sessionToken>

// Pattern 6: Get agent tasks by status (using GSI2)
GSI2PK: AGENT_TASKS
GSI2SK: <status>#<createdAt>

// Pattern 7: Get weather data by date
PK: FAMILY#<familyId>
SK: WEATHER#<YYYY-MM-DD>

// Pattern 8: Get activity thresholds
PK: FAMILY#<familyId>
SK: THRESHOLD#<category>

// Pattern 9: Get notifications for user
PK: USER#<userId>
SK: NOTIFICATION#<timestamp>#<notificationId>

// Pattern 10: Get agent by ID
PK: AGENT#<agentId>
SK: AGENT#<agentId>
```

### Core Data Entities

```typescript
// Family
interface Family {
  PK: string; // FAMILY#<familyId>
  SK: string; // FAMILY#<familyId>
  EntityType: 'FAMILY';
  id: string;
  name: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// Family Member
interface FamilyMember {
  PK: string; // FAMILY#<familyId>
  SK: string; // MEMBER#<memberId>
  EntityType: 'FAMILY_MEMBER';
  id: string;
  familyId: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'member';
  joinedAt: string; // ISO 8601
  status: 'active' | 'inactive' | 'removed';
  lastLoginAt?: string; // ISO 8601
}

// Event
interface Event {
  PK: string; // FAMILY#<familyId>
  SK: string; // EVENT#<eventId>
  GSI1PK: string; // FAMILY#<familyId>#EVENTS
  GSI1SK: string; // <YYYY-MM-DD>#<eventId>
  EntityType: 'EVENT';
  id: string;
  familyId: string;
  familyMemberId: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  location?: string;
  category: 'Work' | 'Family Time' | 'Health/Fitness' | 'Upskilling' | 'Relaxation';
  source: 'google' | 'outlook' | 'kids_school' | 'kids_connect' | 'extracurricular' | 'internal';
  externalId?: string;
  sourceId?: string;
  attendees?: string[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  createdBy: string;
  isDeleted: boolean;
  classifiedByAgentId?: string;
  classificationConfidence?: number;
}

// Session
interface Session {
  PK: string; // USER#<userId>
  SK: string; // SESSION#<sessionToken>
  EntityType: 'SESSION';
  id: string;
  userId: string;
  token: string;
  expiresAt: string; // ISO 8601
  createdAt: string; // ISO 8601
  lastActivityAt: string; // ISO 8601
  TTL: number; // Unix timestamp for DynamoDB TTL
}

// Agent
interface Agent {
  PK: string; // AGENT#<agentId>
  SK: string; // AGENT#<agentId>
  EntityType: 'AGENT';
  id: string;
  type: 'calendar_query' | 'event_parser' | 'event_classifier' | 'weather';
  name: string;
  capabilities: string[];
  status: 'idle' | 'busy' | 'failed' | 'offline';
  lastHealthCheck: string; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// Agent Task
interface AgentTask {
  PK: string; // AGENT_TASK#<taskId>
  SK: string; // AGENT_TASK#<taskId>
  GSI2PK: string; // AGENT_TASKS
  GSI2SK: string; // <status>#<createdAt>
  EntityType: 'AGENT_TASK';
  id: string;
  agentId?: string;
  type: 'query_calendar' | 'parse_events' | 'classify_event' | 'fetch_weather';
  priority: 'high' | 'medium' | 'low';
  payload: any;
  sourceId?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  createdAt: string; // ISO 8601
  assignedAt?: string; // ISO 8601
  completedAt?: string; // ISO 8601
  errorMessage?: string;
  TTL?: number; // Auto-delete completed tasks after 7 days
}

// Weather Data
interface WeatherData {
  PK: string; // FAMILY#<familyId>
  SK: string; // WEATHER#<YYYY-MM-DD>
  EntityType: 'WEATHER';
  date: string; // YYYY-MM-DD
  familyId: string;
  location: string;
  temperature: number;
  temperatureUnit: 'C' | 'F';
  aqi: number;
  uvIndex: number;
  precipitationChance: number; // 0-100
  conditions: string; // e.g., "Sunny", "Rainy"
  retrievedAt: string; // ISO 8601
  TTL: number; // Auto-delete after 30 days
}

// Activity Threshold
interface ActivityThreshold {
  PK: string; // FAMILY#<familyId>
  SK: string; // THRESHOLD#<category>
  EntityType: 'THRESHOLD';
  familyId: string;
  category: string;
  maxHours?: number;
  minHours?: number;
  notificationRecipients: string[]; // Array of member IDs
  enabled: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// Notification
interface Notification {
  PK: string; // USER#<userId>
  SK: string; // NOTIFICATION#<timestamp>#<notificationId>
  EntityType: 'NOTIFICATION';
  id: string;
  familyId: string;
  recipientId: string;
  type: 'threshold_alert' | 'weekly_summary' | 'event_update' | 'conflict_alert';
  subject: string;
  content: string;
  htmlContent?: string;
  channels: ('email' | 'in_app' | 'push')[];
  status: 'pending' | 'sent' | 'failed';
  createdAt: string; // ISO 8601
  sentAt?: string; // ISO 8601
  failureReason?: string;
  TTL?: number; // Auto-delete after 90 days
}

// Extracurricular Activity
interface ExtracurricularActivity {
  PK: string; // FAMILY#<familyId>
  SK: string; // EXTRACURRICULAR#<activityId>
  EntityType: 'EXTRACURRICULAR';
  id: string;
  familyId: string;
  familyMemberId: string;
  activityType: 'sports' | 'music' | 'clubs' | 'other';
  name: string;
  schedule: string; // e.g., "Every Monday 4-5 PM"
  location: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// Audit Log
interface AuditLogEntry {
  PK: string; // FAMILY#<familyId>
  SK: string; // AUDIT#<timestamp>#<logId>
  EntityType: 'AUDIT_LOG';
  id: string;
  familyId: string;
  entityType: 'event' | 'calendar_source' | 'user' | 'threshold' | 'agent' | 'agent_task';
  entityId: string;
  action: 'created' | 'updated' | 'deleted';
  changedBy: string;
  timestamp: string; // ISO 8601
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  TTL?: number; // Auto-delete after 1 year
}

// Family Member
interface FamilyMember {
  id: string;
  familyId: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  joinedAt: Date;
  status: 'active' | 'inactive' | 'removed';
}

// Agent
interface Agent {
  id: string;
  type: 'calendar_query' | 'event_parser' | 'event_classifier';
  name: string;
  capabilities: string[];
  status: 'idle' | 'busy' | 'failed' | 'offline';
  lastHealthCheck: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Agent Task
interface AgentTask {
  id: string;
  agentId?: string;
  type: 'query_calendar' | 'parse_events' | 'classify_event';
  priority: 'high' | 'medium' | 'low';
  payload: any;
  sourceId?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  assignedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

// Agent Result
interface AgentResult {
  id: string;
  taskId: string;
  agentId: string;
  status: 'success' | 'partial_success' | 'failed';
  data: any;
  errors?: string[];
  executionTime: number;
  completedAt: Date;
}

// Event (Consolidated)
interface Event {
  id: string;
  familyId: string;
  familyMemberId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  category: ActivityCategory;
  source: 'google' | 'outlook' | 'kids_school' | 'kids_connect' | 'internal';
  externalId?: string;
  sourceId?: string;
  attendees?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isDeleted: boolean;
  classifiedByAgentId?: string;
  classificationConfidence?: number;
}

// Activity Category
interface ActivityCategory {
  id: string;
  name: 'Work' | 'Family Time' | 'Health/Fitness' | 'Upskilling' | 'Relaxation';
  keywords: string[];
  color: string;
  icon: string;
}

// Calendar Source
interface CalendarSource {
  id: string;
  familyMemberId: string;
  type: 'google' | 'outlook' | 'kids_school' | 'kids_connect';
  credentials: EncryptedCredentials;
  lastSyncTime: Date;
  syncStatus: 'active' | 'failed' | 'disconnected';
  retryCount: number;
  assignedAgentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Activity Threshold
interface ActivityThreshold {
  id: string;
  familyId: string;
  category: ActivityCategory;
  maxHours?: number;
  minHours?: number;
  notificationRecipients: string[]; // Family member IDs
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Notification
interface Notification {
  id: string;
  familyId: string;
  recipientId: string;
  type: 'threshold_alert' | 'weekly_summary' | 'event_update';
  subject: string;
  content: string;
  htmlContent?: string;
  channels: ('email' | 'in_app')[];
  status: 'pending' | 'sent' | 'failed';
  createdAt: Date;
  sentAt?: Date;
  failureReason?: string;
}

// Notification Preference
interface NotificationPreference {
  id: string;
  familyMemberId: string;
  category: ActivityCategory;
  disableThresholdAlerts: boolean;
  disableSummaryEmails: boolean;
  preferredChannels: ('email' | 'in_app')[];
  updatedAt: Date;
}

// Audit Log
interface AuditLogEntry {
  id: string;
  familyId: string;
  entityType: 'event' | 'calendar_source' | 'user' | 'threshold' | 'agent' | 'agent_task';
  entityId: string;
  action: 'created' | 'updated' | 'deleted';
  changedBy: string;
  timestamp: Date;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
}

// Backup Record
interface BackupRecord {
  id: string;
  startTime: Date;
  endTime: Date;
  status: 'completed' | 'failed';
  backupSize: number;
  verificationStatus: 'verified' | 'failed';
  retentionUntil: Date;
  errorMessage?: string;
}
```

### DynamoDB Table Configuration

**Table Name**: `FamilyCalendar`

**Billing Mode**: On-Demand (auto-scaling)

**Primary Key**:
- **PK** (Partition Key): String
- **SK** (Sort Key): String

**Global Secondary Indexes**:

1. **GSI1** - Date Range Queries
   - **GSI1PK** (Partition Key): String
   - **GSI1SK** (Sort Key): String
   - Projection: ALL
   - Purpose: Query events by date range

2. **GSI2** - Status/Type Queries
   - **GSI2PK** (Partition Key): String
   - **GSI2SK** (Sort Key): String
   - Projection: ALL
   - Purpose: Query agent tasks by status, query notifications by type

**Table Features**:
- **Encryption**: Enabled (AWS managed keys)
- **Point-in-Time Recovery (PITR)**: Enabled (continuous backup)
- **TTL Attribute**: `TTL` (Unix timestamp for auto-expiring items)
- **DynamoDB Streams**: Enabled (for audit logging and real-time updates)
- **Stream View Type**: NEW_AND_OLD_IMAGES

**TTL Configuration**:
- Sessions: 30 days from creation
- Agent Tasks: 7 days after completion
- Weather Data: 30 days from retrieval
- Notifications: 90 days from creation
- Audit Logs: 1 year from creation

**CloudFormation/CDK Configuration**:

```typescript
const table = new dynamodb.Table(this, 'FamilyCalendar', {
  tableName: 'FamilyCalendar',
  partitionKey: { name: 'PK', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'SK', type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  encryption: dynamodb.TableEncryption.AWS_MANAGED,
  pointInTimeRecovery: true,
  timeToLiveAttribute: 'TTL',
  stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
});

// GSI1 for date range queries
table.addGlobalSecondaryIndex({
  indexName: 'GSI1',
  partitionKey: { name: 'GSI1PK', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'GSI1SK', type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.ALL,
});

// GSI2 for status/type queries
table.addGlobalSecondaryIndex({
  indexName: 'GSI2',
  partitionKey: { name: 'GSI2PK', type: dynamodb.AttributeType.STRING },
  sortKey: { name: 'GSI2SK', type: dynamodb.AttributeType.STRING },
  projectionType: dynamodb.ProjectionType.ALL,
});
```

**Access Patterns Summary**:

| Pattern | Description | Key Structure | Index |
|---------|-------------|---------------|-------|
| 1 | Get family by ID | PK: FAMILY#id, SK: FAMILY#id | Primary |
| 2 | Get family members | PK: FAMILY#id, SK: MEMBER#id | Primary |
| 3 | Get events for family | PK: FAMILY#id, SK: EVENT#id | Primary |
| 4 | Get events by date | GSI1PK: FAMILY#id#EVENTS, GSI1SK: YYYY-MM-DD#id | GSI1 |
| 5 | Get user sessions | PK: USER#id, SK: SESSION#token | Primary |
| 6 | Get agent tasks by status | GSI2PK: AGENT_TASKS, GSI2SK: status#createdAt | GSI2 |
| 7 | Get weather by date | PK: FAMILY#id, SK: WEATHER#YYYY-MM-DD | Primary |
| 8 | Get thresholds | PK: FAMILY#id, SK: THRESHOLD#category | Primary |
| 9 | Get user notifications | PK: USER#id, SK: NOTIFICATION#timestamp#id | Primary |
| 10 | Get agent by ID | PK: AGENT#id, SK: AGENT#id | Primary |

## Key Algorithms

### 1. Agent-Based Event Synchronization Algorithm

```
ALGORITHM AgentBasedSyncCalendarSources()
  // Step 1: Create agent tasks for each calendar source
  FOR EACH active calendar source:
    task = CreateAgentTask(
      type: 'query_calendar',
      priority: 'high',
      payload: {
        sourceId: source.id,
        sourceType: source.type,
        startDate: source.lastSyncTime,
        endDate: NOW()
      }
    )
    QueueTask(task)
  END FOR
  
  // Step 2: Agent orchestrator assigns tasks to available agents
  AgentOrchestrator.AssignTasks()
  
  // Step 3: Wait for agent results
  results = AgentOrchestrator.WaitForResults(timeout: 5 minutes)
  
  // Step 4: Process results from each agent
  FOR EACH result IN results:
    IF result.status == 'success':
      externalEvents = result.data.events
      
      FOR EACH externalEvent:
        existingEvent = FindEventByExternalId(externalEvent.externalId)
        
        IF existingEvent EXISTS:
          IF externalEvent.updatedAt > existingEvent.updatedAt:
            UpdateEvent(existingEvent, externalEvent)
          END IF
        ELSE:
          newEvent = CreateEventFromExternal(externalEvent)
          
          // Create classification task for event classifier agent
          classifyTask = CreateAgentTask(
            type: 'classify_event',
            priority: 'medium',
            payload: { event: newEvent }
          )
          QueueTask(classifyTask)
          
          StoreEvent(newEvent)
        END IF
      END FOR
      
      // Detect deleted events
      FOR EACH storedEvent WHERE source = result.sourceId:
        IF NOT ExistsInExternalEvents(storedEvent):
          MarkEventAsDeleted(storedEvent)
        END IF
      END FOR
      
      source.lastSyncTime = NOW()
      source.syncStatus = 'active'
      source.retryCount = 0
      
    ELSE IF result.status == 'failed':
      source.retryCount += 1
      IF source.retryCount < MAX_RETRIES:
        QueueRetryTask(source, RETRY_DELAY)
      ELSE:
        source.syncStatus = 'failed'
        AlertAdministrators(source, result.errors)
      END IF
    END IF
  END FOR
  
  // Step 5: Process classification results
  AgentOrchestrator.ProcessClassificationResults()
END ALGORITHM
```

### 2. AI Agent-Based Event Classification Algorithm

```
ALGORITHM AIAgentClassifyEvent(event)
  // Step 1: Create classification task
  task = CreateAgentTask(
    type: 'classify_event',
    priority: 'medium',
    payload: {
      eventId: event.id,
      title: event.title,
      description: event.description,
      startTime: event.startTime,
      endTime: event.endTime,
      location: event.location
    }
  )
  
  // Step 2: Assign to event classifier agent
  agent = AgentOrchestrator.GetAvailableAgent('event_classifier')
  result = agent.Execute(task)
  
  // Step 3: Process classification result
  IF result.status == 'success':
    classification = result.data
    
    IF classification.confidence > CONFIDENCE_THRESHOLD:
      event.category = classification.category
      event.classifiedByAgentId = agent.id
      event.classificationConfidence = classification.confidence
      RETURN ClassificationResult(
        category: classification.category,
        confidence: classification.confidence,
        requiresUserInput: false,
        reasoning: classification.reasoning
      )
    ELSE:
      // Low confidence - request user input
      RETURN ClassificationResult(
        category: null,
        confidence: classification.confidence,
        requiresUserInput: true,
        suggestedAlternatives: classification.alternatives,
        reasoning: classification.reasoning
      )
    END IF
  ELSE:
    // Agent failed - fallback to keyword matching
    RETURN FallbackKeywordClassification(event)
  END IF
END ALGORITHM
```

### 3. Agent Task Orchestration Algorithm

```
ALGORITHM OrchestrateTasks()
  WHILE system is running:
    // Step 1: Get pending tasks from queue
    pendingTasks = GetPendingTasks(limit: 100)
    
    // Step 2: Get available agents
    availableAgents = GetAvailableAgents()
    
    // Step 3: Match tasks to agents based on capabilities
    FOR EACH task IN pendingTasks:
      suitableAgents = FilterAgentsByCapability(availableAgents, task.type)
      
      IF suitableAgents.length > 0:
        // Select agent with lowest current load
        agent = SelectLeastLoadedAgent(suitableAgents)
        
        // Assign task to agent
        task.agentId = agent.id
        task.status = 'assigned'
        task.assignedAt = NOW()
        
        // Execute task asynchronously
        ExecuteTaskAsync(agent, task)
        
        // Mark agent as busy
        agent.status = 'busy'
      ELSE:
        // No suitable agent available - keep task in queue
        CONTINUE
      END IF
    END FOR
    
    // Step 4: Check for completed tasks
    completedTasks = GetCompletedTasks()
    FOR EACH task IN completedTasks:
      agent = GetAgentById(task.agentId)
      agent.status = 'idle'
      
      // Process task result
      ProcessTaskResult(task)
    END FOR
    
    // Step 5: Check for failed tasks and retry
    failedTasks = GetFailedTasks()
    FOR EACH task IN failedTasks:
      IF task.retryCount < task.maxRetries:
        task.retryCount += 1
        task.status = 'pending'
        task.agentId = null
        QueueTask(task)
      ELSE:
        LogTaskFailure(task)
        AlertAdministrators(task)
      END IF
    END FOR
    
    // Step 6: Health check agents
    PerformAgentHealthChecks()
    
    SLEEP(1 second)
  END WHILE
END ALGORITHM
```

### 4. Threshold Violation Detection Algorithm

```
ALGORITHM DetectThresholdViolations(weekStartDate, weekEndDate)
  violations = []
  
  FOR EACH family:
    FOR EACH threshold IN family.thresholds WHERE threshold.enabled:
      FOR EACH familyMember IN family.members:
        totalHours = CalculateTotalHours(
          familyMember,
          threshold.category,
          weekStartDate,
          weekEndDate
        )
        
        // Check maximum threshold
        IF threshold.maxHours AND totalHours > threshold.maxHours:
          violation = ThresholdViolation(
            type: 'max_exceeded',
            category: threshold.category,
            familyMemberId: familyMember.id,
            currentHours: totalHours,
            thresholdHours: threshold.maxHours
          )
          violations.Add(violation)
        END IF
        
        // Check minimum threshold (only at end of week)
        IF threshold.minHours AND NOW() >= weekEndDate:
          IF totalHours < threshold.minHours:
            violation = ThresholdViolation(
              type: 'min_not_met',
              category: threshold.category,
              familyMemberId: familyMember.id,
              currentHours: totalHours,
              thresholdHours: threshold.minHours
            )
            violations.Add(violation)
          END IF
        END IF
      END FOR
    END FOR
  END FOR
  
  RETURN violations
END ALGORITHM
```

### 5. Conflict Detection Algorithm

```
ALGORITHM DetectConflicts(newEvent)
  conflicts = []
  
  // Find all events for same family member in overlapping time range
  overlappingEvents = QueryEvents(
    familyMemberId: newEvent.familyMemberId,
    startTime <= newEvent.endTime,
    endTime >= newEvent.startTime,
    isDeleted: false
  )
  
  FOR EACH overlappingEvent:
    IF overlappingEvent.id != newEvent.id:
      conflict = ConflictDetectionResult(
        hasConflict: true,
        conflictingEvents: [newEvent, overlappingEvent],
        familyMemberId: newEvent.familyMemberId,
        timeRange: {
          start: MAX(newEvent.startTime, overlappingEvent.startTime),
          end: MIN(newEvent.endTime, overlappingEvent.endTime)
        }
      )
      conflicts.Add(conflict)
    END IF
  END FOR
  
  RETURN conflicts
END ALGORITHM
```

### 6. Weekly Summary Generation Algorithm

```
ALGORITHM GenerateWeeklySummary(weekStartDate, weekEndDate)
  summary = ConsolidatedSummary()
  summary.weekStartDate = weekStartDate
  summary.weekEndDate = weekEndDate
  
  // Collect events by day
  FOR EACH day FROM weekStartDate TO weekEndDate:
    dayEvents = QueryEvents(
      startTime >= day,
      startTime < day + 1 day,
      isDeleted: false
    )
    summary.eventsByDay[day] = dayEvents
  END FOR
  
  // Calculate time tracking metrics
  summary.timeTrackingMetrics = CalculateMetrics(weekStartDate, weekEndDate)
  
  // Generate insights
  insights = []
  
  // Insight 1: Category comparison
  previousWeekMetrics = CalculateMetrics(weekStartDate - 7 days, weekEndDate - 7 days)
  FOR EACH category:
    currentHours = summary.timeTrackingMetrics.timeAllocations[category].totalHours
    previousHours = previousWeekMetrics.timeAllocations[category].totalHours
    percentChange = ((currentHours - previousHours) / previousHours) * 100
    
    IF ABS(percentChange) > INSIGHT_THRESHOLD:
      insights.Add(GenerateInsightMessage(category, percentChange))
    END IF
  END FOR
  
  summary.insights = insights
  summary.generatedAt = NOW()
  
  RETURN summary
END ALGORITHM
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Now I'll use the prework tool to analyze the acceptance criteria before writing the correctness properties.

### Property 1: Multi-Source Event Retrieval

*For any* connected calendar source (Google, Outlook, Kids School, Kids Connect), when the system fetches events, all events from that source should be retrieved and stored in the consolidated calendar.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Synchronization Timeliness

*For any* external calendar source update, the consolidated calendar should reflect the change within 5 minutes of the update occurring.

**Validates: Requirements 1.5, 7.4**

### Property 3: Connection Retry Logic

*For any* failed calendar source connection, the system should retry the connection every 15 minutes for up to 2 hours before marking the source as failed.

**Validates: Requirements 1.6**

### Property 4: Data Preservation During Source Management

*For any* set of events in the consolidated calendar, adding, updating, or removing a calendar source should not delete or lose any existing events.

**Validates: Requirements 1.7**

### Property 5: Weekly Calendar Navigation

*For any* week selected by a user, the consolidated calendar view should display exactly 7 days (Monday through Sunday) with all events for that week.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 6: Event Information Completeness

*For any* event displayed in the consolidated calendar view, the display should include the event title, start time, end time, and assigned family member name.

**Validates: Requirements 2.4, 2.5**

### Property 7: Event Detail Retrieval

*For any* event in the consolidated calendar, clicking on the event should display all event details including description, location, and source calendar.

**Validates: Requirements 2.6**

### Property 8: Automatic Event Classification

*For any* event created or imported with a title and description, the event classifier should attempt to assign it to one of the five activity categories (Work, Family Time, Health/Fitness, Upskilling, Relaxation).

**Validates: Requirements 3.1, 3.2**

### Property 9: Manual Classification Learning

*For any* event manually classified by a user, when a similar event is created in the future, the system should suggest or automatically assign the same category.

**Validates: Requirements 3.3, 3.4**

### Property 10: Category Persistence

*For any* event with an assigned activity category, retrieving the event from the database should return the same category that was assigned.

**Validates: Requirements 3.6**

### Property 11: Dashboard Time Calculation

*For any* week and activity category, the total hours displayed in the time tracking dashboard should equal the sum of all event durations in that category for that week.

**Validates: Requirements 4.1, 4.2**

### Property 12: Dashboard Filtering by Family Member

*For any* selected family member, the time tracking dashboard should display only events belonging to that family member and calculate metrics based only on their events.

**Validates: Requirements 4.3**

### Property 13: Dashboard Date Range Filtering

*For any* selected date range, the time tracking dashboard should recalculate and display time allocation metrics only for events within that range.

**Validates: Requirements 4.4**

### Property 14: Comparative Metrics Accuracy

*For any* set of family members and activity categories, the average time per activity displayed in the dashboard should equal the sum of all family members' time in that category divided by the number of family members.

**Validates: Requirements 4.5**

### Property 15: Real-Time Dashboard Updates

*For any* new event added or existing event modified, the time tracking dashboard should update its displayed metrics within 1 second of the change.

**Validates: Requirements 4.6**

### Property 16: Maximum Threshold Violation Detection

*For any* configured maximum time threshold for an activity category, when a family member's total time in that category exceeds the threshold, a notification should be sent to designated recipients.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 17: Minimum Threshold Violation Detection

*For any* configured minimum time threshold for an activity category, when a family member's total time in that category falls below the threshold at the end of the week, a notification should be sent to designated recipients.

**Validates: Requirements 5a.1, 5a.2, 5a.3**

### Property 18: Threshold Notification Content

*For any* threshold violation notification, the notification should include the activity name, current time, threshold value, and family member name.

**Validates: Requirements 5.3, 5a.3**

### Property 19: Notification Delivery Channels

*For any* threshold violation, the system should send notifications through both email and in-app channels.

**Validates: Requirements 5.4, 5a.4**

### Property 20: Notification Preference Respect

*For any* family member with disabled notifications for a specific activity, no threshold notifications should be sent for that activity regardless of threshold violations.

**Validates: Requirements 5.6, 5a.5**

### Property 21: Weekly Summary Generation

*For any* Sunday at 6:00 PM, the system should generate a consolidated summary containing all events for the upcoming week organized by day and family member.

**Validates: Requirements 6.1, 6.2**

### Property 22: Summary Metrics Inclusion

*For any* generated consolidated summary, the summary should include time tracking metrics showing total hours per activity category for the past week.

**Validates: Requirements 6.3**

### Property 23: Summary Comparative Insights

*For any* generated consolidated summary, the summary should include comparative insights comparing current week metrics to previous week metrics.

**Validates: Requirements 6.4**

### Property 24: Event-Triggered Summary Distribution

*For any* event added, updated, or deleted, the system should generate and distribute an updated consolidated summary to all family members.

**Validates: Requirements 6.5**

### Property 25: Summary Opt-Out Respect

*For any* family member who has opted out of summary emails, no consolidated summaries should be sent to that member.

**Validates: Requirements 6.7**

### Property 26: Event Creation and Sync

*For any* event created in the consolidated calendar, the event should be stored in the database and synchronized to the primary calendar source.

**Validates: Requirements 7.1**

### Property 27: Event Update Synchronization

*For any* event edited in the consolidated calendar, the changes should be reflected in both the consolidated calendar and the source calendar.

**Validates: Requirements 7.2**

### Property 28: Event Deletion Synchronization

*For any* event deleted from the consolidated calendar, the event should be removed from both the consolidated calendar and the source calendar.

**Validates: Requirements 7.3**

### Property 29: Conflict Detection and Warning

*For any* overlapping events for the same family member, the system should detect the conflict and display a warning to the user.

**Validates: Requirements 7.5**

### Property 30: Event Audit Logging

*For any* event change (creation, update, deletion), the system should log the change with timestamp, user ID, and change details.

**Validates: Requirements 7.6**

### Property 31: Session Token Validity

*For any* user login with valid credentials, the system should create a session token that remains valid for 30 days from creation.

**Validates: Requirements 8.2**

### Property 32: Session Token Invalidation

*For any* user logout, the session token should be immediately invalidated and no longer accepted for authentication.

**Validates: Requirements 8.3**

### Property 33: Password Hashing

*For any* password stored in the system, the password should be hashed using bcrypt with a minimum of 12 rounds.

**Validates: Requirements 8.4**

### Property 34: Token Expiration Re-authentication

*For any* expired session token, the system should require the user to re-authenticate before granting access.

**Validates: Requirements 8.5**

### Property 35: User Access Revocation

*For any* family member removed from the calendar, their access should be immediately revoked and they should no longer be able to view or modify calendar data.

**Validates: Requirements 8.6, 8.7**

### Property 36: Data Persistence Round Trip

*For any* calendar event, user data, or configuration setting stored in the database, retrieving the data should return the same values that were stored.

**Validates: Requirements 9.1**

### Property 37: Backup Integrity Verification

*For any* backup created, the system should verify data integrity before marking the backup as complete.

**Validates: Requirements 9.3**

### Property 38: Backup Retention

*For any* backup created, the backup should be retained for a minimum of 30 days from creation.

**Validates: Requirements 9.4**

### Property 39: Data Recovery from Backup

*For any* detected data corruption, the system should restore from the most recent valid backup and return to a consistent state.

**Validates: Requirements 9.5**

### Property 40: Backup Operation Logging

*For any* backup operation, the system should log the operation with timestamp, backup size, and verification status.

**Validates: Requirements 9.6**

### Property 41: Connection Failure Fallback

*For any* failed calendar source connection, the system should display a user-friendly error message and continue operating with cached data.

**Validates: Requirements 10.1**

### Property 42: Network Error Retry Queuing

*For any* network error during event synchronization, the system should queue the operation and retry when connectivity is restored.

**Validates: Requirements 10.2**

### Property 43: Database Unavailability Handling

*For any* temporary database unavailability, the system should serve cached data to users and queue write operations for later execution.

**Validates: Requirements 10.3**

### Property 44: Error Logging Completeness

*For any* unexpected error, the system should log the error with full stack trace and context information.

**Validates: Requirements 10.4**

### Property 45: Error Message Sanitization

*For any* error displayed to users, the error message should not expose sensitive technical details or system internals.

**Validates: Requirements 10.5**

### Property 46: Critical Error Alerting

*For any* critical error, the system should send an alert email to administrators within 5 minutes of the error occurring.

**Validates: Requirements 10.6**

## Error Handling

### Connection Failures

**Scenario**: Calendar source connection fails (network timeout, authentication error, API unavailable)

**Handling Strategy**:
1. Log the error with full context (source type, timestamp, error message)
2. Display user-friendly message: "Calendar sync temporarily unavailable. Using cached data."
3. Implement exponential backoff retry: 15 minutes, 30 minutes, 1 hour, 2 hours (max)
4. After max retries, mark source as "failed" and alert administrators
5. Continue serving cached events to users

**Recovery**:
- Manual reconnection available in settings
- Automatic retry when connectivity is restored
- Sync all missed events when connection re-established

### Synchronization Conflicts

**Scenario**: Event modified in both external source and consolidated calendar

**Handling Strategy**:
1. Detect conflict during sync (compare timestamps and content)
2. Apply "last-write-wins" strategy with user notification
3. Log conflict with both versions for audit trail
4. Notify user of conflict resolution
5. Allow manual override if needed

### Threshold Violations

**Scenario**: Threshold calculation fails or notification delivery fails

**Handling Strategy**:
1. Catch calculation errors and log with context
2. Retry notification delivery up to 3 times
3. Queue failed notifications for manual review
4. Alert administrators if critical threshold alert fails
5. Provide manual threshold check in admin dashboard

### Database Unavailability

**Scenario**: Database connection lost or database is down

**Handling Strategy**:
1. Detect connection failure immediately
2. Switch to read-only mode using Redis cache
3. Queue all write operations in message queue
4. Display banner: "System in read-only mode. Changes will be saved when service restores."
5. Replay queued operations when database recovers
6. Verify data consistency after recovery

### Authentication Failures

**Scenario**: Invalid credentials, expired token, session hijacking

**Handling Strategy**:
1. Invalid credentials: Log attempt, display generic error, implement rate limiting
2. Expired token: Redirect to login with message "Session expired. Please log in again."
3. Suspicious activity: Log event, invalidate all sessions for user, send security alert
4. Password reset: Send verification email, require new password

## Testing Strategy

### Unit Testing Approach

Unit tests focus on specific examples, edge cases, and error conditions:

**Calendar Integration Tests**:
- Mock external calendar APIs
- Test successful event retrieval for each source type
- Test authentication failures and retry logic
- Test parsing of different event formats
- Test handling of malformed responses

**Event Classification Tests**:
- Test keyword matching for each category
- Test confidence scoring
- Test fallback to manual classification
- Test learning from user feedback
- Test edge cases (empty title, special characters)

**Time Calculation Tests**:
- Test calculation with overlapping events
- Test calculation with all-day events
- Test calculation across week boundaries
- Test with zero events
- Test with very long events

**Notification Tests**:
- Test threshold detection logic
- Test notification content generation
- Test delivery to multiple recipients
- Test preference respect
- Test retry logic

**Authentication Tests**:
- Test login with valid/invalid credentials
- Test password hashing with bcrypt
- Test session token creation and expiration
- Test token invalidation on logout
- Test rate limiting on failed attempts

**Error Handling Tests**:
- Test graceful degradation on connection failure
- Test error message sanitization
- Test retry logic with exponential backoff
- Test fallback to cached data
- Test error logging completeness

### Property-Based Testing Approach

Property-based tests verify universal properties across many generated inputs:

**Calendar Sync Properties**:
- **Feature: consolidated-weekly-family-calendar, Property 1: Multi-Source Event Retrieval**
  - Generate random events from each source type
  - Verify all events are retrieved and stored
  - Minimum 100 iterations

- **Feature: consolidated-weekly-family-calendar, Property 2: Synchronization Timeliness**
  - Generate random external updates
  - Measure sync time
  - Verify completion within 5 minutes
  - Minimum 100 iterations

**Event Classification Properties**:
- **Feature: consolidated-weekly-family-calendar, Property 8: Automatic Event Classification**
  - Generate random event titles and descriptions
  - Verify classification to one of five categories
  - Minimum 100 iterations

- **Feature: consolidated-weekly-family-calendar, Property 9: Manual Classification Learning**
  - Generate similar events with manual classifications
  - Verify subsequent events are classified consistently
  - Minimum 100 iterations

**Time Calculation Properties**:
- **Feature: consolidated-weekly-family-calendar, Property 11: Dashboard Time Calculation**
  - Generate random events in each category
  - Verify total hours match sum of event durations
  - Minimum 100 iterations

- **Feature: consolidated-weekly-family-calendar, Property 14: Comparative Metrics Accuracy**
  - Generate random events for multiple family members
  - Verify average calculations are correct
  - Minimum 100 iterations

**Threshold Detection Properties**:
- **Feature: consolidated-weekly-family-calendar, Property 16: Maximum Threshold Violation Detection**
  - Generate random events exceeding thresholds
  - Verify notifications are sent
  - Minimum 100 iterations

- **Feature: consolidated-weekly-family-calendar, Property 17: Minimum Threshold Violation Detection**
  - Generate random events below minimum thresholds
  - Verify notifications are sent at week end
  - Minimum 100 iterations

**Data Persistence Properties**:
- **Feature: consolidated-weekly-family-calendar, Property 36: Data Persistence Round Trip**
  - Generate random events, users, and settings
  - Store and retrieve from database
  - Verify data matches original
  - Minimum 100 iterations

**Authentication Properties**:
- **Feature: consolidated-weekly-family-calendar, Property 31: Session Token Validity**
  - Generate random login credentials
  - Create sessions and verify token validity
  - Minimum 100 iterations

- **Feature: consolidated-weekly-family-calendar, Property 33: Password Hashing**
  - Generate random passwords
  - Hash with bcrypt
  - Verify hashing uses 12+ rounds
  - Minimum 100 iterations

**Error Handling Properties**:
- **Feature: consolidated-weekly-family-calendar, Property 41: Connection Failure Fallback**
  - Simulate random connection failures
  - Verify cached data is served
  - Verify user-friendly error messages
  - Minimum 100 iterations

- **Feature: consolidated-weekly-family-calendar, Property 42: Network Error Retry Queuing**
  - Simulate random network errors
  - Verify operations are queued
  - Verify retry on connectivity restoration
  - Minimum 100 iterations

### Test Coverage Goals

- **Unit Tests**: 80% code coverage minimum
- **Property Tests**: All 46 correctness properties covered
- **Integration Tests**: All component interactions tested
- **End-to-End Tests**: Critical user workflows tested
- **Performance Tests**: Dashboard load time < 3 seconds, sync time < 5 minutes
- **Security Tests**: Authentication, authorization, data encryption

### Test Execution

- Unit tests: Run on every commit
- Property tests: Run nightly with 100+ iterations per property
- Integration tests: Run on pull requests
- End-to-end tests: Run before production deployment
- Performance tests: Run weekly
- Security tests: Run monthly

