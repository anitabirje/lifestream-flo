/**
 * Notification Preferences API Routes
 * Endpoints for managing user notification preferences
 */

import { Router, Request, Response } from 'express';
import { NotificationPreferenceService } from '../services/notification-preference-service';
import { dynamoDBDataAccess } from '../data-access/dynamodb-client';
import { AuditLogger } from '../services/audit-logger';

const router = Router();

// Initialize services
const preferenceService = new NotificationPreferenceService(dynamoDBDataAccess);
const auditLogger = new AuditLogger(dynamoDBDataAccess);

/**
 * GET /api/notification-preferences
 * Get notification preferences for a family member
 * Query params: familyMemberId (required), preferenceId (optional)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { familyMemberId, preferenceId } = req.query;

    // Validate required parameters
    if (!familyMemberId) {
      return res.status(400).json({
        error: 'Missing required query parameter: familyMemberId',
      });
    }

    // If preferenceId is provided, get specific preference
    if (preferenceId) {
      const preference = await preferenceService.getPreference(
        familyMemberId as string,
        preferenceId as string
      );

      if (!preference) {
        return res.status(404).json({
          error: 'Notification preference not found',
        });
      }

      return res.status(200).json(preference);
    }

    // Otherwise, get all preferences for the family member
    const preferences = await preferenceService.getPreferencesForMember(familyMemberId as string);
    res.status(200).json(preferences);
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({
      error: 'Failed to get notification preferences',
    });
  }
});

/**
 * POST /api/notification-preferences
 * Create notification preferences for a family member
 * Body: { familyMemberId, categoryId?, categoryName?, disableThresholdAlerts?, disableSummaryEmails?, disableEventUpdates?, disableConflictAlerts?, preferredChannels? }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      familyMemberId,
      categoryId,
      categoryName,
      disableThresholdAlerts,
      disableSummaryEmails,
      disableEventUpdates,
      disableConflictAlerts,
      preferredChannels,
    } = req.body;

    // Validate required fields
    if (!familyMemberId) {
      return res.status(400).json({
        error: 'Missing required field: familyMemberId',
      });
    }

    // Validate preferredChannels if provided
    if (preferredChannels && !Array.isArray(preferredChannels)) {
      return res.status(400).json({
        error: 'preferredChannels must be an array of "email" and/or "in_app"',
      });
    }

    const preference = await preferenceService.createPreference({
      familyMemberId,
      categoryId,
      categoryName,
      disableThresholdAlerts,
      disableSummaryEmails,
      disableEventUpdates,
      disableConflictAlerts,
      preferredChannels,
    });

    // Audit log
    await auditLogger.logEntityChange(
      familyMemberId as string,
      'notification_preference' as any,
      preference.id,
      'created',
      familyMemberId as string,
      undefined,
      preference as any
    );

    res.status(201).json(preference);
  } catch (error) {
    console.error('Error creating notification preference:', error);
    res.status(500).json({
      error: 'Failed to create notification preference',
    });
  }
});

/**
 * PUT /api/notification-preferences/:preferenceId
 * Update notification preferences
 * Body: { familyMemberId, disableThresholdAlerts?, disableSummaryEmails?, disableEventUpdates?, disableConflictAlerts?, preferredChannels? }
 */
router.put('/:preferenceId', async (req: Request, res: Response) => {
  try {
    const { preferenceId } = req.params;
    const {
      familyMemberId,
      disableThresholdAlerts,
      disableSummaryEmails,
      disableEventUpdates,
      disableConflictAlerts,
      preferredChannels,
    } = req.body;

    // Validate required fields
    if (!familyMemberId) {
      return res.status(400).json({
        error: 'Missing required field: familyMemberId',
      });
    }

    // Validate preferredChannels if provided
    if (preferredChannels && !Array.isArray(preferredChannels)) {
      return res.status(400).json({
        error: 'preferredChannels must be an array of "email" and/or "in_app"',
      });
    }

    // Get existing preference for audit log
    const existing = await preferenceService.getPreference(familyMemberId, preferenceId);
    if (!existing) {
      return res.status(404).json({
        error: 'Notification preference not found',
      });
    }

    const updated = await preferenceService.updatePreference(familyMemberId, preferenceId, {
      disableThresholdAlerts,
      disableSummaryEmails,
      disableEventUpdates,
      disableConflictAlerts,
      preferredChannels,
    });

    // Audit log
    await auditLogger.logEntityChange(
      familyMemberId,
      'notification_preference' as any,
      preferenceId,
      'updated',
      familyMemberId,
      existing as any,
      updated as any
    );

    res.status(200).json(updated);
  } catch (error) {
    console.error('Error updating notification preference:', error);
    res.status(500).json({
      error: 'Failed to update notification preference',
    });
  }
});

