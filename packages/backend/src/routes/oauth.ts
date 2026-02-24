/**
 * OAuth API Routes
 * GET /api/oauth/google/authorize - Redirect to Google OAuth consent screen
 * GET /api/oauth/google/callback - Handle Google OAuth callback
 * GET /api/oauth/outlook/authorize - Redirect to Outlook OAuth consent screen
 * GET /api/oauth/outlook/callback - Handle Outlook OAuth callback
 */

import { Router, Request, Response } from 'express';
import { OAuthService } from '../services/oauth-service';
import { CalendarSourceRegistry } from '../services/calendar-source-registry';
import { AuditLogger } from '../services/audit-logger';
import { getDynamoDBClient } from '../data-access/dynamodb-client';
import { dynamoDBDataAccess } from '../data-access/dynamodb-client';
import { AuthService } from '../auth/auth-service';
import { PasswordManager } from '../auth/password-manager';
import { SessionManager } from '../auth/session-manager';
import { authenticate, requirePermission } from '../middleware/access-control';

const router = Router();

// Initialize services
const dynamoClient = getDynamoDBClient();
const passwordManager = new PasswordManager();
const sessionManager = new SessionManager(dynamoClient);
const authService = new AuthService(dynamoClient, passwordManager, sessionManager);
const auditLogger = new AuditLogger(dynamoDBDataAccess);

// Get OAuth config from environment
const oauthConfig = {
  google: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3001/api/oauth/google/callback',
  },
  outlook: {
    clientId: process.env.OUTLOOK_OAUTH_CLIENT_ID || '',
    clientSecret: process.env.OUTLOOK_OAUTH_CLIENT_SECRET || '',
    redirectUri: process.env.OUTLOOK_OAUTH_REDIRECT_URI || 'http://localhost:3001/api/oauth/outlook/callback',
  },
};

const oauthService = new OAuthService(dynamoDBDataAccess as any, oauthConfig);
const calendarSourceRegistry = new CalendarSourceRegistry(dynamoDBDataAccess as any, {
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-encryption-key',
  maxRetries: 3,
});

/**
 * GET /api/oauth/google/authorize
 * Redirect to Google OAuth consent screen
 * Query params:
 *   - familyMemberId: ID of the family member
 */
router.get('/google/authorize', authenticate(authService), async (req: Request, res: Response) => {
  try {
    const { familyMemberId } = req.query;
    const familyId = req.user!.familyId;

    if (!familyMemberId) {
      return res.status(400).json({
        error: 'familyMemberId query parameter is required',
      });
    }

    if (!oauthConfig.google.clientId || !oauthConfig.google.clientSecret) {
      return res.status(500).json({
        error: 'Google OAuth is not configured',
      });
    }

    const authUrl = oauthService.generateGoogleAuthUrl(familyMemberId as string, familyId);

    res.status(200).json({
      authUrl,
    });
  } catch (error: any) {
    console.error('Google OAuth authorize error:', error);
    res.status(500).json({
      error: 'Failed to generate Google OAuth URL',
    });
  }
});

/**
 * GET /api/oauth/google/callback
 * Handle Google OAuth callback
 * Query params:
 *   - code: Authorization code from Google
 *   - state: State parameter for CSRF protection
 */
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({
        error: `Google OAuth error: ${error}`,
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        error: 'Missing code or state parameter',
      });
    }

    // Extract family ID and member ID from state
    const stateParts = (state as string).split(':');
    if (stateParts.length !== 3) {
      return res.status(400).json({
        error: 'Invalid state format',
      });
    }

    const [, familyMemberId] = stateParts;
    // In production, retrieve familyId from state validation
    // For now, we'll need to get it from the request context
    // This is a simplified implementation - in production, use proper state validation

    // Exchange code for token
    const token = await oauthService.exchangeGoogleCode(code as string, state as string);

    // Return token to frontend (frontend will send it back to complete the flow)
    res.status(200).json({
      success: true,
      provider: 'google',
      familyMemberId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      message: 'Google Calendar connected successfully',
    });
  } catch (error: any) {
    console.error('Google OAuth callback error:', error);
    res.status(400).json({
      error: error.message || 'Failed to complete Google OAuth flow',
    });
  }
});

/**
 * GET /api/oauth/outlook/authorize
 * Redirect to Outlook OAuth consent screen
 * Query params:
 *   - familyMemberId: ID of the family member
 */
