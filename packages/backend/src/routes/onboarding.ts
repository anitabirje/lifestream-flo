/**
 * Onboarding API Routes
 * Handles onboarding state management
 */

import { Router, Request, Response } from 'express';
import { OnboardingService } from '../services/onboarding-service';
import { DynamoDBClientWrapper } from '../data-access/dynamodb-client';

const router = Router();

// Initialize service
const dynamoClient = new DynamoDBClientWrapper();
const onboardingService = new OnboardingService(dynamoClient);

/**
 * GET /api/onboarding/:userId
 * Get onboarding state for a user
 */
router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const state = await onboardingService.getOnboardingState(userId);

    if (!state) {
      return res.status(404).json({
        success: false,
        error: 'Onboarding state not found',
      });
    }

    res.json({
      success: true,
      state,
    });
  } catch (error: any) {
    console.error('Error getting onboarding state:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get onboarding state',
    });
  }
});

/**
 * POST /api/onboarding
 * Save onboarding state
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      userId,
      familyId,
      selectedSources,
      connectedSources,
      categoryTrackingEnabled,
      customCategories,
      timeAllocations,
      isComplete
    } = req.body;

    const result = await onboardingService.saveOnboardingState({
      userId,
      familyId,
      selectedSources: selectedSources || [],
      connectedSources: connectedSources || {},
      categoryTrackingEnabled: categoryTrackingEnabled !== false,
      customCategories: customCategories || [],
      timeAllocations: timeAllocations || {},
      isComplete: isComplete || false,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error saving onboarding state:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to save onboarding state',
    });
  }
});

/**
 * POST /api/onboarding/:userId/complete
 * Mark onboarding as complete
 */
router.post('/:userId/complete', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await onboardingService.markOnboardingComplete(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error marking onboarding complete:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to mark onboarding complete',
    });
  }
});

/**
 * POST /api/onboarding/:userId/reset
 * Reset onboarding state (for re-running wizard)
 */
router.post('/:userId/reset', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const result = await onboardingService.resetOnboarding(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error resetting onboarding:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to reset onboarding',
    });
  }
});

/**
 * GET /api/onboarding/:userId/status
 * Check if user has completed onboarding
 */
router.get('/:userId/status', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const isComplete = await onboardingService.isOnboardingComplete(userId);

    res.json({
      success: true,
      isComplete,
    });
  } catch (error: any) {
    console.error('Error checking onboarding status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check onboarding status',
    });
  }
});

export default router;
