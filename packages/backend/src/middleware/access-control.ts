/**
 * Access Control Middleware
 * Validates user permissions for calendar operations
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../auth/auth-service';
import { getDefaultPermissions, hasPermission, AccessControl } from '../models/access-control';
import { User } from '../models/user';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      accessControl?: AccessControl;
    }
  }
}

/**
 * Middleware to authenticate user from session token
 */
export function authenticate(authService: AuthService) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const sessionToken = req.headers.authorization?.replace('Bearer ', '');

      if (!sessionToken) {
        return res.status(401).json({
          error: 'Authentication required',
        });
      }

      const user = await authService.validateSession(sessionToken);

      if (!user) {
        return res.status(401).json({
          error: 'Invalid or expired session',
        });
      }

      // Attach user and access control to request
      req.user = user;
      req.accessControl = {
        ...getDefaultPermissions(user.role),
        familyMemberId: user.id,
      };

      next();
    } catch (error: any) {
      console.error('Authentication error:', error);
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  };
}

/**
 * Middleware to check specific permission
 */
export function requirePermission(permission: keyof Omit<AccessControl, 'familyMemberId'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.accessControl) {
      return res.status(401).json({
        error: 'Authentication required',
      });
    }

    if (!hasPermission(req.accessControl, permission)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }

    next();
  };
}

/**
 * Middleware to require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required',
    });
  }

  next();
}
