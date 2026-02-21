/**
 * DynamoDB Single-Table Schema Design
 * 
 * This file defines the schema structure, access patterns, and TypeScript types
 * for the FamilyCalendar DynamoDB table.
 */

// ============================================================================
// TABLE CONFIGURATION
// ============================================================================

export const TABLE_CONFIG = {
  tableName: 'FamilyCalendar',
  billingMode: 'PAY_PER_REQUEST', // On-demand billing
  
  // Primary Key
  partitionKey: 'PK',
  sortKey: 'SK',
  
  // Global Secondary Indexes
  gsi1: {
    name: 'GSI1',
    partitionKey: 'GSI1PK',
    sortKey: 'GSI1SK',
  },
  gsi2: {
    name: 'GSI2',
    partitionKey: 'GSI2PK',
    sortKey: 'GSI2SK',
  },
  
  // TTL attribute for auto-expiring items
  ttlAttribute: 'TTL',
  
  // Stream configuration for audit logging
  streamEnabled: true,
  streamViewType: 'NEW_AND_OLD_IMAGES',
} as const;

// ============================================================================
// ACCESS PATTERNS
// ============================================================================

/**
 * Access Pattern 1: Get family by ID
 * PK: FAMILY#<familyId>
 * SK: FAMILY#<familyId>
 */

/**
 * Access Pattern 2: Get all family members
 * PK: FAMILY#<familyId>
 * SK: MEMBER#<memberId>
 */

/**
 * Access Pattern 3: Get all events for a family
 * PK: FAMILY#<familyId>
 * SK: EVENT#<eventId>
 */

/**
 * Access Pattern 4: Get events by date range (using GSI1)
 * GSI1PK: FAMILY#<familyId>#EVENTS
 * GSI1SK: <YYYY-MM-DD>#<eventId>
 */

/**
 * Access Pattern 5: Get user sessions
 * PK: USER#<userId>
 * SK: SESSION#<sessionToken>
 */

/**
 * Access Pattern 6: Get agent tasks by status (using GSI2)
 * GSI2PK: AGENT_TASKS
 * GSI2SK: <status>#<createdAt>
 */

/**
 * Access Pattern 7: Get weather data by date
 * PK: FAMILY#<familyId>
 * SK: WEATHER#<YYYY-MM-DD>
 */

/**
 * Access Pattern 8: Get activity thresholds
 * PK: FAMILY#<familyId>
 * SK: THRESHOLD#<category>
 */

/**
 * Access Pattern 9: Get notifications for user
 * PK: USER#<userId>
 * SK: NOTIFICATION#<timestamp>#<notificationId>
 */

/**
 * Access Pattern 10: Get agent by ID
 * PK: AGENT#<agentId>
 * SK: AGENT#<agentId>
 */

/**
 * Access Pattern 11: Get calendar sources for family member
 * PK: FAMILY#<familyId>
 * SK: SOURCE#<sourceId>
 */

/**
 * Access Pattern 12: Get extracurricular activities
 * PK: FAMILY#<familyId>
 * SK: EXTRACURRICULAR#<activityId>
 */

/**
 * Access Pattern 13: Get audit logs for family
 * PK: FAMILY#<familyId>
 * SK: AUDIT#<timestamp>#<logId>
 */

// ============================================================================
// KEY BUILDERS
// ============================================================================

