/**
 * Extracurricular Activities API Routes
 * POST /api/extracurricular-activities - Create a new activity
 * PUT /api/extracurricular-activities/:id - Update an activity
 * DELETE /api/extracurricular-activities/:id - Delete an activity
 * GET /api/extracurricular-activities - List all activities
 */

import { Router, Request, Response } from 'express';
import { ExtracurricularActivityService } from '../services/extracurricular-activity-service';
import { getDynamoDBClient } from '../data-access/dynamodb-client';
import { dynamoDBDataAccess } from '../data-access/dynamodb-client';
import { AuthService } from '../auth/auth-service';
import { PasswordManager } from '../auth/password-manager';
import { SessionManager } from '../auth/session-manager';
import { authenticate, requirePermission } from '../middleware/access-control';
import { ActivityType } from '../models/extracurricular-activity';

const router = Router();

// Initialize services
const dynamoClient = getDynamoDBClient();
const passwordManager = new PasswordManager();
const sessionManager = new SessionManager(dynamoClient);
const authService = new AuthService(dynamoClient, passwordManager, sessionManager);
const activityService = new ExtracurricularActivityService(dynamoDBDataAccess);

/**
 * POST /api/extracurricular-activities
 * Create a new extracurricular activity (requires canCreateEvents permission)
 */
router.post(
  '/',
  authenticate(authService),
  requirePermission('canCreateEvents'),
  async (req: Request, res: Response) => {
    try {
      const { familyMemberId, activityType, name, schedule, location } = req.body;
      const familyId = req.user!.familyId;

      // Validate required fields
      if (!familyMemberId || !activityType || !name || !schedule || !location) {
        return res.status(400).json({
          error: 'Missing required fields: familyMemberId, activityType, name, schedule, location',
        });
      }

      // Validate activity type
      const validTypes: ActivityType[] = ['sports', 'music', 'clubs', 'other'];
      if (!validTypes.includes(activityType)) {
        return res.status(400).json({
          error: 'Invalid activityType. Must be one of: sports, music, clubs, other',
        });
      }

      const activity = await activityService.createActivity({
        familyId,
        familyMemberId,
        activityType,
        name,
        schedule,
        location,
      });

      res.status(201).json({
        activity,
      });
    } catch (error: any) {
      console.error('Create activity error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

/**
 * PUT /api/extracurricular-activities/:id
 * Update an existing activity (requires canEditEvents permission)
 */
router.put(
  '/:id',
  authenticate(authService),
  requirePermission('canEditEvents'),
  async (req: Request, res: Response) => {
    try {
      const activityId = req.params.id;
      const familyId = req.user!.familyId;
      const { activityType, name, schedule, location } = req.body;

      // Validate activity type if provided
      if (activityType) {
        const validTypes: ActivityType[] = ['sports', 'music', 'clubs', 'other'];
        if (!validTypes.includes(activityType)) {
          return res.status(400).json({
            error: 'Invalid activityType. Must be one of: sports, music, clubs, other',
          });
        }
      }

      const updates: any = {};
      if (activityType !== undefined) updates.activityType = activityType;
      if (name !== undefined) updates.name = name;
      if (schedule !== undefined) updates.schedule = schedule;
      if (location !== undefined) updates.location = location;

      const activity = await activityService.updateActivity(familyId, activityId, updates);

      if (!activity) {
        return res.status(404).json({
          error: 'Activity not found',
        });
      }

      res.status(200).json({
        activity,
      });
    } catch (error: any) {
      console.error('Update activity error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

/**
 * DELETE /api/extracurricular-activities/:id
 * Delete an activity (requires canDeleteEvents permission)
 */
router.delete(
  '/:id',
  authenticate(authService),
  requirePermission('canDeleteEvents'),
  async (req: Request, res: Response) => {
    try {
      const activityId = req.params.id;
      const familyId = req.user!.familyId;

      const deleted = await activityService.deleteActivity(familyId, activityId);

      if (!deleted) {
        return res.status(404).json({
          error: 'Activity not found',
        });
      }

      res.status(200).json({
        message: 'Activity deleted successfully',
      });
    } catch (error: any) {
      console.error('Delete activity error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/extracurricular-activities
 * List all activities for the family (requires canViewCalendar permission)
 * Optional query parameter: familyMemberId to filter by member
 */
router.get(
  '/',
  authenticate(authService),
  requirePermission('canViewCalendar'),
  async (req: Request, res: Response) => {
    try {
      const familyId = req.user!.familyId;
      const familyMemberId = req.query.familyMemberId as string | undefined;

      let activities;
      if (familyMemberId) {
        activities = await activityService.listActivitiesByMember(familyId, familyMemberId);
      } else {
        activities = await activityService.listActivities(familyId);
      }

      res.status(200).json({
        activities,
      });
    } catch (error: any) {
      console.error('List activities error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

export default router;
