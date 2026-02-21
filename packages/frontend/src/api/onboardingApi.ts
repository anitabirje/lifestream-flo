/**
 * Onboarding API Client
 * Handles communication with onboarding backend endpoints
 */

export interface TimeAllocation {
  ideal: number;
  max?: number;
  min?: number;
}

export interface OnboardingState {
  userId: string;
  familyId: string;
  isComplete: boolean;
  selectedSources: string[];
  connectedSources: Record<string, boolean>;
  categoryTrackingEnabled: boolean;
  customCategories: string[];
  timeAllocations: Record<string, TimeAllocation>;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const onboardingApi = {
  /**
   * Get onboarding state for a user
   */
  async getOnboardingState(userId: string): Promise<OnboardingState | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/onboarding/${userId}`);
      
      if (response.status === 404) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Failed to get onboarding state');
      }

      const data = await response.json();
      return data.state;
    } catch (error) {
      console.error('Error getting onboarding state:', error);
      return null;
    }
  },

  /**
   * Save onboarding state
   */
  async saveOnboardingState(request: SaveOnboardingRequest): Promise<OnboardingState> {
    const response = await fetch(`${API_BASE_URL}/onboarding`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save onboarding state');
    }

    const data = await response.json();
    return data.state;
  },

  /**
   * Mark onboarding as complete
   */
  async markOnboardingComplete(userId: string): Promise<OnboardingState> {
    const response = await fetch(`${API_BASE_URL}/onboarding/${userId}/complete`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to mark onboarding complete');
    }

    const data = await response.json();
    return data.state;
  },

  /**
   * Reset onboarding state (for re-running wizard)
   */
  async resetOnboarding(userId: string): Promise<OnboardingState> {
    const response = await fetch(`${API_BASE_URL}/onboarding/${userId}/reset`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to reset onboarding');
    }

    const data = await response.json();
    return data.state;
  },

  /**
   * Check if user has completed onboarding
   */
  async isOnboardingComplete(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/onboarding/${userId}/status`);

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.isComplete;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  },
};
