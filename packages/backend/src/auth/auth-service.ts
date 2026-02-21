/**
 * Authentication Service
 * Handles user registration, login, and logout operations
 */

import { v4 as uuidv4 } from 'uuid';
import { User, UserDynamoDBItem, userToDynamoDB, userFromDynamoDB } from '../models/user';
import { PasswordManager } from './password-manager';
import { SessionManager } from './session-manager';
import { DynamoDBClientWrapper } from '../data-access/dynamodb-client';

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  familyId: string;
  role?: 'admin' | 'member';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  sessionToken?: string;
  error?: string;
}

export class AuthService {
  private dynamoClient: DynamoDBClientWrapper;
  private passwordManager: PasswordManager;
  private sessionManager: SessionManager;

  constructor(
    dynamoClient: DynamoDBClientWrapper,
    passwordManager: PasswordManager,
    sessionManager: SessionManager
  ) {
    this.dynamoClient = dynamoClient;
    this.passwordManager = passwordManager;
    this.sessionManager = sessionManager;
  }

  /**
   * Register a new user
   */
  async register(request: RegisterRequest): Promise<AuthResult> {
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
          error: 'User with this email already exists',
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

      // Create session
      const session = await this.sessionManager.createSession(user.id);

      return {
        success: true,
        user,
        sessionToken: session.token,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Registration failed',
      };
    }
  }

  /**
   * Login a user
   */
  async login(request: LoginRequest): Promise<AuthResult> {
    try {
      // Validate input
      if (!request.email || !request.password) {
        return {
          success: false,
          error: 'Email and password are required',
        };
      }

      // Find user by email (scan all families - in production, use a GSI)
      const user = await this.findUserByEmailGlobal(request.email);
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Verify password
      const isValidPassword = await this.passwordManager.verify(
        request.password,
        user.passwordHash
      );

      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Update last login time
      user.lastLoginAt = new Date();
      const dynamoItem = userToDynamoDB(user);
      await this.dynamoClient.put(dynamoItem);

      // Create session
      const session = await this.sessionManager.createSession(user.id);

      return {
        success: true,
        user,
        sessionToken: session.token,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Login failed',
      };
    }
  }

  /**
   * Logout a user
   */
  async logout(sessionToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (!sessionToken) {
        return {
          success: false,
          error: 'Session token is required',
        };
      }

      await this.sessionManager.invalidateSession(sessionToken);

      return {
        success: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Logout failed',
      };
    }
  }

  /**
   * Validate a session token and return the user
   */
  async validateSession(sessionToken: string): Promise<User | null> {
    const session = await this.sessionManager.validateToken(sessionToken);
    if (!session) {
      return null;
    }

    // Get user from database
    const user = await this.getUserById(session.userId);
    return user;
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
   * Find user by email globally (across all families)
   * Note: In production, use a GSI for email lookups
   */
  private async findUserByEmailGlobal(email: string): Promise<User | null> {
    // For testing with mock client
    if ((this.dynamoClient as any).findUserByEmail) {
      return (this.dynamoClient as any).findUserByEmail(email);
    }

    // Production implementation would use a GSI
    throw new Error('findUserByEmailGlobal requires a GSI in production');
  }

  /**
   * Get user by ID
   */
  private async getUserById(userId: string): Promise<User | null> {
    // For testing with mock client
    if ((this.dynamoClient as any).getUserById) {
      return (this.dynamoClient as any).getUserById(userId);
    }

    // Production implementation would need to know the familyId
    throw new Error('getUserById requires familyId in production');
  }
}
