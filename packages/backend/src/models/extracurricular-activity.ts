/**
 * Extracurricular Activity data model
 * Implements DynamoDB single-table design patterns
 */

export type ActivityType = 'sports' | 'music' | 'clubs' | 'other';

export interface ExtracurricularActivity {
  id: string;
  familyId: string;
  familyMemberId: string;
  activityType: ActivityType;
  name: string;
  schedule: string; // e.g., "Every Monday 4-5 PM"
  location: string;
  createdAt: Date;
  updatedAt: Date;
}

// DynamoDB representation
export interface ExtracurricularActivityDynamoDBItem {
  PK: string; // FAMILY#<familyId>
  SK: string; // EXTRACURRICULAR#<activityId>
  EntityType: 'EXTRACURRICULAR';
  id: string;
  familyId: string;
  familyMemberId: string;
  activityType: ActivityType;
  name: string;
  schedule: string;
  location: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Convert ExtracurricularActivity domain model to DynamoDB item
 */
export function activityToDynamoDB(
  activity: ExtracurricularActivity
): ExtracurricularActivityDynamoDBItem {
  return {
    PK: `FAMILY#${activity.familyId}`,
    SK: `EXTRACURRICULAR#${activity.id}`,
    EntityType: 'EXTRACURRICULAR',
    id: activity.id,
    familyId: activity.familyId,
    familyMemberId: activity.familyMemberId,
    activityType: activity.activityType,
    name: activity.name,
    schedule: activity.schedule,
    location: activity.location,
    createdAt: activity.createdAt.toISOString(),
    updatedAt: activity.updatedAt.toISOString(),
  };
}

/**
 * Convert DynamoDB item to ExtracurricularActivity domain model
 */
export function activityFromDynamoDB(
  item: ExtracurricularActivityDynamoDBItem
): ExtracurricularActivity {
  return {
    id: item.id,
    familyId: item.familyId,
    familyMemberId: item.familyMemberId,
    activityType: item.activityType,
    name: item.name,
    schedule: item.schedule,
    location: item.location,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}
