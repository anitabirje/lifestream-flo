/**
 * Onboarding state data model
 * Tracks user onboarding completion and preferences
 */

export interface OnboardingState {
  userId: string;
  familyId: string;
  isComplete: boolean;
  selectedSources: string[];
  connectedSources: Record<string, boolean>;
  categoryTrackingEnabled: boolean;
  customCategories: string[];
  timeAllocations: Record<string, TimeAllocation>;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeAllocation {
  ideal: number;
  max?: number;
  min?: number;
}

// DynamoDB representation
export interface OnboardingStateDynamoDBItem {
  PK: string; // USER#<userId>
  SK: string; // ONBOARDING#<userId>
  EntityType: 'ONBOARDING_STATE';
  userId: string;
  familyId: string;
  isComplete: boolean;
  selectedSources: string[];
  connectedSources: Record<string, boolean>;
  categoryTrackingEnabled: boolean;
  customCategories: string[];
  timeAllocations: Record<string, TimeAllocation>;
  completedAt?: string; // ISO 8601
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Convert OnboardingState domain model to DynamoDB item
 */
export function onboardingStateToDynamoDB(state: OnboardingState): OnboardingStateDynamoDBItem {
  return {
    PK: `USER#${state.userId}`,
    SK: `ONBOARDING#${state.userId}`,
    EntityType: 'ONBOARDING_STATE',
    userId: state.userId,
    familyId: state.familyId,
    isComplete: state.isComplete,
    selectedSources: state.selectedSources,
    connectedSources: state.connectedSources,
    categoryTrackingEnabled: state.categoryTrackingEnabled,
    customCategories: state.customCategories,
    timeAllocations: state.timeAllocations,
    completedAt: state.completedAt?.toISOString(),
    createdAt: state.createdAt.toISOString(),
    updatedAt: state.updatedAt.toISOString(),
  };
}

/**
 * Convert DynamoDB item to OnboardingState domain model
 */
export function onboardingStateFromDynamoDB(item: OnboardingStateDynamoDBItem): OnboardingState {
  return {
    userId: item.userId,
    familyId: item.familyId,
    isComplete: item.isComplete,
    selectedSources: item.selectedSources,
    connectedSources: item.connectedSources,
    categoryTrackingEnabled: item.categoryTrackingEnabled,
    customCategories: item.customCategories,
    timeAllocations: item.timeAllocations,
    completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}
