/**
 * Notification Preference data model
 * Stores user preferences for notification delivery channels and types
 * Implements DynamoDB single-table design patterns
 */

export interface NotificationPreference {
  id: string;
  familyMemberId: string;
  categoryId?: string; // Optional: specific category preference
  categoryName?: string;
  disableThresholdAlerts: boolean;
  disableSummaryEmails: boolean;
  disableEventUpdates: boolean;
  disableConflictAlerts: boolean;
  preferredChannels: ('email' | 'in_app')[];
  createdAt: Date;
  updatedAt: Date;
}

// DynamoDB representation
export interface NotificationPreferenceDynamoDBItem {
  PK: string; // USER#<familyMemberId>
  SK: string; // NOTIFICATION_PREFERENCE#<preferenceId>
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
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Convert NotificationPreference domain model to DynamoDB item
 */
export function preferenceToDynamoDB(preference: NotificationPreference): NotificationPreferenceDynamoDBItem {
  return {
    PK: `USER#${preference.familyMemberId}`,
    SK: `NOTIFICATION_PREFERENCE#${preference.id}`,
    EntityType: 'NOTIFICATION_PREFERENCE',
    id: preference.id,
    familyMemberId: preference.familyMemberId,
    categoryId: preference.categoryId,
    categoryName: preference.categoryName,
    disableThresholdAlerts: preference.disableThresholdAlerts,
    disableSummaryEmails: preference.disableSummaryEmails,
    disableEventUpdates: preference.disableEventUpdates,
    disableConflictAlerts: preference.disableConflictAlerts,
    preferredChannels: preference.preferredChannels,
    createdAt: preference.createdAt.toISOString(),
    updatedAt: preference.updatedAt.toISOString(),
  };
}

/**
 * Convert DynamoDB item to NotificationPreference domain model
 */
export function preferenceFromDynamoDB(item: NotificationPreferenceDynamoDBItem): NotificationPreference {
  return {
    id: item.id,
    familyMemberId: item.familyMemberId,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    disableThresholdAlerts: item.disableThresholdAlerts,
    disableSummaryEmails: item.disableSummaryEmails,
    disableEventUpdates: item.disableEventUpdates,
    disableConflictAlerts: item.disableConflictAlerts,
    preferredChannels: item.preferredChannels,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

/**
 * Validate notification preference values
 */
export function validateNotificationPreference(
  preference: Partial<NotificationPreference>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!preference.familyMemberId) {
    errors.push('Family member ID is required');
  }

  if (!Array.isArray(preference.preferredChannels) || preference.preferredChannels.length === 0) {
    errors.push('At least one preferred channel must be selected');
  }

  if (preference.preferredChannels) {
    const validChannels = ['email', 'in_app'];
    for (const channel of preference.preferredChannels) {
      if (!validChannels.includes(channel)) {
        errors.push(`Invalid channel: ${channel}. Must be one of: ${validChannels.join(', ')}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get default notification preferences
 */
export function getDefaultPreferences(familyMemberId: string): Omit<NotificationPreference, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    familyMemberId,
    disableThresholdAlerts: false,
    disableSummaryEmails: false,
    disableEventUpdates: false,
    disableConflictAlerts: false,
    preferredChannels: ['email', 'in_app'],
  };
}
