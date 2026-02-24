/**
 * Ideal Time Allocation API Routes
 * Endpoints for managing ideal time allocation preferences
 */

import { Router, Request, Response } from 'express';
import { IdealAllocationService } from '../services/ideal-allocation-service';
import { dynamoDBClient } from '../config/dynamodb';
import { getTableName } from '../config/dynamodb';

const router = Router();

// Initialize service
const tableName = getTableName();
const idealAllocationService = new IdealAllocationService(dynamoDBClient, tableName);

/**
 * PUT /api/ideal-allocation
 * Set or update ideal time allocation preferences
 * Body: { familyMemberId, categoryId, categoryName, allocationType, targetValue }
 */
router.put('/', async (req: Request, res: Response) => {
  try {
    const { familyMemberId, categoryId, categoryName, allocationType, targetValue } = req.body;

    // Validate required fields
    if (!familyMemberId || !categoryId || !categoryName || !allocationType || targetValue === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: familyMemberId, categoryId, categoryName, allocationType, targetValue',
      });
    }

    // For now, use a default familyId (in production, this would come from authenticated session)
    const familyId = req.body.familyId || 'default-family';

    const allocation = await idealAllocationService.updateIdealAllocation(
      familyId,
      familyMemberId,
      categoryId,
      categoryName,
      allocationType,
      targetValue
    );

    res.status(200).json(allocation);
  } catch (error) {
    console.error('Error setting ideal allocation:', error);
    res.status(500).json({ error: 'Failed to set ideal allocation' });
  }
});

/**
 * GET /api/ideal-allocation
 * Get ideal time allocation preferences
 * Query params: familyMemberId (optional), categoryId (optional)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { familyMemberId, categoryId } = req.query;

    // For now, use a default familyId (in production, this would come from authenticated session)
    const familyId = (req.query.familyId as string) || 'default-family';

    // If both familyMemberId and categoryId are provided, get specific allocation
    if (familyMemberId && categoryId) {
      const allocation = await idealAllocationService.getIdealAllocation(
        familyId,
        familyMemberId as string,
        categoryId as string
      );

      if (!allocation) {
        return res.status(404).json({ error: 'Ideal allocation not found' });
      }

      return res.status(200).json(allocation);
    }

    // If only familyMemberId is provided, get all allocations for that member
    if (familyMemberId) {
      const allocations = await idealAllocationService.getIdealAllocationsForMember(
        familyId,
        familyMemberId as string
      );
      return res.status(200).json(allocations);
    }

    // Otherwise, get all allocations for the family
    const allocations = await idealAllocationService.getIdealAllocationsForFamily(familyId);
    res.status(200).json(allocations);
  } catch (error) {
    console.error('Error getting ideal allocation:', error);
    res.status(500).json({ error: 'Failed to get ideal allocation' });
  }
});

/**
 * DELETE /api/ideal-allocation
 * Delete ideal time allocation preference
 * Query params: familyMemberId, categoryId
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { familyMemberId, categoryId } = req.query;

    if (!familyMemberId || !categoryId) {
      return res.status(400).json({ error: 'Missing required query parameters: familyMemberId, categoryId' });
    }

    // For now, use a default familyId (in production, this would come from authenticated session)
    const familyId = (req.query.familyId as string) || 'default-family';

    await idealAllocationService.deleteIdealAllocation(familyId, familyMemberId as string, categoryId as string);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting ideal allocation:', error);
    res.status(500).json({ error: 'Failed to delete ideal allocation' });
  }
});

export default router;