/**
 * DELETE /api/notification-preferences/:preferenceId
 * Delete notification preferences
 * Query params: familyMemberId (required)
 */
router.delete('/:preferenceId', async (req: Request, res: Response) => {
  try {
    const { preferenceId } = req.params;
    const { familyMemberId } = req.query;

    // Validate required parameters
    if (!familyMemberId) {
      return res.status(400).json({
        error: 'Missing required query parameter: familyMemberId',
      });
    }

    // Get existing preference for audit log
    const existing = await preferenceService.getPreference(
      familyMemberId as string,
      preferenceId
    );
    if (!existing) {
      return res.status(404).json({
        error: 'Notification preference not found',
      });
    }

    const deleted = await preferenceService.deletePreference(
      familyMemberId as string,
      preferenceId
    );

    if (!deleted) {
      return res.status(404).json({
        error: 'Notification preference not found',
      });
    }

    // Audit log
    await auditLogger.logEntityChange(
      familyMemberId as string,
      'notification_preference' as any,
      preferenceId,
      'deleted',
      familyMemberId as string,
      existing as any,
      undefined
    );

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting notification preference:', error);
    res.status(500).json({
      error: 'Failed to delete notification preference',
    });
  }
});

/**
 * PATCH /api/notification-preferences/:preferenceId/disable-all
 * Disable all notifications for a family member
 * Query params: familyMemberId (required)
 */
router.patch('/:preferenceId/disable-all', async (req: Request, res: Response) => {
  try {
    const { familyMemberId } = req.query;

    // Validate required parameters
    if (!familyMemberId) {
      return res.status(400).json({
        error: 'Missing required query parameter: familyMemberId',
      });
    }

    const updated = await preferenceService.disableAllNotifications(familyMemberId as string);

    if (!updated) {
      return res.status(404).json({
        error: 'Notification preference not found',
      });
    }

    // Audit log
    await auditLogger.logEntityChange(
      familyMemberId as string,
      'notification_preference' as any,
      updated.id,
      'updated',
      familyMemberId as string,
      undefined,
      { action: 'disable_all' } as any
    );

    res.status(200).json(updated);
  } catch (error) {
    console.error('Error disabling all notifications:', error);
    res.status(500).json({
      error: 'Failed to disable all notifications',
    });
  }
});

/**
 * PATCH /api/notification-preferences/:preferenceId/enable-all
 * Enable all notifications for a family member
 * Query params: familyMemberId (required)
 */
router.patch('/:preferenceId/enable-all', async (req: Request, res: Response) => {
  try {
    const { familyMemberId } = req.query;

    // Validate required parameters
    if (!familyMemberId) {
      return res.status(400).json({
        error: 'Missing required query parameter: familyMemberId',
      });
    }

    const updated = await preferenceService.enableAllNotifications(familyMemberId as string);

    if (!updated) {
      return res.status(404).json({
        error: 'Notification preference not found',
      });
    }

    // Audit log
    await auditLogger.logEntityChange(
      familyMemberId as string,
      'notification_preference' as any,
      updated.id,
      'updated',
      familyMemberId as string,
      undefined,
      { action: 'enable_all' } as any
    );

    res.status(200).json(updated);
  } catch (error) {
    console.error('Error enabling all notifications:', error);
    res.status(500).json({
      error: 'Failed to enable all notifications',
    });
  }
});

export default router;
