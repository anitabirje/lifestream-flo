/**
 * Activity Category data model
 * Supports default and custom categories with name, color, icon
 * Implements DynamoDB single-table design patterns
 */

export type DefaultCategoryName = 'Work' | 'Family Time' | 'Health/Fitness' | 'Upskilling' | 'Relaxation';

export interface ActivityCategory {
  id: string;
  familyId: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

// DynamoDB representation
export interface ActivityCategoryDynamoDBItem {
  PK: string; // FAMILY#<familyId>
  SK: string; // CATEGORY#<categoryId>
  EntityType: 'ACTIVITY_CATEGORY';
  id: string;
  familyId: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  keywords: string[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Default activity categories
 */
export const DEFAULT_CATEGORIES: Omit<ActivityCategory, 'id' | 'familyId' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Work',
    color: '#3B82F6',
    icon: '💼',
    isDefault: true,
    keywords: ['work', 'meeting', 'office', 'project', 'deadline', 'presentation', 'conference'],
  },
  {
    name: 'Family Time',
    color: '#10B981',
    icon: '👨‍👩‍👧‍👦',
    isDefault: true,
    keywords: ['family', 'dinner', 'home', 'kids', 'parent', 'together', 'quality time'],
  },
  {
    name: 'Health/Fitness',
    color: '#EF4444',
    icon: '💪',
    isDefault: true,
    keywords: ['gym', 'workout', 'exercise', 'fitness', 'health', 'yoga', 'run', 'sport'],
  },
  {
    name: 'Upskilling',
    color: '#8B5CF6',
    icon: '📚',
    isDefault: true,
    keywords: ['learn', 'course', 'study', 'training', 'education', 'skill', 'development'],
  },
  {
    name: 'Relaxation',
    color: '#F59E0B',
    icon: '🧘',
    isDefault: true,
    keywords: ['relax', 'rest', 'leisure', 'hobby', 'entertainment', 'vacation', 'break'],
  },
];

/**
 * Convert ActivityCategory domain model to DynamoDB item
 */
export function categoryToDynamoDB(category: ActivityCategory): ActivityCategoryDynamoDBItem {
  return {
    PK: `FAMILY#${category.familyId}`,
    SK: `CATEGORY#${category.id}`,
    EntityType: 'ACTIVITY_CATEGORY',
    id: category.id,
    familyId: category.familyId,
    name: category.name,
    color: category.color,
    icon: category.icon,
    isDefault: category.isDefault,
    keywords: category.keywords,
    createdAt: category.createdAt.toISOString(),
    updatedAt: category.updatedAt.toISOString(),
  };
}

/**
 * Convert DynamoDB item to ActivityCategory domain model
 */
export function categoryFromDynamoDB(item: ActivityCategoryDynamoDBItem): ActivityCategory {
  return {
    id: item.id,
    familyId: item.familyId,
    name: item.name,
    color: item.color,
    icon: item.icon,
    isDefault: item.isDefault,
    keywords: item.keywords,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}
