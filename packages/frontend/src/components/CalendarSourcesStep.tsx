import React from 'react';
import './CalendarSourcesStep.css';

export interface CalendarSource {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const AVAILABLE_SOURCES: CalendarSource[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    description: 'Connect your Google Calendar events',
    icon: '📅'
  },
  {
    id: 'outlook',
    name: 'Outlook Calendar',
    description: 'Connect your Microsoft Outlook calendar',
    icon: '📧'
  },
  {
    id: 'school-newsletter',
    name: 'School Newsletter',
    description: 'Parse events from school newsletter emails',
    icon: '🏫'
  },
  {
    id: 'seesaw',
    name: 'SeeSaw',
    description: 'Connect to SeeSaw school app',
    icon: '🎓'
  },
  {
    id: 'connect-now',
    name: 'Connect Now',
    description: 'Connect to Connect Now school app',
    icon: '📱'
  },
  {
    id: 'seqta',
    name: 'SEQTA',
    description: 'Connect to SEQTA school platform',
    icon: '🎒'
  },
  {
    id: 'extracurricular',
    name: 'Extracurricular Activities',
    description: 'Manually add sports, music, clubs, and other activities',
    icon: '⚽'
  }
];

export interface CalendarSourcesStepProps {
  selectedSources: string[];
  onUpdate: (sources: string[]) => void;
  onNext: () => void;
  onSkip?: () => void;
}

export const CalendarSourcesStep: React.FC<CalendarSourcesStepProps> = ({
  selectedSources,
  onUpdate,
  onNext,
  onSkip
}) => {
  const toggleSource = (sourceId: string) => {
    if (selectedSources.includes(sourceId)) {
      onUpdate(selectedSources.filter(id => id !== sourceId));
    } else {
      onUpdate([...selectedSources, sourceId]);
    }
  };

  const handleNext = () => {
    if (selectedSources.length === 0) {
      alert('Please select at least one calendar source to continue');
      return;
    }
    onNext();
  };

  return (
    <div className="calendar-sources-step">
      <h2>Select Calendar Sources</h2>
      <p>Choose which calendars you want to consolidate into your family calendar</p>
      
      <div className="sources-grid">
        {AVAILABLE_SOURCES.map(source => (
          <div
            key={source.id}
            className={`source-card ${selectedSources.includes(source.id) ? 'selected' : ''}`}
            onClick={() => toggleSource(source.id)}
          >
            <div className="source-icon">{source.icon}</div>
            <div className="source-info">
              <h3>{source.name}</h3>
              <p>{source.description}</p>
            </div>
            <div className="source-checkbox">
              <input
                type="checkbox"
                checked={selectedSources.includes(source.id)}
                onChange={() => toggleSource(source.id)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="selection-summary">
        <p>
          {selectedSources.length === 0 
            ? 'No sources selected' 
            : `${selectedSources.length} source${selectedSources.length > 1 ? 's' : ''} selected`}
        </p>
      </div>

      <div className="step-actions">
        {onSkip && (
          <button onClick={onSkip} className="secondary">
            Skip Setup
          </button>
        )}
        <button 
          onClick={handleNext} 
          className="primary"
          disabled={selectedSources.length === 0}
        >
          Next
        </button>
      </div>
    </div>
  );
};
