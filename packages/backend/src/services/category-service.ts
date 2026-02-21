/**
 * Category Service
 * Handles CRUD operations for activity categories
 */

import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import {
  ActivityCategory,
  categoryToDynamoDB,
  categoryFromDynamoDB,
  DEFAULT_CATEGORIES,
} from '../models/activity-category';
import { v4 as uuidv4 } from 'uuid';

export interface CreateCategoryInput {
  familyId: string;
  name: string;
  color: string;
  icon: string;
  keywords?: string[];
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string;
  icon?: string;
  keywords?: string[];
}

export class CategoryService {
  constructor(private dataAccess: DynamoDBDataAccess) {}

  /**
   * Initialize default categories for a family
   */
  async initializeDefaultCategories(familyId: string): Promise<ActivityCategory[]> {
    const now = new Date();
    const categories: ActivityCategory[] = [];

    for (const defaultCat of DEFAULT_CATEGORIES) {
      const category: ActivityCategory = {
        id: uuidv4(),
        familyId,
        ...defaultCat,
        createdAt: now,
        updatedAt: now,
      };

      const dynamoItem = categoryToDynamoDB(category);
      await this.dataAccess.putItem(dynamoItem);
      categories.push(category);
    }

    return categories;
  }

  /**
   * Create a new custom category
   */
  async createCategory(input: CreateCategoryInput): Promise<ActivityCategory> {
    const now = new Date();
    const category: ActivityCategory = {
      id: uuidv4(),
      familyId: input.familyId,
      name: input.name,
      color: input.color,
      icon: input.icon,
      isDefault: false,
      keywords: input.keywords || [],
      createdAt: now,
      updatedAt: now,
    };

    const dynamoItem = categoryToDynamoDB(category);
    await this.dataAccess.putItem(dynamoItem);

    return category;
  }

  /**
   * Get a category by ID
   */
  async getCategory(familyId: string, categoryId: string): Promise<ActivityCategory | null> {
    const item = await this.dataAccess.getItem(
      `FAMILY#${familyId}`,
      `CATEGORY#${categoryId}`
    );

    if (!item) {
      return null;
    }

    return categoryFromDynamoDB(item as any);
  }

  /**
   * Update an existing category (rename only for default categories)
   */
  async updateCategory(
    familyId: string,
    categoryId: string,
    updates: UpdateCategoryInput
  ): Promise<ActivityCategory | null> {
    const existing = await this.getCategory(familyId, categoryId);
    if (!existing) {
      return null;
    }

    // For default categories, only allow name updates
    const allowedUpdates = existing.isDefault
      ? { name: updates.name }
      : updates;

    const updated: ActivityCategory = {
      ...existing,
      ...allowedUpdates,
      updatedAt: new Date(),
    };

    const dynamoItem = categoryToDynamoDB(updated);
    await this.dataAccess.putItem(dynamoItem);

    return updated;
  }

  /**
   * Delete a custom category (default categories cannot be deleted)
   */
  async deleteCategory(familyId: string, categoryId: string): Promise<boolean> {
    const existing = await this.getCategory(familyId, categoryId);
    if (!existing) {
      return false;
    }

    // Cannot delete default categories
    if (existing.isDefault) {
      throw new Error('Cannot delete default categories');
    }

    await this.dataAccess.deleteItem(
      `FAMILY#${familyId}`,
      `CATEGORY#${categoryId}`
    );

    return true;
  }

  /**
   * List all categories for a family
   */
  async listCategories(familyId: string): Promise<ActivityCategory[]> {
    const items = await this.dataAccess.query(
      `FAMILY#${familyId}`,
      'CATEGORY#'
    );

    return items.map((item) => categoryFromDynamoDB(item as any));
  }

  /**
   * Check if category tracking is enabled for a user
   */
  async isCategoryTrackingEnabled(userId: string): Promise<boolean> {
    const item = await this.dataAccess.getItem(
      `USER#${userId}`,
      `ONBOARDING#${userId}`
    );

    if (!item) {
      return true; // Default to enabled
    }

    return (item as any).categoryTrackingEnabled !== false;
  }
}
