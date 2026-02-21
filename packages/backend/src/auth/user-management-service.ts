/**
 * User Management Service
 * Handles adding, removing, and listing family members
 */

import { v4 as uuidv4 } from 'uuid';
import { User, UserDynamoDBItem, userToDynamoDB, userFromDynamoDB } from '../models/user';
import { PasswordManager } from './password-manager';
import { DynamoDBClientWrapper } from '../data-access/dynamodb-client';

export interface AddMemberRequest {
  email: string;
  password: string;
  name: string;
  familyId: string;
  role?: 'admin' | 'member';
}

export interface UserManagementResult {
  success: boolean;
  user?: User;
  error?: string;
}

export class UserManagementService {
  private dynamoClient: DynamoDBClientWrapper;
  private passwordManager: PasswordManager;

  constructor(dynamoClient: DynamoDBClientWrapper, passwordManager: PasswordManager) {
    this.dynamoClient = dynamoClient;
    this.passwordManager = passwordManager;
  }

  /**
   * Add a new family member
   */
  async addMember(request: AddMemberRequest): Promise<UserManagementResult> {
    try {
      // Validate input
      if (!request.email || !request.password || !request.name || !request.familyId) {
        return {
          success: false,
          error: 'Email, password, name, and familyId are required',
        };
      }

      // Check if user already exists
      const existingUser = await this.findUserByEmail(request.email, request.familyId);
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists in this family',
        };
      }

      // Hash password
      const passwordHash = await this.passwordManager.hash(request.password);

      // Create user
      const user: User = {
        id: uuidv4(),
        email: request.email,
        name: request.name,
        passwordHash,
        familyId: request.familyId,
        role: request.role || 'member',
        createdAt: new Date(),
      };

      // Save to database
      const dynamoItem = userToDynamoDB(user);
      await this.dynamoClient.put(dynamoItem);

      return {
        success: true,
        user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to add family member',
      };
    }
  }

  /**
   * Remove a family member (revoke access)
   */
  async removeMember(memberId: string, familyId: string): Promise<UserManagementResult> {
    try {
      if (!memberId || !familyId) {
        return {
          success: false,
          error: 'Member ID and family ID are required',
        };
      }

      // Get the user first
      const user = await this.getUserById(memberId, familyId);
      if (!user) {
        return {
          success: false,
          error: 'Family member not found',
        };
      }

      // Update status to 'removed' instead of deleting
      const dynamoItem = userToDynamoDB(user);
      dynamoItem.status = 'removed';
      dynamoItem.updatedAt = new Date().toISOString();

      await this.dynamoClient.put(dynamoItem);

      // Also invalidate all sessions for this user
      await this.invalidateUserSessions(memberId);

      return {
        success: true,
        user,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to remove family member',
      };
    }
  }

  /**
   * List all family members
   */
  async listMembers(familyId: string): Promise<{ success: boolean; members?: User[]; error?: string }> {
    try {
      if (!familyId) {
        return {
          success: false,
          error: 'Family ID is required',
        };
      }

      const result = await this.dynamoClient.query(
        'PK = :pk AND begins_with(SK, :sk)',
        {
          ':pk': `FAMILY#${familyId}`,
          ':sk': 'MEMBER#',
        }
      );

      const members = result.items
        .filter((dynamoItem) => {
          // Filter out removed users
          const item = dynamoItem as UserDynamoDBItem;
          return item.status !== 'removed';
        })
        .map((dynamoItem) => userFromDynamoDB(dynamoItem as UserDynamoDBItem));

      return {
        success: true,
        members,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to list family members',
      };
    }
  }

  /**
   * Find user by email within a family
   */
  private async findUserByEmail(email: string, familyId: string): Promise<User | null> {
    const result = await this.dynamoClient.query(
      'PK = :pk AND begins_with(SK, :sk)',
      {
        ':pk': `FAMILY#${familyId}`,
        ':sk': 'MEMBER#',
      }
    );

    const users = result.items.map((item) => userFromDynamoDB(item as UserDynamoDBItem));
    return users.find((u) => u.email === email) || null;
  }

  /**
   * Get user by ID
   */
  private async getUserById(userId: string, familyId: string): Promise<User | null> {
    const result = await this.dynamoClient.get({
      PK: `FAMILY#${familyId}`,
      SK: `MEMBER#${userId}`,
    });

    if (!result) {
      return null;
    }

    return userFromDynamoDB(result as UserDynamoDBItem);
  }

  /**
   * Invalidate all sessions for a user
   */
  private async invalidateUserSessions(userId: string): Promise<void> {
    try {
      // Query all sessions for this user
      const result = await this.dynamoClient.query(
        'PK = :pk AND begins_with(SK, :sk)',
        {
          ':pk': `USER#${userId}`,
          ':sk': 'SESSION#',
        }
      );

      // Delete all sessions
      for (const item of result.items) {
        await this.dynamoClient.delete({
          PK: item.PK,
          SK: item.SK,
        });
      }
    } catch (error) {
      console.error('Error invalidating user sessions:', error);
      // Don't throw - session cleanup is best effort
    }
  }
}
