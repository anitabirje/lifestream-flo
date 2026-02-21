import React, { useState } from 'react';
import { AVAILABLE_SOURCES } from './CalendarSourcesStep';
import './SourceConnectionStep.css';

export interface SourceConnectionStepProps {
  selectedSources: string[];
  connectedSources: Record<string, boolean>;
  onUpdate: (connected: Record<string, boolean>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const SourceConnectionStep: React.FC<SourceConnectionStepProps> = ({
  selectedSources,
  connectedSources,
  onUpdate,
  onNext,
  onBack
}) => {
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [credentials, setCredentials] = useState<Record<string, any>>({});

  const currentSourceId = selectedSources[currentSourceIndex];
  const currentSource = AVAILABLE_SOURCES.find(s => s.id === currentSourceId);

  const isLastSource = currentSourceIndex === selectedSources.length - 1;
  const allConnected = selectedSources.every(id => connectedSources[id]);

  const handleConnect = () => {
    // Simulate connection (in real implementation, this would call backend API)
    onUpdate({
      ...connectedSources,
      [currentSourceId]: true
    });

    if (!isLastSource) {
      setCurrentSourceIndex(currentSourceIndex + 1);
    }
  };

  const handleSkipSource = () => {
    // Mark as skipped (not connected)
    onUpdate({
      ...connectedSources,
      [currentSourceId]: false
    });

    if (!isLastSource) {
      setCurrentSourceIndex(currentSourceIndex + 1);
    }
  };

  const handleNext = () => {
    if (Object.keys(connectedSources).length === 0) {
      alert('Please connect at least one source or skip to continue');
      return;
    }
    onNext();
  };

  if (!currentSource) {
    return (
      <div className="source-connection-step">
        <h2>Connect Calendar Sources</h2>
        <p>All sources processed</p>
        <div className="step-actions">
          <button onClick={onBack}>Back</button>
          <button onClick={handleNext} className="primary">Next</button>
        </div>
      </div>
    );
  }

  return (
    <div className="source-connection-step">
      <h2>Connect Calendar Sources</h2>
      <p>Connect to your selected calendar sources</p>

      <div className="connection-progress">
        <p>
          Connecting source {currentSourceIndex + 1} of {selectedSources.length}
        </p>
        <div className="progress-dots">
          {selectedSources.map((sourceId, index) => (
            <div
              key={sourceId}
              className={`dot ${index === currentSourceIndex ? 'active' : ''} ${
                connectedSources[sourceId] ? 'connected' : ''
              }`}
            />
          ))}
        </div>
      </div>

      <div className="source-connection-card">
        <div className="source-header">
          <span className="source-icon">{currentSource.icon}</span>
          <div>
            <h3>{currentSource.name}</h3>
            <p>{currentSource.description}</p>
          </div>
        </div>

        <div className="connection-form">
          {renderConnectionForm(currentSourceId, credentials, setCredentials)}
        </div>

        <div className="connection-actions">
          <button onClick={handleSkipSource} className="secondary">
            Skip This Source
          </button>
          <button onClick={handleConnect} className="primary">
            Connect
          </button>
        </div>
      </div>

      <div className="connection-summary">
        <h4>Connection Status</h4>
        <ul>
          {selectedSources.map(sourceId => {
            const source = AVAILABLE_SOURCES.find(s => s.id === sourceId);
            return (
              <li key={sourceId} className={connectedSources[sourceId] ? 'connected' : ''}>
                <span>{source?.icon} {source?.name}</span>
                <span className="status">
                  {connectedSources[sourceId] === true
                    ? '✓ Connected'
                    : connectedSources[sourceId] === false
                    ? '⊘ Skipped'
                    : '○ Pending'}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="step-actions">
        <button onClick={onBack}>Back</button>
        <button
          onClick={handleNext}
          className="primary"
          disabled={!allConnected && currentSourceIndex < selectedSources.length - 1}
        >
          {allConnected || currentSourceIndex === selectedSources.length - 1 ? 'Next' : 'Finish Connecting'}
        </button>
      </div>
    </div>
  );
};

function renderConnectionForm(
  sourceId: string,
  credentials: Record<string, any>,
  setCredentials: (creds: Record<string, any>) => void
) {
  const updateCredential = (key: string, value: string) => {
    setCredentials({
      ...credentials,
      [sourceId]: {
        ...(credentials[sourceId] || {}),
        [key]: value
      }
    });
  };

  switch (sourceId) {
    case 'google':
      return (
        <div className="oauth-connection">
          <p>Click the button below to authenticate with Google</p>
          <button className="oauth-button google">
            Sign in with Google
          </button>
          <p className="oauth-note">
            You'll be redirected to Google to grant calendar access
          </p>
        </div>
      );

    case 'outlook':
      return (
        <div className="oauth-connection">
          <p>Click the button below to authenticate with Microsoft</p>
          <button className="oauth-button microsoft">
            Sign in with Microsoft
          </button>
          <p className="oauth-note">
            You'll be redirected to Microsoft to grant calendar access
          </p>
        </div>
      );

    case 'school-newsletter':
      return (
        <div className="credential-form">
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="school-newsletter@example.com"
              onChange={(e) => updateCredential('email', e.target.value)}
            />
            <p className="help-text">
              Enter the email address where you receive school newsletters
            </p>
          </div>
        </div>
      );

    case 'seesaw':
    case 'connect-now':
    case 'seqta':
      return (
        <div className="credential-form">
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Your username"
              onChange={(e) => updateCredential('username', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Your password"
              onChange={(e) => updateCredential('password', e.target.value)}
            />
          </div>
          <p className="help-text">
            Your credentials are encrypted and stored securely
          </p>
        </div>
      );

    case 'extracurricular':
      return (
        <div className="manual-entry">
          <p>
            You'll be able to manually add extracurricular activities after setup is complete
          </p>
          <p className="help-text">
            No connection required - just click Connect to continue
          </p>
        </div>
      );

    default:
      return (
        <div className="generic-form">
          <p>Connection details for this source will be configured</p>
        </div>
      );
  }
}
