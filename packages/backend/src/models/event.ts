/**
 * Event Model
 * Represents a calendar event in the consolidated calendar
 */

export type EventSource = 'google' | 'outlook' | 'kids_school' | 'kids_connect' | 'extracurricular' | 'internal';
export type ActivityCategoryName = 'Work' | 'Family Time' | 'Health/Fitness' | 'Upskilling' | 'Relaxation';

export interface Event {
  id: string;
  familyId: string;
  familyMemberId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  category?: ActivityCategoryName;
  attendees?: string[];
  source: EventSource;
  externalId?: string;
  sourceId?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isDeleted: boolean;
  classifiedByAgentId?: string;
  classificationConfidence?: number;
}

export interface EventData {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  category?: ActivityCategoryName;
  attendees?: string[];
}

export interface EventDynamoDBItem {
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
  category?: ActivityCategoryName;
  attendees?: string[];
  source: EventSource;
  externalId?: string;
  sourceId?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  createdBy: string;
  isDeleted: boolean;
  classifiedByAgentId?: string;
  classificationConfidence?: number;
}

/**
 * Validation result for event data
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Convert Event to DynamoDB item
 */
export function eventToDynamoDB(event: Event): EventDynamoDBItem {
  const date = event.startTime.toISOString().split('T')[0];
  return {
    PK: `FAMILY#${event.familyId}`,
    SK: `EVENT#${event.id}`,
    GSI1PK: `FAMILY#${event.familyId}#EVENTS`,
    GSI1SK: `${date}#${event.id}`,
    EntityType: 'EVENT',
    id: event.id,
    familyId: event.familyId,
    familyMemberId: event.familyMemberId,
    title: event.title,
    description: event.description,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    location: event.location,
    category: event.category,
    attendees: event.attendees,
    source: event.source,
    externalId: event.externalId,
    sourceId: event.sourceId,
    createdAt: event.createdAt.toISOString(),
    updatedAt: event.updatedAt.toISOString(),
    createdBy: event.createdBy,
    isDeleted: event.isDeleted,
    classifiedByAgentId: event.classifiedByAgentId,
    classificationConfidence: event.classificationConfidence,
  };
}

/**
 * Convert DynamoDB item to Event
 */
export function eventFromDynamoDB(item: EventDynamoDBItem): Event {
  return {
    id: item.id,
    familyId: item.familyId,
    familyMemberId: item.familyMemberId,
    title: item.title,
    description: item.description,
    startTime: new Date(item.startTime),
    endTime: new Date(item.endTime),
    location: item.location,
    category: item.category,
    attendees: item.attendees,
    source: item.source,
    externalId: item.externalId,
    sourceId: item.sourceId,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    createdBy: item.createdBy,
    isDeleted: item.isDeleted,
    classifiedByAgentId: item.classifiedByAgentId,
    classificationConfidence: item.classificationConfidence,
  };
}

/**
 * Validate event data
 */
export function validateEventData(data: Partial<EventData>): ValidationResult {
  const errors: string[] = [];

  // Required fields
  if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
    errors.push('title is required and must be a non-empty string');
  }

  if (!data.startTime || !(data.startTime instanceof Date)) {
    errors.push('startTime is required and must be a valid Date');
  }

  if (!data.endTime || !(data.endTime instanceof Date)) {
    errors.push('endTime is required and must be a valid Date');
  }

  // Validate date logic
  if (data.startTime && data.endTime && data.startTime >= data.endTime) {
    errors.push('startTime must be before endTime');
  }

  // Optional fields validation
  if (data.description !== undefined && typeof data.description !== 'string') {
    errors.push('description must be a string');
  }

  if (data.location !== undefined && typeof data.location !== 'string') {
    errors.push('location must be a string');
  }

  if (data.category !== undefined) {
    const validCategories: ActivityCategoryName[] = [
      'Work',
      'Family Time',
      'Health/Fitness',
      'Upskilling',
      'Relaxation',
    ];
    if (!validCategories.includes(data.category)) {
      errors.push(
        `category must be one of: ${validCategories.join(', ')}`
      );
    }
  }

  if (data.attendees !== undefined) {
    if (!Array.isArray(data.attendees)) {
      errors.push('attendees must be an array');
    } else if (!data.attendees.every((a) => typeof a === 'string')) {
      errors.push('all attendees must be strings');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate event for creation
 */
export function validateEventForCreation(
  data: Partial<EventData>,
  familyId: string,
  familyMemberId: string,
  createdBy: string
): ValidationResult {
  const baseValidation = validateEventData(data);

  if (!familyId || typeof familyId !== 'string') {
    baseValidation.errors.push('familyId is required');
  }

  if (!familyMemberId || typeof familyMemberId !== 'string') {
    baseValidation.errors.push('familyMemberId is required');
  }

  if (!createdBy || typeof createdBy !== 'string') {
    baseValidation.errors.push('createdBy is required');
  }

  return {
    valid: baseValidation.errors.length === 0,
    errors: baseValidation.errors,
  };
}
