/**
 * Ideal Time Allocation data model
 * Stores user preferences for time allocation across activity categories
 * Supports both percentage and hours per week
 * Implements DynamoDB single-table design patterns
 */

export type AllocationType = 'percentage' | 'hours';

export interface IdealTimeAllocation {
  id: string;
  familyId: string;
  familyMemberId: string;
  categoryId: string;
  categoryName: string;
  allocationType: AllocationType;
  targetValue: number; // Percentage (0-100) or hours per week
  createdAt: Date;
  updatedAt: Date;
}

// DynamoDB representation
export interface IdealTimeAllocationDynamoDBItem {
  PK: string; // FAMILY#<familyId>
  SK: string; // IDEAL_ALLOCATION#<familyMemberId>#<categoryId>
  EntityType: 'IDEAL_TIME_ALLOCATION';
  id: string;
  familyId: string;
  familyMemberId: string;
  categoryId: string;
  categoryName: string;
  allocationType: AllocationType;
  targetValue: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Convert IdealTimeAllocation domain model to DynamoDB item
 */
export function idealAllocationToDynamoDB(allocation: IdealTimeAllocation): IdealTimeAllocationDynamoDBItem {
  return {
    PK: `FAMILY#${allocation.familyId}`,
    SK: `IDEAL_ALLOCATION#${allocation.familyMemberId}#${allocation.categoryId}`,
    EntityType: 'IDEAL_TIME_ALLOCATION',
    id: allocation.id,
    familyId: allocation.familyId,
    familyMemberId: allocation.familyMemberId,
    categoryId: allocation.categoryId,
    categoryName: allocation.categoryName,
    allocationType: allocation.allocationType,
    targetValue: allocation.targetValue,
    createdAt: allocation.createdAt.toISOString(),
    updatedAt: allocation.updatedAt.toISOString(),
  };
}

/**
 * Convert DynamoDB item to IdealTimeAllocation domain model
 */
export function idealAllocationFromDynamoDB(item: IdealTimeAllocationDynamoDBItem): IdealTimeAllocation {
  return {
    id: item.id,
    familyId: item.familyId,
    familyMemberId: item.familyMemberId,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    allocationType: item.allocationType,
    targetValue: item.targetValue,
    createdAt: new Date(item.createdAt),
    updatedAt: new Date(item.updatedAt),
  };
}

/**
 * Validate ideal time allocation values
 */
export function validateIdealAllocation(allocation: Partial<IdealTimeAllocation>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (allocation.allocationType === 'percentage') {
    if (allocation.targetValue === undefined || allocation.targetValue < 0 || allocation.targetValue > 100) {
      errors.push('Percentage must be between 0 and 100');
    }
  } else if (allocation.allocationType === 'hours') {
    if (allocation.targetValue === undefined || allocation.targetValue < 0 || allocation.targetValue > 168) {
      errors.push('Hours per week must be between 0 and 168');
    }
  } else {
    errors.push('Allocation type must be either "percentage" or "hours"');
  }

  if (!allocation.categoryId) {
    errors.push('Category ID is required');
  }

  if (!allocation.familyMemberId) {
    errors.push('Family member ID is required');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
