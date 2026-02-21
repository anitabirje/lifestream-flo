# Technical Design Document: Consolidated Weekly Family Calendar with Time Tracking Dashboard

## Overview

The Consolidated Weekly Family Calendar with Time Tracking Dashboard is a web-based system that aggregates calendar events from multiple external sources (Google Calendar, Outlook, Kids School Newsletter, Kids Connect) into a unified weekly view. The system provides real-time visibility into family schedules and includes a time tracking dashboard that monitors time spent across five activity categories: Work, Family Time, Health/Fitness, Upskilling, and Relaxation.

The system architecture follows a modular design with clear separation of concerns:
- **Calendar Integration Layer**: Handles connections to external calendar sources
- **Synchronization Engine**: Manages real-time event updates and conflict resolution
- **Event Classification Engine**: Automatically categorizes events and learns from user feedback
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
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼──────────┐
│ Calendar     │  │ Event       │  │ Analytics &    │
│ Integration  │  │ Management  │  │ Notification   │
│ Service      │  │ Service     │  │ Service        │
└───────┬──────┘  └──────┬──────┘  └─────┬──────────┘
        │                │               │
        └────────────────┼───────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼──────────┐
│ Sync Engine  │  │ Event       │  │ Notification   │
│ & Queue      │  │ Classifier  │  │ Queue          │
└───────┬──────┘  └──────┬──────┘  └─────┬──────────┘
        │                │               │
        └────────────────┼───────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌──────▼──────┐  ┌─────▼──────────┐
│ PostgreSQL   │  │ Redis Cache │  │ Message Queue  │
│ Database     │  │ (Sessions,  │  │ (Async Tasks)  │
│              │  │  Metadata)  │  │                │
└──────────────┘  └─────────────┘  └────────────────┘
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
┌──────────────────────┐
│ Calendar Integrator  │ ◄─── Periodic Sync (5 min)
│ (OAuth, API Clients) │
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
│ Event Classifier     │
│ (Category Assignment)│
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

### 1. Calendar Integration Service

**Responsibility**: Connect to external calendar sources and retrieve events.

**Key Components**:
- `GoogleCalendarConnector`: OAuth 2.0 integration with Google Calendar API
- `OutlookCalendarConnector`: OAuth 2.0 integration with Microsoft Graph API
- `KidsSchoolNewsletterParser`: Email parser for school newsletter events
- `KidsConnectConnector`: API client for Kids Connect platform
- `CalendarSourceRegistry`: Manages active calendar source connections

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
}

interface CalendarSource {
  id: string;
  familyMemberId: string;
  type: 'google' | 'outlook' | 'kids_school' | 'kids_connect';
  credentials: EncryptedCredentials;
  lastSyncTime: Date;
  syncStatus: 'active' | 'failed' | 'disconnected';
  retryCount: number;
}
```

### 2. Synchronization Engine

**Responsibility**: Manage real-time event synchronization and conflict detection.

**Key Components**:
- `SyncScheduler`: Triggers sync operations every 5 minutes
- `ConflictDetector`: Identifies overlapping events for same family member
- `SyncQueue`: Manages pending sync operations with retry logic
- `ChangeDetector`: Identifies new, updated, and deleted events

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

### 3. Event Classifier

**Responsibility**: Automatically categorize events and learn from user feedback.

**Key Components**:
- `KeywordMatcher`: Matches event titles/descriptions against category keywords
- `MLClassifier`: Machine learning model for confidence-based classification
- `UserFeedbackLearner`: Updates classification rules based on user corrections
- `CategoryAssigner`: Assigns categories to events

**Interfaces**:

```typescript
interface ClassificationResult {
  category: ActivityCategory;
  confidence: number; // 0-1
  requiresUserInput: boolean;
  suggestedAlternatives?: ActivityCategory[];
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
}
```

### 4. Analytics & Dashboard Service

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

### 5. Notification Engine

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

### 6. Event Management Service

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

### 7. Authentication & Access Control Service

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

### 8. Data Persistence Service

**Responsibility**: Handle database operations and backup management.

**Key Components**:
- `DatabaseConnection`: Manages PostgreSQL connections
- `BackupScheduler`: Triggers daily backups at 2:00 AM UTC
- `BackupVerifier`: Validates backup integrity
- `RecoveryManager`: Handles data restoration

**Interfaces**:

```typescript
interface BackupOperation {
  id: string;
  startTime: Date;
  endTime?: Date;
  status: 'in_progress' | 'completed' | 'failed';
  backupSize: number; // bytes
  verificationStatus: 'pending' | 'verified' | 'failed';
  retentionUntil: Date;
  errorMessage?: string;
}

