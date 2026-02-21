/**
 * Activity Categories API Routes
 * POST /api/categories - Create a new custom category
 * PUT /api/categories/:id - Rename/update a category
 * DELETE /api/categories/:id - Delete a custom category
 * GET /api/categories - List all categories
 */

import { Router, Request, Response } from 'express';
import { CategoryService } from '../services/category-service';
import { dynamoDBDataAccess } from '../data-access/dynamodb-client';
import { AuthService } from '../auth/auth-service';
import { PasswordManager } from '../auth/password-manager';
import { SessionManager } from '../auth/session-manager';
import { authenticate, requirePermission } from '../middleware/access-control';

const router = Router();

// Initialize services
const passwordManager = new PasswordManager();
const sessionManager = new SessionManager(dynamoDBDataAccess);
const authService = new AuthService(dynamoDBDataAccess, passwordManager, sessionManager);
const categoryService = new CategoryService(dynamoDBDataAccess);

/**
 * POST /api/categories
 * Create a new custom category (requires admin role)
 */
router.post(
  '/',
  authenticate(authService),
  async (req: Request, res: Response) => {
    try {
      const { name, color, icon, keywords } = req.body;
      const familyId = req.user!.familyId;

      // Only admins can create categories
      if (req.user!.role !== 'admin') {
        return res.status(403).json({
          error: 'Only family administrators can create categories',
        });
      }

      // Validate required fields
      if (!name || !color || !icon) {
        return res.status(400).json({
          error: 'Missing required fields: name, color, icon',
        });
      }

      const category = await categoryService.createCategory({
        familyId,
        name,
        color,
        icon,
        keywords: keywords || [],
      });

      res.status(201).json({
        category,
      });
    } catch (error: any) {
      console.error('Create category error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

/**
 * PUT /api/categories/:id
 * Rename/update a category (requires admin role)
 */
router.put(
  '/:id',
  authenticate(authService),
  async (req: Request, res: Response) => {
    try {
      const categoryId = req.params.id;
      const familyId = req.user!.familyId;
      const { name, color, icon, keywords } = req.body;

      // Only admins can update categories
      if (req.user!.role !== 'admin') {
        return res.status(403).json({
          error: 'Only family administrators can update categories',
        });
      }

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (color !== undefined) updates.color = color;
      if (icon !== undefined) updates.icon = icon;
      if (keywords !== undefined) updates.keywords = keywords;

      const category = await categoryService.updateCategory(familyId, categoryId, updates);

      if (!category) {
        return res.status(404).json({
          error: 'Category not found',
        });
      }

      res.status(200).json({
        category,
      });
    } catch (error: any) {
      console.error('Update category error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

/**
 * DELETE /api/categories/:id
 * Delete a custom category (requires admin role)
 * Default categories cannot be deleted
 */
router.delete(
  '/:id',
  authenticate(authService),
  async (req: Request, res: Response) => {
    try {
      const categoryId = req.params.id;
      const familyId = req.user!.familyId;

      // Only admins can delete categories
      if (req.user!.role !== 'admin') {
        return res.status(403).json({
          error: 'Only family administrators can delete categories',
        });
      }

      const deleted = await categoryService.deleteCategory(familyId, categoryId);

      if (!deleted) {
        return res.status(404).json({
          error: 'Category not found',
        });
      }

      res.status(200).json({
        message: 'Category deleted successfully',
      });
    } catch (error: any) {
      if (error.message === 'Cannot delete default categories') {
        return res.status(400).json({
          error: 'Cannot delete default categories',
        });
      }
      console.error('Delete category error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/categories
 * List all categories for the family (requires canViewCalendar permission)
 */
router.get(
  '/',
  authenticate(authService),
  requirePermission('canViewCalendar'),
  async (req: Request, res: Response) => {
    try {
      const familyId = req.user!.familyId;
      const userId = req.user!.id;

      // Check if category tracking is enabled
      const trackingEnabled = await categoryService.isCategoryTrackingEnabled(userId);

      if (!trackingEnabled) {
        return res.status(200).json({
          categories: [],
          trackingEnabled: false,
        });
      }

      const categories = await categoryService.listCategories(familyId);

      res.status(200).json({
        categories,
        trackingEnabled: true,
      });
    } catch (error: any) {
      console.error('List categories error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

export default router;
