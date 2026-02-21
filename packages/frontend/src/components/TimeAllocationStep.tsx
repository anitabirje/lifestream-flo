import React, { useState } from 'react';
import { DEFAULT_CATEGORIES } from './CategoryTrackingStep';
import './TimeAllocationStep.css';

export interface TimeAllocation {
  ideal: number;
  max?: number;
  min?: number;
}

export interface TimeAllocationStepProps {
  categoryTrackingEnabled: boolean;
  customCategories: string[];
  timeAllocations: Record<string, TimeAllocation>;
  onUpdate: (allocations: Record<string, TimeAllocation>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const TimeAllocationStep: React.FC<TimeAllocationStepProps> = ({
  categoryTrackingEnabled,
  customCategories,
  timeAllocations,
  onUpdate,
  onNext,
  onBack
}) => {
  const allCategories = [
    ...DEFAULT_CATEGORIES,
    ...customCategories.map((name, index) => ({
      id: `custom-${index}`,
      name,
      icon: '📌',
      color: '#607D8B'
    }))
  ];

  const [allocations, setAllocations] = useState<Record<string, TimeAllocation>>(
    timeAllocations || {}
  );

  const handleIdealChange = (categoryId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setAllocations(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        ideal: numValue
      }
    }));
  };

  const handleMaxChange = (categoryId: string, value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    setAllocations(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        max: numValue
      }
    }));
  };

  const handleMinChange = (categoryId: string, value: string) => {
    const numValue = value ? parseFloat(value) : undefined;
    setAllocations(prev => ({
      ...prev,
      [categoryId]: {
        ...prev[categoryId],
        min: numValue
      }
    }));
  };

  const handleNext = () => {
    onUpdate(allocations);
    onNext();
  };

  const totalIdealHours = Object.values(allocations).reduce(
    (sum, alloc) => sum + (alloc.ideal || 0),
    0
  );

  if (!categoryTrackingEnabled) {
    return (
      <div className="time-allocation-step">
        <h2>Time Allocation Preferences</h2>
        <p>Category tracking is disabled</p>
        <div className="tracking-disabled-notice">
          <p>
            Since you've disabled category tracking, you can skip this step.
          </p>
        </div>
        <div className="step-actions">
          <button onClick={onBack}>Back</button>
          <button onClick={handleNext} className="primary">
            Next
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="time-allocation-step">
      <h2>Time Allocation Preferences</h2>
      <p>Set your ideal time allocation and thresholds for each category</p>

      <div className="allocation-info">
        <div className="info-card">
          <h4>What is this?</h4>
          <ul>
            <li><strong>Ideal Hours:</strong> How many hours per week you want to spend on this activity</li>
            <li><strong>Maximum Hours:</strong> Alert when you exceed this threshold</li>
            <li><strong>Minimum Hours:</strong> Alert when you don't meet this threshold</li>
          </ul>
        </div>
      </div>

      <div className="allocations-list">
        {allCategories.map(category => {
          const allocation = allocations[category.id] || { ideal: 0 };
          
          return (
            <div key={category.id} className="allocation-item">
              <div className="category-header">
                <span className="category-icon" style={{ backgroundColor: category.color }}>
                  {category.icon}
                </span>
                <span className="category-name">{category.name}</span>
              </div>

              <div className="allocation-inputs">
                <div className="input-group">
                  <label>Ideal Hours/Week</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={allocation.ideal || ''}
                    onChange={(e) => handleIdealChange(category.id, e.target.value)}
                    placeholder="0"
                  />
                </div>

                <div className="input-group">
                  <label>Max Hours (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={allocation.max || ''}
                    onChange={(e) => handleMaxChange(category.id, e.target.value)}
                    placeholder="No limit"
                  />
                </div>

                <div className="input-group">
                  <label>Min Hours (Optional)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={allocation.min || ''}
                    onChange={(e) => handleMinChange(category.id, e.target.value)}
                    placeholder="No minimum"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="allocation-summary">
        <h4>Weekly Summary</h4>
        <div className="summary-content">
          <div className="summary-item">
            <span>Total Ideal Hours:</span>
            <span className="summary-value">{totalIdealHours.toFixed(1)} hours/week</span>
          </div>
          <div className="summary-item">
            <span>Available Hours in Week:</span>
            <span className="summary-value">168 hours</span>
          </div>
          {totalIdealHours > 168 && (
            <div className="summary-warning">
              ⚠️ Your ideal hours exceed the available hours in a week
            </div>
          )}
        </div>
      </div>

      <div className="step-actions">
        <button onClick={onBack}>Back</button>
        <button onClick={handleNext} className="primary">
          Next
        </button>
      </div>
    </div>
  );
};