interface DatabaseHealthCheck {
  isConnected: boolean;
  responseTime: number; // milliseconds
  lastCheck: Date;
  status: 'healthy' | 'degraded' | 'unavailable';
}
```

## Data Models

### Core Data Entities

```typescript
// Family
interface Family {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
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
  entityType: 'event' | 'calendar_source' | 'user' | 'threshold';
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

### Database Schema (PostgreSQL)

```sql
-- Families
CREATE TABLE families (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Family Members
CREATE TABLE family_members (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id),
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active',
  last_login_at TIMESTAMP
);

-- Calendar Sources
CREATE TABLE calendar_sources (
  id UUID PRIMARY KEY,
  family_member_id UUID NOT NULL REFERENCES family_members(id),
  type VARCHAR(50) NOT NULL,
  credentials_encrypted TEXT NOT NULL,
  last_sync_time TIMESTAMP,
  sync_status VARCHAR(50) DEFAULT 'active',
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events
CREATE TABLE events (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id),
  family_member_id UUID NOT NULL REFERENCES family_members(id),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  location VARCHAR(255),
  category VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  external_id VARCHAR(255),
  source_id UUID REFERENCES calendar_sources(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES family_members(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  INDEX idx_family_id (family_id),
  INDEX idx_family_member_id (family_member_id),
  INDEX idx_start_time (start_time),
  INDEX idx_end_time (end_time)
);

-- Activity Thresholds
CREATE TABLE activity_thresholds (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id),
  category VARCHAR(50) NOT NULL,
  max_hours DECIMAL(5,2),
  min_hours DECIMAL(5,2),
  notification_recipients TEXT NOT NULL, -- JSON array of family member IDs
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id),
  recipient_id UUID NOT NULL REFERENCES family_members(id),
  type VARCHAR(50) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  html_content TEXT,
  channels TEXT NOT NULL, -- JSON array
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_at TIMESTAMP,
  failure_reason TEXT,
  INDEX idx_recipient_id (recipient_id),
  INDEX idx_status (status)
);

-- Notification Preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY,
  family_member_id UUID NOT NULL REFERENCES family_members(id),
  category VARCHAR(50) NOT NULL,
  disable_threshold_alerts BOOLEAN DEFAULT FALSE,
  disable_summary_emails BOOLEAN DEFAULT FALSE,
  preferred_channels TEXT NOT NULL, -- JSON array
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  family_id UUID NOT NULL REFERENCES families(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL,
  changed_by UUID NOT NULL REFERENCES family_members(id),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  previous_values JSONB,
  new_values JSONB,
  INDEX idx_family_id (family_id),
  INDEX idx_timestamp (timestamp)
);

-- Backup Records
CREATE TABLE backup_records (
  id UUID PRIMARY KEY,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  status VARCHAR(50) NOT NULL,
  backup_size BIGINT NOT NULL,
  verification_status VARCHAR(50) NOT NULL,
  retention_until TIMESTAMP NOT NULL,
  error_message TEXT
);

-- Sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES family_members(id),
  token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token (token),
  INDEX idx_expires_at (expires_at)
);
```

## Key Algorithms

### 1. Event Synchronization Algorithm

```
ALGORITHM SyncCalendarSources()
  FOR EACH active calendar source:
    TRY
      externalEvents = FetchEventsFromSource(source, lastSyncTime)
      
      FOR EACH externalEvent:
        existingEvent = FindEventByExternalId(externalEvent.externalId)
        
        IF existingEvent EXISTS:
          IF externalEvent.updatedAt > existingEvent.updatedAt:
            UpdateEvent(existingEvent, externalEvent)
          END IF
        ELSE:
          newEvent = CreateEventFromExternal(externalEvent)
          ClassifyEvent(newEvent)
          StoreEvent(newEvent)
        END IF
      END FOR
      
      // Detect deleted events
      FOR EACH storedEvent WHERE source = source:
        IF NOT ExistsInExternalEvents(storedEvent):
          MarkEventAsDeleted(storedEvent)
        END IF
      END FOR
      
      source.lastSyncTime = NOW()
      source.syncStatus = 'active'
      source.retryCount = 0
      
    CATCH error:
      source.retryCount += 1
      IF source.retryCount < MAX_RETRIES:
        QueueRetry(source, RETRY_DELAY)
      ELSE:
        source.syncStatus = 'failed'
        AlertAdministrators(source, error)
      END IF
    END TRY
  END FOR
END ALGORITHM
```

### 2. Event Classification Algorithm

```
ALGORITHM ClassifyEvent(event)
  // Step 1: Keyword matching
  FOR EACH category:
    matchScore = CalculateKeywordMatchScore(event.title, event.description, category.keywords)
    IF matchScore > CONFIDENCE_THRESHOLD:
      RETURN ClassificationResult(category, matchScore, false)
    END IF
  END FOR
  
  // Step 2: ML-based classification
  mlPrediction = MLClassifier.Predict(event)
  IF mlPrediction.confidence > CONFIDENCE_THRESHOLD:
    RETURN ClassificationResult(mlPrediction.category, mlPrediction.confidence, false)
  END IF
  
  // Step 3: User input required
  RETURN ClassificationResult(null, 0, true, mlPrediction.alternatives)
END ALGORITHM
```

### 3. Threshold Violation Detection Algorithm

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

### 4. Conflict Detection Algorithm

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

### 5. Weekly Summary Generation Algorithm

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

