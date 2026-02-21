/**
 * Activity Threshold API Routes
 * Endpoints for managing activity thresholds (max/min hours per category)
 */

import { Router, Request, Response } from 'express';
import { ThresholdService } from '../services/threshold-service';
import { getDynamoDBClient } from '../data-access/dynamodb-client';

const router = Router();

// Initialize service
const dynamoClient = getDynamoDBClient();
const thresholdService = new ThresholdService(dynamoClient);

/**
 * POST /api/thresholds
 * Create a new activity threshold
 * Body: { familyId, categoryId, categoryName, maxHours?, minHours?, notificationRecipients }
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { familyId, categoryId, categoryName, maxHours, minHours, notificationRecipients } = req.body;

    // Validate required fields
    if (!familyId || !categoryId || !categoryName || !Array.isArray(notificationRecipients)) {
      return res.status(400).json({
        error: 'Missing required fields: familyId, categoryId, categoryName, notificationRecipients (array)',
      });
    }

    // Validate that at least one threshold is set
    if (maxHours === undefined && minHours === undefined) {
      return res.status(400).json({
        error: 'At least one of maxHours or minHours must be specified',
      });
    }

    const threshold = await thresholdService.createThreshold({
      familyId,
      categoryId,
      categoryName,
      maxHours,
      minHours,
      notificationRecipients,
    });

    res.status(201).json(threshold);
  } catch (error) {
    console.error('Error creating threshold:', error);
    res.status(500).json({ error: 'Failed to create threshold' });
  }
});

/**
 * GET /api/thresholds
 * Get activity thresholds
 * Query params: familyId, categoryId (optional), memberId (optional)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { familyId, categoryId, memberId } = req.query;

    if (!familyId) {
      return res.status(400).json({ error: 'Missing required query parameter: familyId' });
    }

    // If categoryId is provided, get specific threshold
    if (categoryId) {
      const threshold = await thresholdService.getThreshold(familyId as string, categoryId as string);

      if (!threshold) {
        return res.status(404).json({ error: 'Threshold not found' });
      }

      return res.status(200).json(threshold);
    }

    // If memberId is provided, get thresholds for that member
    if (memberId) {
      const thresholds = await thresholdService.getThresholdsForMember(familyId as string, memberId as string);
      return res.status(200).json(thresholds);
    }

    // Otherwise, get all thresholds for the family
    const thresholds = await thresholdService.listThresholds(familyId as string);
    res.status(200).json(thresholds);
  } catch (error) {
    console.error('Error getting thresholds:', error);
    res.status(500).json({ error: 'Failed to get thresholds' });
  }
});

/**
 * PUT /api/thresholds/:categoryId
 * Update an activity threshold
 * Body: { familyId, maxHours?, minHours?, notificationRecipients?, enabled? }
 */
router.put('/:categoryId', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { familyId, maxHours, minHours, notificationRecipients, enabled } = req.body;

    if (!familyId) {
      return res.status(400).json({ error: 'Missing required field: familyId' });
    }

    const threshold = await thresholdService.updateThreshold(familyId, categoryId, {
      maxHours,
      minHours,
      notificationRecipients,
      enabled,
    });

    if (!threshold) {
      return res.status(404).json({ error: 'Threshold not found' });
    }

    res.status(200).json(threshold);
  } catch (error) {
    console.error('Error updating threshold:', error);
    res.status(500).json({ error: 'Failed to update threshold' });
  }
});

/**
 * DELETE /api/thresholds/:categoryId
 * Delete an activity threshold
 * Query params: familyId
 */
router.delete('/:categoryId', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { familyId } = req.query;

    if (!familyId) {
      return res.status(400).json({ error: 'Missing required query parameter: familyId' });
    }

    const deleted = await thresholdService.deleteThreshold(familyId as string, categoryId);

    if (!deleted) {
      return res.status(404).json({ error: 'Threshold not found' });
    }

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting threshold:', error);
    res.status(500).json({ error: 'Failed to delete threshold' });
  }
});

/**
 * PATCH /api/thresholds/:categoryId/enable
 * Enable a threshold
 * Query params: familyId
 */
router.patch('/:categoryId/enable', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { familyId } = req.query;

    if (!familyId) {
      return res.status(400).json({ error: 'Missing required query parameter: familyId' });
    }

    const threshold = await thresholdService.enableThreshold(familyId as string, categoryId);

    if (!threshold) {
      return res.status(404).json({ error: 'Threshold not found' });
    }

    res.status(200).json(threshold);
  } catch (error) {
    console.error('Error enabling threshold:', error);
    res.status(500).json({ error: 'Failed to enable threshold' });
  }
});

/**
 * PATCH /api/thresholds/:categoryId/disable
 * Disable a threshold
 * Query params: familyId
 */
router.patch('/:categoryId/disable', async (req: Request, res: Response) => {
  try {
    const { categoryId } = req.params;
    const { familyId } = req.query;

    if (!familyId) {
      return res.status(400).json({ error: 'Missing required query parameter: familyId' });
    }

    const threshold = await thresholdService.disableThreshold(familyId as string, categoryId);

    if (!threshold) {
      return res.status(404).json({ error: 'Threshold not found' });
    }

    res.status(200).json(threshold);
  } catch (error) {
    console.error('Error disabling threshold:', error);
    res.status(500).json({ error: 'Failed to disable threshold' });
  }
});

export default router;
