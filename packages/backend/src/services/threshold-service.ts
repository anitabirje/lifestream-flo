/**
 * Threshold Service
 * Handles CRUD operations for activity thresholds (max/min hours per category)
 */

import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import {
  ActivityThreshold,
  thresholdToDynamoDB,
  thresholdFromDynamoDB,
  validateActivityThreshold,
} from '../models/activity-threshold';
import { v4 as uuidv4 } from 'uuid';

export interface CreateThresholdInput {
  familyId: string;
  categoryId: string;
  categoryName: string;
  maxHours?: number;
  minHours?: number;
  notificationRecipients: string[];
}

export interface UpdateThresholdInput {
  maxHours?: number;
  minHours?: number;
  notificationRecipients?: string[];
  enabled?: boolean;
}

export class ThresholdService {
  constructor(private dataAccess: DynamoDBDataAccess) {}

  /**
   * Create a new activity threshold
   */
  async createThreshold(input: CreateThresholdInput): Promise<ActivityThreshold> {
    const now = new Date();
    const threshold: ActivityThreshold = {
      id: uuidv4(),
      familyId: input.familyId,
      categoryId: input.categoryId,
      categoryName: input.categoryName,
      maxHours: input.maxHours,
      minHours: input.minHours,
      notificationRecipients: input.notificationRecipients,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };

    // Validate threshold
    const validation = validateActivityThreshold(threshold);
    if (!validation.valid) {
      throw new Error(`Invalid threshold: ${validation.errors.join(', ')}`);
    }

    const dynamoItem = thresholdToDynamoDB(threshold);
    await this.dataAccess.putItem(dynamoItem);

    return threshold;
  }

  /**
   * Get a threshold by category ID
   */
  async getThreshold(familyId: string, categoryId: string): Promise<ActivityThreshold | null> {
    const item = await this.dataAccess.getItem(
      `FAMILY#${familyId}`,
      `THRESHOLD#${categoryId}`
    );

    if (!item) {
      return null;
    }

    return thresholdFromDynamoDB(item as any);
  }

  /**
   * Update an existing threshold
   */
  async updateThreshold(
    familyId: string,
    categoryId: string,
    updates: UpdateThresholdInput
  ): Promise<ActivityThreshold | null> {
    const existing = await this.getThreshold(familyId, categoryId);
    if (!existing) {
      return null;
    }

    const updated: ActivityThreshold = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };

    // Validate updated threshold
    const validation = validateActivityThreshold(updated);
    if (!validation.valid) {
      throw new Error(`Invalid threshold: ${validation.errors.join(', ')}`);
    }

    const dynamoItem = thresholdToDynamoDB(updated);
    await this.dataAccess.putItem(dynamoItem);

    return updated;
  }

  /**
   * Delete a threshold
   */
  async deleteThreshold(familyId: string, categoryId: string): Promise<boolean> {
    const existing = await this.getThreshold(familyId, categoryId);
    if (!existing) {
      return false;
    }

    await this.dataAccess.deleteItem(
      `FAMILY#${familyId}`,
      `THRESHOLD#${categoryId}`
    );

    return true;
  }

  /**
   * List all thresholds for a family
   */
  async listThresholds(familyId: string): Promise<ActivityThreshold[]> {
    const items = await this.dataAccess.query(
      `FAMILY#${familyId}`,
      'THRESHOLD#'
    );

    return items.map((item) => thresholdFromDynamoDB(item as any));
  }

  /**
   * Get enabled thresholds for a family
   */
  async getEnabledThresholds(familyId: string): Promise<ActivityThreshold[]> {
    const allThresholds = await this.listThresholds(familyId);
    return allThresholds.filter((t) => t.enabled);
  }

  /**
   * Enable a threshold
   */
  async enableThreshold(familyId: string, categoryId: string): Promise<ActivityThreshold | null> {
    return this.updateThreshold(familyId, categoryId, { enabled: true });
  }

  /**
   * Disable a threshold
   */
  async disableThreshold(familyId: string, categoryId: string): Promise<ActivityThreshold | null> {
    return this.updateThreshold(familyId, categoryId, { enabled: false });
  }

  /**
   * Get thresholds for a specific family member (where they are a notification recipient)
   */
  async getThresholdsForMember(familyId: string, memberId: string): Promise<ActivityThreshold[]> {
    const allThresholds = await this.listThresholds(familyId);
    return allThresholds.filter((t) => t.notificationRecipients.includes(memberId));
  }
}