export const KeyBuilder = {
  // Family keys
  family: (familyId: string) => ({
    PK: `FAMILY#${familyId}`,
    SK: `FAMILY#${familyId}`,
  }),
  
  // Family member keys
  familyMember: (familyId: string, memberId: string) => ({
    PK: `FAMILY#${familyId}`,
    SK: `MEMBER#${memberId}`,
  }),
  
  // Event keys
  event: (familyId: string, eventId: string) => ({
    PK: `FAMILY#${familyId}`,
    SK: `EVENT#${eventId}`,
  }),
  
  // Event date range keys (GSI1)
  eventByDate: (familyId: string, date: string, eventId: string) => ({
    GSI1PK: `FAMILY#${familyId}#EVENTS`,
    GSI1SK: `${date}#${eventId}`,
  }),
  
  // User session keys
  session: (userId: string, sessionToken: string) => ({
    PK: `USER#${userId}`,
    SK: `SESSION#${sessionToken}`,
  }),
  
  // Agent keys
  agent: (agentId: string) => ({
    PK: `AGENT#${agentId}`,
    SK: `AGENT#${agentId}`,
  }),
  
  // Agent task keys
  agentTask: (taskId: string) => ({
    PK: `AGENT_TASK#${taskId}`,
    SK: `AGENT_TASK#${taskId}`,
  }),
  
  // Agent task by status keys (GSI2)
  agentTaskByStatus: (status: string, createdAt: string) => ({
    GSI2PK: 'AGENT_TASKS',
    GSI2SK: `${status}#${createdAt}`,
  }),
  
  // Weather data keys
  weather: (familyId: string, date: string) => ({
    PK: `FAMILY#${familyId}`,
    SK: `WEATHER#${date}`,
  }),
  
  // Activity threshold keys
  threshold: (familyId: string, category: string) => ({
    PK: `FAMILY#${familyId}`,
    SK: `THRESHOLD#${category}`,
  }),
  
  // Notification keys
  notification: (userId: string, timestamp: string, notificationId: string) => ({
    PK: `USER#${userId}`,
    SK: `NOTIFICATION#${timestamp}#${notificationId}`,
  }),
  
  // Calendar source keys
  calendarSource: (familyId: string, sourceId: string) => ({
    PK: `FAMILY#${familyId}`,
    SK: `SOURCE#${sourceId}`,
  }),
  
  // Extracurricular activity keys
  extracurricular: (familyId: string, activityId: string) => ({
    PK: `FAMILY#${familyId}`,
    SK: `EXTRACURRICULAR#${activityId}`,
  }),
  
  // Audit log keys
  auditLog: (familyId: string, timestamp: string, logId: string) => ({
    PK: `FAMILY#${familyId}`,
    SK: `AUDIT#${timestamp}#${logId}`,
  }),
} as const;

// ============================================================================
// BASE TYPES
// ============================================================================