router.get('/outlook/authorize', authenticate(authService), async (req: Request, res: Response) => {
  try {
    const { familyMemberId } = req.query;
    const familyId = req.user!.familyId;

    if (!familyMemberId) {
      return res.status(400).json({
        error: 'familyMemberId query parameter is required',
      });
    }

    if (!oauthConfig.outlook.clientId || !oauthConfig.outlook.clientSecret) {
      return res.status(500).json({
        error: 'Outlook OAuth is not configured',
      });
    }

    const authUrl = oauthService.generateOutlookAuthUrl(familyMemberId as string, familyId);

    res.status(200).json({
      authUrl,
    });
  } catch (error: any) {
    console.error('Outlook OAuth authorize error:', error);
    res.status(500).json({
      error: 'Failed to generate Outlook OAuth URL',
    });
  }
});

/**
 * GET /api/oauth/outlook/callback
 * Handle Outlook OAuth callback
 * Query params:
 *   - code: Authorization code from Microsoft
 *   - state: State parameter for CSRF protection
 */
router.get('/outlook/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    if (error) {
      return res.status(400).json({
        error: `Outlook OAuth error: ${error}`,
      });
    }

    if (!code || !state) {
      return res.status(400).json({
        error: 'Missing code or state parameter',
      });
    }

    // Extract family ID and member ID from state
    const stateParts = (state as string).split(':');
    if (stateParts.length !== 3) {
      return res.status(400).json({
        error: 'Invalid state format',
      });
    }

    const [, familyMemberId] = stateParts;

    // Exchange code for token
    const token = await oauthService.exchangeOutlookCode(code as string, state as string);

    // Return token to frontend (frontend will send it back to complete the flow)
    res.status(200).json({
      success: true,
      provider: 'outlook',
      familyMemberId,
      accessToken: token.accessToken,
      refreshToken: token.refreshToken,
      expiresAt: token.expiresAt,
      message: 'Outlook Calendar connected successfully',
    });
  } catch (error: any) {
    console.error('Outlook OAuth callback error:', error);
    res.status(400).json({
      error: error.message || 'Failed to complete Outlook OAuth flow',
    });
  }
});

/**
 * POST /api/oauth/complete
 * Complete the OAuth flow by storing the token in the calendar source registry
 * Request body:
 *   - provider: 'google' | 'outlook'
 *   - familyMemberId: ID of the family member
 *   - accessToken: OAuth access token
 *   - refreshToken: OAuth refresh token
 *   - expiresAt: Token expiration time
 */
router.post(
  '/complete',
  authenticate(authService),
  requirePermission('canManageSources'),
  async (req: Request, res: Response) => {
    try {
      const { provider, familyMemberId, accessToken, refreshToken, expiresAt } = req.body;
      const familyId = req.user!.familyId;
      const userId = req.user!.id;

      if (!provider || !familyMemberId || !accessToken) {
        return res.status(400).json({
          error: 'Missing required fields: provider, familyMemberId, accessToken',
        });
      }

      if (!['google', 'outlook'].includes(provider)) {
        return res.status(400).json({
          error: 'Invalid provider. Must be "google" or "outlook"',
        });
      }

      // Store the OAuth token as a calendar source
      const credentials = {
        accessToken,
        refreshToken,
        expiresAt: new Date(expiresAt),
        tokenType: 'Bearer',
      };

      const source = await calendarSourceRegistry.registerSource(
        familyMemberId,
        provider,
        credentials,
        familyId
      );

      // Log the action
      await auditLogger.logEntityChange(
        familyId,
        'calendar_source',
        source.id,
        'created',
        userId,
        undefined,
        { familyMemberId, type: provider, provider }
      );

      // Return sanitized response
      const sanitizedSource = {
        id: source.id,
        familyMemberId: source.familyMemberId,
        type: source.type,
        lastSyncTime: source.lastSyncTime,
        syncStatus: source.syncStatus,
        retryCount: source.retryCount,
        assignedAgentId: source.assignedAgentId,
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
      };

      res.status(201).json({
        success: true,
        source: sanitizedSource,
        message: `${provider} calendar connected successfully`,
      });
    } catch (error: any) {
      console.error('OAuth complete error:', error);
      res.status(400).json({
        error: error.message || 'Failed to complete OAuth flow',
      });
    }
  }
);

export default router;
