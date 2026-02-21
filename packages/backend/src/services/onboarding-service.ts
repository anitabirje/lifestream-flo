/**
 * Onboarding Service
 * Manages user onboarding state and preferences
 */

import {
  OnboardingState,
  OnboardingStateDynamoDBItem,
  onboardingStateToDynamoDB,
  onboardingStateFromDynamoDB,
  TimeAllocation
} from '../models/onboarding';
import { DynamoDBClientWrapper } from '../data-access/dynamodb-client';

export interface SaveOnboardingRequest {
  userId: string;
  familyId: string;
  selectedSources: string[];
  connectedSources: Record<string, boolean>;
  categoryTrackingEnabled: boolean;
  customCategories: string[];
  timeAllocations: Record<string, TimeAllocation>;
  isComplete: boolean;
}

export interface OnboardingResult {
  success: boolean;
  state?: OnboardingState;
  error?: string;
}

export class OnboardingService {
  private dynamoClient: DynamoDBClientWrapper;

  constructor(dynamoClient: DynamoDBClientWrapper) {
    this.dynamoClient = dynamoClient;
  }

  /**
   * Save onboarding state
   */
  async saveOnboardingState(request: SaveOnboardingRequest): Promise<OnboardingResult> {
    try {
      // Validate input
      if (!request.userId || !request.familyId) {
        return {
          success: false,
          error: 'User ID and family ID are required',
        };
      }

      // Check if onboarding state already exists
      const existing = await this.getOnboardingState(request.userId);
      
      const now = new Date();
      const state: OnboardingState = {
        userId: request.userId,
        familyId: request.familyId,
        isComplete: request.isComplete,
        selectedSources: request.selectedSources,
        connectedSources: request.connectedSources,
        categoryTrackingEnabled: request.categoryTrackingEnabled,
        customCategories: request.customCategories,
        timeAllocations: request.timeAllocations,
        completedAt: request.isComplete ? now : existing?.completedAt,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      // Save to database
      const dynamoItem = onboardingStateToDynamoDB(state);
      await this.dynamoClient.put(dynamoItem);

      return {
        success: true,
        state,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to save onboarding state',
      };
    }
  }

  /**
   * Get onboarding state for a user
   */
  async getOnboardingState(userId: string): Promise<OnboardingState | null> {
    try {
      if (!userId) {
        return null;
      }

      const result = await this.dynamoClient.get({
        PK: `USER#${userId}`,
        SK: `ONBOARDING#${userId}`,
      });

      if (!result) {
        return null;
      }

      return onboardingStateFromDynamoDB(result as OnboardingStateDynamoDBItem);
    } catch (error) {
      console.error('Error getting onboarding state:', error);
      return null;
    }
  }

  /**
   * Check if user has completed onboarding
   */
  async isOnboardingComplete(userId: string): Promise<boolean> {
    const state = await this.getOnboardingState(userId);
    return state?.isComplete || false;
  }

  /**
   * Mark onboarding as complete
   */
  async markOnboardingComplete(userId: string): Promise<OnboardingResult> {
    try {
      const existing = await this.getOnboardingState(userId);
      
      if (!existing) {
        return {
          success: false,
          error: 'Onboarding state not found',
        };
      }

      const state: OnboardingState = {
        ...existing,
        isComplete: true,
        completedAt: new Date(),
        updatedAt: new Date(),
      };

      const dynamoItem = onboardingStateToDynamoDB(state);
      await this.dynamoClient.put(dynamoItem);

      return {
        success: true,
        state,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to mark onboarding as complete',
      };
    }
  }

  /**
   * Reset onboarding state (for re-running wizard)
   */
  async resetOnboarding(userId: string): Promise<OnboardingResult> {
    try {
      const existing = await this.getOnboardingState(userId);
      
      if (!existing) {
        return {
          success: false,
          error: 'Onboarding state not found',
        };
      }

      const state: OnboardingState = {
        ...existing,
        isComplete: false,
        completedAt: undefined,
        updatedAt: new Date(),
      };

      const dynamoItem = onboardingStateToDynamoDB(state);
      await this.dynamoClient.put(dynamoItem);

      return {
        success: true,
        state,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to reset onboarding',
      };
    }
  }
}
