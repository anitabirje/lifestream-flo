import React, { useState, useEffect } from 'react';
import { onboardingApi } from '../api/onboardingApi';
import './OnboardingSettings.css';

export interface OnboardingSettingsProps {
  userId: string;
  onRerunWizard: () => void;
}

export const OnboardingSettings: React.FC<OnboardingSettingsProps> = ({
  userId,
  onRerunWizard
}) => {
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [completedAt, setCompletedAt] = useState<string | null>(null);

  useEffect(() => {
    const loadOnboardingStatus = async () => {
      try {
        const state = await onboardingApi.getOnboardingState(userId);
        if (state) {
          setIsComplete(state.isComplete);
          setCompletedAt(state.completedAt || null);
        }
      } catch (error) {
        console.error('Error loading onboarding status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOnboardingStatus();
  }, [userId]);

  const handleRerunWizard = async () => {
    if (!confirm('Are you sure you want to re-run the onboarding wizard? This will reset your current preferences.')) {
      return;
    }

    try {
      await onboardingApi.resetOnboarding(userId);
      onRerunWizard();
    } catch (error) {
      console.error('Error resetting onboarding:', error);
      alert('Failed to reset onboarding. Please try again.');
    }
  };

  if (isLoading) {
    return <div className="onboarding-settings">Loading...</div>;
  }

  return (
    <div className="onboarding-settings">
      <h3>Onboarding Setup</h3>
      
      <div className="onboarding-status">
        <div className="status-item">
          <span className="status-label">Status:</span>
          <span className={`status-value ${isComplete ? 'complete' : 'incomplete'}`}>
            {isComplete ? '✓ Complete' : '○ Incomplete'}
          </span>
        </div>
        
        {completedAt && (
          <div className="status-item">
            <span className="status-label">Completed:</span>
            <span className="status-value">
              {new Date(completedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      <div className="onboarding-actions">
        <button onClick={handleRerunWizard} className="rerun-button">
          Re-run Onboarding Wizard
        </button>
        <p className="help-text">
          Re-running the wizard will allow you to update your calendar sources, 
          activity categories, and time allocation preferences.
        </p>
      </div>
    </div>
  );
};
