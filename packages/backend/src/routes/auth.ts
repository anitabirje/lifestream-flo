/**
 * Authentication API Routes
 * POST /api/auth/register - Register a new user
 * POST /api/auth/login - Login a user
 * POST /api/auth/logout - Logout a user
 */

import { Router, Request, Response } from 'express';
import { AuthService } from '../auth/auth-service';
import { PasswordManager } from '../auth/password-manager';
import { SessionManager } from '../auth/session-manager';
import { dynamoDBDataAccess } from '../data-access/dynamodb-client';

const router = Router();

// Initialize services
const passwordManager = new PasswordManager();
const sessionManager = new SessionManager(dynamoDBDataAccess);
const authService = new AuthService(dynamoDBDataAccess, passwordManager, sessionManager);

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, familyId, role } = req.body;

    const result = await authService.register({
      email,
      password,
      name,
      familyId,
      role,
    });

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
      });
    }

    // Return user and session token (exclude password hash)
    const { passwordHash, ...userWithoutPassword } = result.user!;

    res.status(201).json({
      user: userWithoutPassword,
      sessionToken: result.sessionToken,
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/login
 * Login a user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login({
      email,
      password,
    });

    if (!result.success) {
      return res.status(401).json({
        error: result.error,
      });
    }

    // Return user and session token (exclude password hash)
    const { passwordHash, ...userWithoutPassword } = result.user!;

    res.status(200).json({
      user: userWithoutPassword,
      sessionToken: result.sessionToken,
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout a user
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({
        error: 'Session token is required',
      });
    }

    const result = await authService.logout(sessionToken);

    if (!result.success) {
      return res.status(400).json({
        error: result.error,
      });
    }

    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user from session token
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '');

    if (!sessionToken) {
      return res.status(401).json({
        error: 'Session token is required',
      });
    }

    const user = await authService.validateSession(sessionToken);

    if (!user) {
      return res.status(401).json({
        error: 'Invalid or expired session',
      });
    }

    // Return user (exclude password hash)
    const { passwordHash, ...userWithoutPassword } = user;

    res.status(200).json({
      user: userWithoutPassword,
    });
  } catch (error: any) {
    console.error('Session validation error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

export default router;
