import React, { useState, useEffect } from 'react';
import './OnboardingWizard.css';
import { CalendarSourcesStep } from './CalendarSourcesStep';
import { SourceConnectionStep } from './SourceConnectionStep';
import { CategoryTrackingStep } from './CategoryTrackingStep';
import { TimeAllocationStep } from './TimeAllocationStep';
import { Footer } from './Footer';
import { onboardingApi } from '../api/onboardingApi';

export type OnboardingStep = 
  | 'calendar-sources'
  | 'source-connection'
  | 'category-tracking'
  | 'time-allocation'
  | 'complete';

export interface OnboardingState {
  currentStep: OnboardingStep;
  selectedSources: string[];
  connectedSources: Record<string, boolean>;
  categoryTrackingEnabled: boolean;
  customCategories: string[];
  timeAllocations: Record<string, { ideal: number; max?: number; min?: number }>;
  isComplete: boolean;
}

export interface OnboardingWizardProps {
  userId: string;
  familyId: string;
  onComplete: (state: OnboardingState) => void;
  onSkip?: () => void;
  initialState?: Partial<OnboardingState>;
}

const STEPS: OnboardingStep[] = [
  'calendar-sources',
  'source-connection',
  'category-tracking',
  'time-allocation',
  'complete'
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  userId,
  familyId,
  onComplete,
  onSkip,
  initialState
}) => {
  const [state, setState] = useState<OnboardingState>({
    currentStep: 'calendar-sources',
    selectedSources: [],
    connectedSources: {},
    categoryTrackingEnabled: true,
    customCategories: [],
    timeAllocations: {},
    isComplete: false,
    ...initialState
  });
  const [isSaving, setIsSaving] = useState(false);

  // Load existing onboarding state on mount
  useEffect(() => {
    const loadOnboardingState = async () => {
      try {
        const existingState = await onboardingApi.getOnboardingState(userId);
        if (existingState && !existingState.isComplete) {
          setState(prev => ({
            ...prev,
            selectedSources: existingState.selectedSources,
            connectedSources: existingState.connectedSources,
            categoryTrackingEnabled: existingState.categoryTrackingEnabled,
            customCategories: existingState.customCategories,
            timeAllocations: existingState.timeAllocations,
          }));
        }
      } catch (error) {
        console.error('Error loading onboarding state:', error);
      }
    };

    loadOnboardingState();
  }, [userId]);

  // Auto-save state on changes
  useEffect(() => {
    const saveState = async () => {
      if (isSaving) return;

      try {
        await onboardingApi.saveOnboardingState({
          userId,
          familyId,
          selectedSources: state.selectedSources,
          connectedSources: state.connectedSources,
          categoryTrackingEnabled: state.categoryTrackingEnabled,
          customCategories: state.customCategories,
          timeAllocations: state.timeAllocations,
          isComplete: false,
        });
      } catch (error) {
        console.error('Error auto-saving onboarding state:', error);
      }
    };

    // Debounce auto-save
    const timeoutId = setTimeout(saveState, 1000);
    return () => clearTimeout(timeoutId);
  }, [
    userId,
    familyId,
    state.selectedSources,
    state.connectedSources,
    state.categoryTrackingEnabled,
    state.customCategories,
    state.timeAllocations,
    isSaving
  ]);

  const currentStepIndex = STEPS.indexOf(state.currentStep);

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setState(prev => ({
        ...prev,
        currentStep: STEPS[nextIndex]
      }));
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setState(prev => ({
        ...prev,
        currentStep: STEPS[prevIndex]
      }));
    }
  };

  const handleComplete = async () => {
    setIsSaving(true);
    try {
      // Save final state with isComplete = true
      await onboardingApi.saveOnboardingState({
        userId,
        familyId,
        selectedSources: state.selectedSources,
        connectedSources: state.connectedSources,
        categoryTrackingEnabled: state.categoryTrackingEnabled,
        customCategories: state.customCategories,
        timeAllocations: state.timeAllocations,
        isComplete: true,
      });

      const finalState = {
        ...state,
        isComplete: true
      };
      setState(finalState);
      onComplete(finalState);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      alert('Failed to save onboarding state. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="onboarding-wizard">
      <div className="wizard-header">
        <h1>Welcome to Flo</h1>
        <p>Let's set up your family calendar</p>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <p className="step-indicator">
          Step {currentStepIndex + 1} of {STEPS.length}
        </p>
      </div>

      <div className="wizard-content">
        {state.currentStep === 'calendar-sources' && (
          <CalendarSourcesStep
            selectedSources={state.selectedSources}
            onUpdate={(sources) => setState(prev => ({ ...prev, selectedSources: sources }))}
            onNext={goToNextStep}
            onSkip={onSkip}
          />
        )}

        {state.currentStep === 'source-connection' && (
          <SourceConnectionStep
            selectedSources={state.selectedSources}
            connectedSources={state.connectedSources}
            onUpdate={(connected) => setState(prev => ({ ...prev, connectedSources: connected }))}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        )}

        {state.currentStep === 'category-tracking' && (
          <CategoryTrackingStep
            enabled={state.categoryTrackingEnabled}
            customCategories={state.customCategories}
            onUpdate={(enabled, categories) => 
              setState(prev => ({ 
                ...prev, 
                categoryTrackingEnabled: enabled,
                customCategories: categories 
              }))
            }
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        )}

        {state.currentStep === 'time-allocation' && (
          <TimeAllocationStep
            categoryTrackingEnabled={state.categoryTrackingEnabled}
            customCategories={state.customCategories}
            timeAllocations={state.timeAllocations}
            onUpdate={(allocations) => setState(prev => ({ ...prev, timeAllocations: allocations }))}
            onNext={goToNextStep}
            onBack={goToPreviousStep}
          />
        )}

        {state.currentStep === 'complete' && (
          <CompleteStep
            onComplete={handleComplete}
            onBack={goToPreviousStep}
          />
        )}
      </div>

      <Footer />
    </div>
  );
};

// Step components will be implemented in separate files
interface CompleteStepProps {
  onComplete: () => void;
  onBack: () => void;
}

const CompleteStep: React.FC<CompleteStepProps> = ({ onComplete, onBack }) => {
  return (
    <div className="step-content">
      <h2>Setup Complete!</h2>
      <p>You're all set to start using Flo</p>
      <div className="step-actions">
        <button onClick={onBack}>Back</button>
        <button onClick={onComplete} className="primary">Get Started</button>
      </div>
    </div>
  );
};
