/**
 * Activity Threshold data model
 * Stores time thresholds (max/min hours) for activity categories
 * Implements DynamoDB single-table design patterns
 */

export interface ActivityThreshold {
  id: string;
  familyId: string;
  categoryId: string;
  categoryName: string;
  maxHours?: number;
  minHours?: number;
  notificationRecipients: string[]; // Array of family member IDs
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// DynamoDB representation
export interface ActivityThresholdDynamoDBItem {
  PK: string; // FAMILY#<familyId>
  SK: string; // THRESHOLD#<categoryId>
  EntityType: 'ACTIVITY_THRESHOLD';
  id: string;
  familyId: string;
  categoryId: string;
  categoryName: string;
  maxHours?: number;
  minHours?: number;
  notificationRecipients: string[];
  enabled: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Convert ActivityThreshold domain model to DynamoDB item
 */
export function thresholdToDynamoDB(threshold: ActivityThreshold): ActivityThresholdDynamoDBItem {
  return {
    PK: `FAMILY#${threshold.familyId}`,
    SK: `THRESHOLD#${threshold.categoryId}`,
    EntityType: 'ACTIVITY_THRESHOLD',
    id: threshold.id,
    familyId: threshold.familyId,
    categoryId: threshold.categoryId,
    categoryName: threshold.categoryName,
    maxHours: threshold.maxHours,
    minHours: threshold.minHours,
    notificationRecipients: threshold.notificationRecipients,
    enabled: threshold.enabled,
    createdAt: threshold.createdAt.toISOString(),
    updatedAt: threshold.updatedAt.toISOString(),
  };
}

/**
 * Convert DynamoDB item to ActivityThreshold domain model
 */
export function thresholdFromDynamoDB(item: ActivityThresholdDynamoDBItem): ActivityThreshold {
  return {
    id: item.id,
    familyId: item.familyId,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    maxHours: item.maxHours,
    minHours: item.minHours,
    notificationRecipients: item.notificationRecipients,
    enabled: item.enabled,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

/**
 * Validate activity threshold values
 */
export function validateActivityThreshold(threshold: Partial<ActivityThreshold>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (threshold.maxHours !== undefined) {
    if (threshold.maxHours < 0 || threshold.maxHours > 168) {
      errors.push('Max hours must be between 0 and 168 (hours per week)');
    }
  }

  if (threshold.minHours !== undefined) {
    if (threshold.minHours < 0 || threshold.minHours > 168) {
      errors.push('Min hours must be between 0 and 168 (hours per week)');
    }
  }

  if (threshold.maxHours !== undefined && threshold.minHours !== undefined) {
    if (threshold.minHours > threshold.maxHours) {
      errors.push('Min hours cannot be greater than max hours');
    }
  }

  if (!threshold.categoryId) {
    errors.push('Category ID is required');
  }

  if (!threshold.familyId) {
    errors.push('Family ID is required');
  }

  if (!Array.isArray(threshold.notificationRecipients)) {
    errors.push('Notification recipients must be an array');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
