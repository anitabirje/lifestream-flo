/**
 * Push Subscriptions Routes
 * Handles push notification subscription management
 */

import express, { Request, Response } from 'express';
import { DynamoDBDataAccess } from '../data-access/dynamodb-client';
import { PushNotificationService, PushSubscription } from '../services/push-notification-service';
import { config } from '../config/env';

const router = express.Router();

// Initialize services
const dataAccess = new DynamoDBDataAccess({} as any);
const pushService = new PushNotificationService(dataAccess, {
  vapidPublicKey: config.push.vapidPublicKey,
  vapidPrivateKey: config.push.vapidPrivateKey,
  vapidSubject: config.push.vapidSubject,
});

/**
 * POST /api/push-subscriptions
 * Subscribe to push notifications
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { subscription, userAgent } = req.body;
    const userId = (req as any).userId; // From auth middleware
    const familyId = (req as any).familyId; // From auth middleware

    if (!userId || !familyId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription data' });
    }

    const subscriptionId = await pushService.storeSubscription(
      userId,
      familyId,
      subscription as PushSubscription,
      userAgent
    );

    res.status(201).json({
      success: true,
      subscriptionId,
      message: 'Push subscription created successfully',
    });
  } catch (error) {
    console.error('Error creating push subscription:', error);
    res.status(500).json({
      error: 'Failed to create push subscription',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/push-subscriptions
 * Get all push subscriptions for the current user
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId; // From auth middleware

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscriptions = await pushService.getUserSubscriptions(userId);

    res.json({
      success: true,
      subscriptions: subscriptions.map((sub) => ({
        id: sub.id,
        endpoint: sub.endpoint,
        createdAt: sub.createdAt,
        lastUsedAt: sub.lastUsedAt,
        userAgent: sub.userAgent,
      })),
      count: subscriptions.length,
    });
  } catch (error) {
    console.error('Error fetching push subscriptions:', error);
    res.status(500).json({
      error: 'Failed to fetch push subscriptions',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * DELETE /api/push-subscriptions
 * Unsubscribe from push notifications
 */
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { endpoint, subscriptionId } = req.body;
    const userId = (req as any).userId; // From auth middleware

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!subscriptionId && !endpoint) {
      return res.status(400).json({ error: 'subscriptionId or endpoint is required' });
    }

    // If endpoint is provided, find the subscription by endpoint
    let idToDelete = subscriptionId;
    if (!idToDelete && endpoint) {
      const subscriptions = await pushService.getUserSubscriptions(userId);
      const sub = subscriptions.find((s) => s.endpoint === endpoint);
      if (!sub) {
        return res.status(404).json({ error: 'Subscription not found' });
      }
      idToDelete = sub.id;
    }

    const success = await pushService.removeSubscription(userId, idToDelete);

    if (!success) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json({
      success: true,
      message: 'Push subscription removed successfully',
    });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({
      error: 'Failed to remove push subscription',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/push-subscriptions/vapid-public-key
 * Get VAPID public key for client-side subscription
 */
router.get('/vapid-public-key', (req: Request, res: Response) => {
  try {
    res.json({
      vapidPublicKey: config.push.vapidPublicKey,
    });
  } catch (error) {
    console.error('Error fetching VAPID public key:', error);
    res.status(500).json({
      error: 'Failed to fetch VAPID public key',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/push-subscriptions/status
 * Get push notification service status
 */
router.get('/status', (req: Request, res: Response) => {
  try {
    const status = pushService.getStatus();
    res.json({
      success: true,
      status,
    });
  } catch (error) {
    console.error('Error fetching push service status:', error);
    res.status(500).json({
      error: 'Failed to fetch push service status',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
