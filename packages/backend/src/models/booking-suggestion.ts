/**
 * Booking Suggestion Model
 * Represents a proactive time booking suggestion for insufficient activity categories
 */

import { ActivityCategoryName } from './event';

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  durationHours: number;
  dayOfWeek: string;
}

export interface BookingSuggestion {
  id: string;
  familyId: string;
  familyMemberId: string;
  category: ActivityCategoryName;
  categoryId: string;
  currentHours: number;
  targetHours: number;
  shortfallHours: number;
  suggestedSlots: TimeSlot[];
  createdAt: Date;
  updatedAt: Date;
  status: 'pending' | 'accepted' | 'dismissed' | 'modified';
  acceptedSlots?: TimeSlot[]; // Slots the user accepted
  dismissedAt?: Date;
}

export interface BookingSuggestionDynamoDBItem {
  PK: string; // FAMILY#<familyId>
  SK: string; // BOOKING_SUGGESTION#<suggestionId>
  EntityType: 'BOOKING_SUGGESTION';
  id: string;
  familyId: string;
  familyMemberId: string;
  category: ActivityCategoryName;
  categoryId: string;
  currentHours: number;
  targetHours: number;
  shortfallHours: number;
  suggestedSlots: Array<{
    startTime: string; // ISO 8601
    endTime: string; // ISO 8601
    durationHours: number;
    dayOfWeek: string;
  }>;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  status: 'pending' | 'accepted' | 'dismissed' | 'modified';
  acceptedSlots?: Array<{
    startTime: string; // ISO 8601
    endTime: string; // ISO 8601
    durationHours: number;
    dayOfWeek: string;
  }>;
  dismissedAt?: string; // ISO 8601
  TTL?: number; // Auto-delete after 30 days
}

/**
 * Convert BookingSuggestion to DynamoDB item
 */
export function bookingSuggestionToDynamoDB(suggestion: BookingSuggestion): BookingSuggestionDynamoDBItem {
  return {
    PK: `FAMILY#${suggestion.familyId}`,
    SK: `BOOKING_SUGGESTION#${suggestion.id}`,
    EntityType: 'BOOKING_SUGGESTION',
    id: suggestion.id,
    familyId: suggestion.familyId,
    familyMemberId: suggestion.familyMemberId,
    category: suggestion.category,
    categoryId: suggestion.categoryId,
    currentHours: suggestion.currentHours,
    targetHours: suggestion.targetHours,
    shortfallHours: suggestion.shortfallHours,
    suggestedSlots: suggestion.suggestedSlots.map((slot) => ({
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      durationHours: slot.durationHours,
      dayOfWeek: slot.dayOfWeek,
    })),
    createdAt: suggestion.createdAt.toISOString(),
    updatedAt: suggestion.updatedAt.toISOString(),
    status: suggestion.status,
    acceptedSlots: suggestion.acceptedSlots?.map((slot) => ({
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
      durationHours: slot.durationHours,
      dayOfWeek: slot.dayOfWeek,
    })),
    dismissedAt: suggestion.dismissedAt?.toISOString(),
    TTL: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days
  };
}

/**
 * Convert DynamoDB item to BookingSuggestion
 */
export function bookingSuggestionFromDynamoDB(item: BookingSuggestionDynamoDBItem): BookingSuggestion {
  return {
    id: item.id,
    familyId: item.familyId,
    familyMemberId: item.familyMemberId,
    category: item.category,
    categoryId: item.categoryId,
    currentHours: item.currentHours,
    targetHours: item.targetHours,
    shortfallHours: item.shortfallHours,
    suggestedSlots: item.suggestedSlots.map((slot) => ({
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
      durationHours: slot.durationHours,
      dayOfWeek: slot.dayOfWeek,
    })),
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
    status: item.status,
    acceptedSlots: item.acceptedSlots?.map((slot) => ({
      startTime: new Date(slot.startTime),
      endTime: new Date(slot.endTime),
      durationHours: slot.durationHours,
      dayOfWeek: slot.dayOfWeek,
    })),
    dismissedAt: item.dismissedAt ? new Date(item.dismissedAt) : undefined,
  };
}

/**
 * Validation result for booking suggestion
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate booking suggestion
 */
export function validateBookingSuggestion(suggestion: Partial<BookingSuggestion>): ValidationResult {
  const errors: string[] = [];

  if (!suggestion.familyId || typeof suggestion.familyId !== 'string') {
    errors.push('familyId is required');
  }

  if (!suggestion.familyMemberId || typeof suggestion.familyMemberId !== 'string') {
    errors.push('familyMemberId is required');
  }

  if (!suggestion.category || typeof suggestion.category !== 'string') {
    errors.push('category is required');
  }

  if (suggestion.currentHours === undefined || typeof suggestion.currentHours !== 'number') {
    errors.push('currentHours is required and must be a number');
  }

  if (suggestion.targetHours === undefined || typeof suggestion.targetHours !== 'number') {
    errors.push('targetHours is required and must be a number');
  }

  if (suggestion.shortfallHours === undefined || typeof suggestion.shortfallHours !== 'number') {
    errors.push('shortfallHours is required and must be a number');
  }

  if (!Array.isArray(suggestion.suggestedSlots)) {
    errors.push('suggestedSlots must be an array');
  }

  if (!suggestion.status || !['pending', 'accepted', 'dismissed', 'modified'].includes(suggestion.status)) {
    errors.push('status must be one of: pending, accepted, dismissed, modified');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