export interface BaseEntity {
  PK: string;
  SK: string;
  EntityType: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ============================================================================
// ENTITY TYPES
// ============================================================================

export interface FamilyEntity extends BaseEntity {
  EntityType: 'FAMILY';
  id: string;
  name: string;
}

export interface FamilyMemberEntity extends BaseEntity {
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

export interface EventEntity extends BaseEntity {
  EntityType: 'EVENT';
  GSI1PK: string; // For date range queries
  GSI1SK: string; // For date range queries
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
  isDeleted: boolean;
  classifiedByAgentId?: string;
  classificationConfidence?: number;
}

export interface SessionEntity extends BaseEntity {
  EntityType: 'SESSION';
  id: string;
  userId: string;
  token: string;
  expiresAt: string; // ISO 8601
  lastActivityAt: string; // ISO 8601
  TTL: number; // Unix timestamp for DynamoDB TTL
}

export interface AgentEntity extends BaseEntity {
  EntityType: 'AGENT';
  id: string;
  type: 'calendar_query' | 'event_parser' | 'event_classifier' | 'weather';
  name: string;
  capabilities: string[];
  status: 'idle' | 'busy' | 'failed' | 'offline';
  lastHealthCheck: string; // ISO 8601
}

export interface AgentTaskEntity extends BaseEntity {
  EntityType: 'AGENT_TASK';
  GSI2PK: string; // For status queries
  GSI2SK: string; // For status queries
  id: string;
  agentId?: string;
  type: 'query_calendar' | 'parse_events' | 'classify_event' | 'fetch_weather';
  priority: 'high' | 'medium' | 'low';
  payload: any;
  sourceId?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'failed';
  retryCount: number;
  maxRetries: number;
  assignedAt?: string; // ISO 8601
  completedAt?: string; // ISO 8601
  errorMessage?: string;
  TTL?: number; // Auto-delete completed tasks after 7 days
}

export interface WeatherDataEntity extends BaseEntity {
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

export interface ActivityThresholdEntity extends BaseEntity {
  EntityType: 'THRESHOLD';
  familyId: string;
  category: string;
  maxHours?: number;
  minHours?: number;
  notificationRecipients: string[]; // Array of member IDs
  enabled: boolean;
}

export interface NotificationEntity extends BaseEntity {
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
  sentAt?: string; // ISO 8601
  failureReason?: string;
  TTL?: number; // Auto-delete after 90 days
}

export interface NotificationPreferenceEntity extends BaseEntity {
  EntityType: 'NOTIFICATION_PREFERENCE';
  id: string;
  familyMemberId: string;
  categoryId?: string;
  categoryName?: string;
  disableThresholdAlerts: boolean;
  disableSummaryEmails: boolean;
  disableEventUpdates: boolean;
  disableConflictAlerts: boolean;
  preferredChannels: ('email' | 'in_app')[];
}

export interface CalendarSourceEntity extends BaseEntity {
  EntityType: 'CALENDAR_SOURCE';
  id: string;
  familyMemberId: string;
  type: 'google' | 'outlook' | 'kids_school' | 'kids_connect';
  credentials: string; // Encrypted credentials
  lastSyncTime: string; // ISO 8601
  syncStatus: 'active' | 'failed' | 'disconnected';
  retryCount: number;
  assignedAgentId?: string;
}

export interface ExtracurricularActivityEntity extends BaseEntity {
  EntityType: 'EXTRACURRICULAR';
  id: string;
  familyId: string;
  familyMemberId: string;
  activityType: 'sports' | 'music' | 'clubs' | 'other';
  name: string;
  schedule: string; // e.g., "Every Monday 4-5 PM"
  location: string;
}

export interface AuditLogEntity extends BaseEntity {
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

export interface OnboardingStateEntity extends BaseEntity {
  EntityType: 'ONBOARDING_STATE';
  userId: string;
  familyId: string;
  isComplete: boolean;
  selectedSources: string[];
  connectedSources: Record<string, boolean>;
  categoryTrackingEnabled: boolean;
  customCategories: string[];
  timeAllocations: Record<string, { ideal: number; max?: number; min?: number }>;
  completedAt?: string; // ISO 8601
}

export interface ActivityCategoryEntity extends BaseEntity {
  EntityType: 'ACTIVITY_CATEGORY';
  id: string;
  familyId: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  keywords: string[];
}

// ============================================================================
// UNION TYPE FOR ALL ENTITIES
// ============================================================================

export type DynamoDBEntity =
  | FamilyEntity
  | FamilyMemberEntity
  | EventEntity
  | SessionEntity
  | AgentEntity
  | AgentTaskEntity
  | WeatherDataEntity
  | ActivityThresholdEntity
  | NotificationEntity
  | NotificationPreferenceEntity
  | CalendarSourceEntity
  | ExtracurricularActivityEntity
  | AuditLogEntity
  | OnboardingStateEntity
  | ActivityCategoryEntity;

// ============================================================================
// QUERY HELPERS
// ============================================================================

export const QueryPatterns = {
  // Query all items with a specific PK
  byPartitionKey: (pk: string) => ({
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: {
      ':pk': pk,
    },
  }),
  
  // Query items with PK and SK prefix
  byPartitionAndSortPrefix: (pk: string, skPrefix: string) => ({
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: {
      ':pk': pk,
      ':skPrefix': skPrefix,
    },
  }),
  
  // Query events by date range using GSI1
  eventsByDateRange: (familyId: string, startDate: string, endDate: string) => ({
    IndexName: TABLE_CONFIG.gsi1.name,
    KeyConditionExpression: 'GSI1PK = :gsi1pk AND GSI1SK BETWEEN :startDate AND :endDate',
    ExpressionAttributeValues: {
      ':gsi1pk': `FAMILY#${familyId}#EVENTS`,
      ':startDate': startDate,
      ':endDate': `${endDate}~`, // Tilde ensures we get all events on end date
    },
  }),
  
  // Query agent tasks by status using GSI2
  agentTasksByStatus: (status: string) => ({
    IndexName: TABLE_CONFIG.gsi2.name,
    KeyConditionExpression: 'GSI2PK = :gsi2pk AND begins_with(GSI2SK, :status)',
    ExpressionAttributeValues: {
      ':gsi2pk': 'AGENT_TASKS',
      ':status': status,
    },
  }),
} as const;
