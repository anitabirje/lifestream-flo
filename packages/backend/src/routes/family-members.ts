/**
 * Family Members API Routes
 * POST /api/family-members - Add a new family member
 * DELETE /api/family-members/:id - Remove a family member
 * GET /api/family-members - List all family members
 */

import { Router, Request, Response } from 'express';
import { UserManagementService } from '../auth/user-management-service';
import { PasswordManager } from '../auth/password-manager';
import { SessionManager } from '../auth/session-manager';
import { AuthService } from '../auth/auth-service';
import { getDynamoDBClient } from '../data-access/dynamodb-client';
import { authenticate, requirePermission } from '../middleware/access-control';

const router = Router();

// Initialize services
const dynamoClient = getDynamoDBClient();
const passwordManager = new PasswordManager();
const sessionManager = new SessionManager(dynamoClient);
const authService = new AuthService(dynamoClient, passwordManager, sessionManager);
const userManagementService = new UserManagementService(dynamoClient, passwordManager);

/**
 * POST /api/family-members
 * Add a new family member (requires canManageUsers permission)
 */
router.post(
  '/',
  authenticate(authService),
  requirePermission('canManageUsers'),
  async (req: Request, res: Response) => {
    try {
      const { email, password, name, role } = req.body;
      const familyId = req.user!.familyId;

      const result = await userManagementService.addMember({
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

      // Return user without password hash
      const { passwordHash, ...userWithoutPassword } = result.user!;

      res.status(201).json({
        member: userWithoutPassword,
      });
    } catch (error: any) {
      console.error('Add member error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

/**
 * DELETE /api/family-members/:id
 * Remove a family member (requires canManageUsers permission)
 */
router.delete(
  '/:id',
  authenticate(authService),
  requirePermission('canManageUsers'),
  async (req: Request, res: Response) => {
    try {
      const memberId = req.params.id;
      const familyId = req.user!.familyId;

      // Prevent removing yourself
      if (memberId === req.user!.id) {
        return res.status(400).json({
          error: 'Cannot remove yourself',
        });
      }

      const result = await userManagementService.removeMember(memberId, familyId);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
        });
      }

      res.status(200).json({
        message: 'Family member removed successfully',
      });
    } catch (error: any) {
      console.error('Remove member error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/family-members
 * List all family members (requires canViewCalendar permission)
 */
router.get(
  '/',
  authenticate(authService),
  requirePermission('canViewCalendar'),
  async (req: Request, res: Response) => {
    try {
      const familyId = req.user!.familyId;

      const result = await userManagementService.listMembers(familyId);

      if (!result.success) {
        return res.status(400).json({
          error: result.error,
        });
      }

      // Return members without password hashes
      const membersWithoutPasswords = result.members!.map((member) => {
        const { passwordHash, ...memberWithoutPassword } = member;
        return memberWithoutPassword;
      });

      res.status(200).json({
        members: membersWithoutPasswords,
      });
    } catch (error: any) {
      console.error('List members error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  }
);

export default router;
