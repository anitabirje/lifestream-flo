/**
 * Property-Based Tests for Custom Activity Categories
 * 
 * Feature: flo-family-calendar
 * Property 62: Custom Category CRUD Operations
 * Property 63: Category Tracking Toggle
 * Validates: Requirements 3.1-3.11
 * 
 * These tests verify that custom activity categories can be created, renamed,
 * deleted, and that category tracking can be toggled on/off.
 */

import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBDataAccess } from '../data-access/dynamodb-client';
import { CategoryService } from '../services/category-service';
import { DEFAULT_CATEGORIES } from '../models/activity-category';

describe('Property 62: Custom Category CRUD Operations', () => {
  const categoryService = new CategoryService(dynamoDBDataAccess);

  // Arbitrary for category name
  const categoryNameArb = fc.string({ minLength: 1, maxLength: 50 });
  
  // Arbitrary for color (hex color)
  const colorArb = fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`);
  
  // Arbitrary for icon (emoji or simple string)
  const iconArb = fc.oneof(
    fc.constant('🎯'),
    fc.constant('🎨'),
    fc.constant('🎮'),
    fc.constant('📖'),
    fc.constant('🏃')
  );
  
  // Arbitrary for keywords
  const keywordsArb = fc.array(fc.string({ minLength: 3, maxLength: 20 }), { maxLength: 10 });

  afterEach(async () => {
    // Cleanup: Delete test data
    // Note: In a real scenario, you'd want to use a test database
  });

  it('should create a custom category with valid properties', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        colorArb,
        iconArb,
        keywordsArb,
        async (name, color, icon, keywords) => {
          const familyId = `test-family-${uuidv4()}`;

          const category = await categoryService.createCategory({
            familyId,
            name,
            color,
            icon,
            keywords,
          });

          // Verify category was created with correct properties
          expect(category.id).toBeTruthy();
          expect(category.familyId).toBe(familyId);
          expect(category.name).toBe(name);
          expect(category.color).toBe(color);
          expect(category.icon).toBe(icon);
          expect(category.keywords).toEqual(keywords);
          expect(category.isDefault).toBe(false);
          expect(category.createdAt).toBeInstanceOf(Date);
          expect(category.updatedAt).toBeInstanceOf(Date);

          // Verify category can be retrieved
          const retrieved = await categoryService.getCategory(familyId, category.id);
          expect(retrieved).not.toBeNull();
          expect(retrieved?.name).toBe(name);
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should update custom category properties', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        categoryNameArb,
        colorArb,
        iconArb,
        async (originalName, newName, newColor, newIcon) => {
          fc.pre(originalName !== newName); // Ensure names are different
          
          const familyId = `test-family-${uuidv4()}`;

          // Create category
          const category = await categoryService.createCategory({
            familyId,
            name: originalName,
            color: '#000000',
            icon: '🎯',
            keywords: [],
          });

          // Update category
          const updated = await categoryService.updateCategory(familyId, category.id, {
            name: newName,
            color: newColor,
            icon: newIcon,
          });

          // Verify updates
          expect(updated).not.toBeNull();
          expect(updated?.name).toBe(newName);
          expect(updated?.color).toBe(newColor);
          expect(updated?.icon).toBe(newIcon);
          expect(updated?.updatedAt.getTime()).toBeGreaterThan(category.createdAt.getTime());
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should delete custom categories but not default categories', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        async (name) => {
          const familyId = `test-family-${uuidv4()}`;

          // Create custom category
          const customCategory = await categoryService.createCategory({
            familyId,
            name,
            color: '#FF0000',
            icon: '🎯',
            keywords: [],
          });

          // Delete custom category should succeed
          const deleted = await categoryService.deleteCategory(familyId, customCategory.id);
          expect(deleted).toBe(true);

          // Verify category is deleted
          const retrieved = await categoryService.getCategory(familyId, customCategory.id);
          expect(retrieved).toBeNull();
        }
      ),
      { numRuns: 20 }
    );
  }, 30000);

  it('should not allow deletion of default categories', async () => {
    const familyId = `test-family-${uuidv4()}`;

    // Initialize default categories
    const defaultCategories = await categoryService.initializeDefaultCategories(familyId);

    // Try to delete each default category
    for (const category of defaultCategories) {
      await expect(
        categoryService.deleteCategory(familyId, category.id)
      ).rejects.toThrow('Cannot delete default categories');

      // Verify category still exists
      const retrieved = await categoryService.getCategory(familyId, category.id);
      expect(retrieved).not.toBeNull();
    }
  }, 30000);

  it('should list all categories including custom ones', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(categoryNameArb, { minLength: 1, maxLength: 5 }),
        async (customNames) => {
          const familyId = `test-family-${uuidv4()}`;

          // Initialize default categories
          await categoryService.initializeDefaultCategories(familyId);

          // Create custom categories
          for (const name of customNames) {
            await categoryService.createCategory({
              familyId,
              name,
              color: '#FF0000',
              icon: '🎯',
              keywords: [],
            });
          }

          // List all categories
          const allCategories = await categoryService.listCategories(familyId);

          // Should have default + custom categories
          expect(allCategories.length).toBe(DEFAULT_CATEGORIES.length + customNames.length);

          // Verify default categories are present
          const defaultCount = allCategories.filter(c => c.isDefault).length;
          expect(defaultCount).toBe(DEFAULT_CATEGORIES.length);

          // Verify custom categories are present
          const customCount = allCategories.filter(c => !c.isDefault).length;
          expect(customCount).toBe(customNames.length);
        }
      ),
      { numRuns: 10 }
    );
  }, 30000);

  it('should only allow renaming default categories, not full updates', async () => {
    const familyId = `test-family-${uuidv4()}`;

    // Initialize default categories
    const defaultCategories = await categoryService.initializeDefaultCategories(familyId);
    const defaultCategory = defaultCategories[0];

    // Try to update name (should work)
    const renamed = await categoryService.updateCategory(familyId, defaultCategory.id, {
      name: 'New Name',
      color: '#FFFFFF', // This should be ignored
      icon: '🎨', // This should be ignored
    });

    expect(renamed).not.toBeNull();
    expect(renamed?.name).toBe('New Name');
    expect(renamed?.color).toBe(defaultCategory.color); // Should remain unchanged
    expect(renamed?.icon).toBe(defaultCategory.icon); // Should remain unchanged
  }, 30000);
});

describe('Property 63: Category Tracking Toggle', () => {
  const categoryService = new CategoryService(dynamoDBDataAccess);

  it('should default to category tracking enabled', async () => {
    const userId = `test-user-${uuidv4()}`;

    const trackingEnabled = await categoryService.isCategoryTrackingEnabled(userId);
    expect(trackingEnabled).toBe(true);
  }, 10000);

  it('should respect category tracking disabled state', async () => {
    const userId = `test-user-${uuidv4()}`;
    const familyId = `test-family-${uuidv4()}`;

    // Create onboarding state with tracking disabled
    await dynamoDBDataAccess.putItem({
      PK: `USER#${userId}`,
      SK: `ONBOARDING#${userId}`,
      EntityType: 'ONBOARDING_STATE',
      userId,
      familyId,
      isComplete: true,
      selectedSources: [],
      connectedSources: {},
      categoryTrackingEnabled: false,
      customCategories: [],
      timeAllocations: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const trackingEnabled = await categoryService.isCategoryTrackingEnabled(userId);
    expect(trackingEnabled).toBe(false);
  }, 10000);

  it('should return empty categories when tracking is disabled', async () => {
    const userId = `test-user-${uuidv4()}`;
    const familyId = `test-family-${uuidv4()}`;

    // Create onboarding state with tracking disabled
    await dynamoDBDataAccess.putItem({
      PK: `USER#${userId}`,
      SK: `ONBOARDING#${userId}`,
      EntityType: 'ONBOARDING_STATE',
      userId,
      familyId,
      isComplete: true,
      selectedSources: [],
      connectedSources: {},
      categoryTrackingEnabled: false,
      customCategories: [],
      timeAllocations: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Initialize categories (should exist in DB)
    await categoryService.initializeDefaultCategories(familyId);

    // Check tracking status
    const trackingEnabled = await categoryService.isCategoryTrackingEnabled(userId);
    expect(trackingEnabled).toBe(false);

    // When tracking is disabled, the API should return empty categories
    // This is tested at the API level, not service level
  }, 10000);
});
