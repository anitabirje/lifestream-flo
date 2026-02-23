import React from 'react';
import './HeroSection.css';

interface HeroSectionProps {
  onGetStartedClick?: () => void;
  onLearnMoreClick?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onGetStartedClick,
  onLearnMoreClick,
}) => {
  return (
    <section className="hero-section">
      <div className="hero-container">
        <div className="hero-content">
          <h1 className="hero-headline gradient-text">
            Go with the flow of family life
          </h1>
          <p className="hero-subheading">
            Consolidate calendars, track time allocation, and get intelligent
            insights to help your family stay organized and balanced.
          </p>

          <div className="hero-buttons">
            <button
              className="btn btn-primary"
              onClick={onGetStartedClick}
              aria-label="Get Started"
            >
              Get Started
            </button>
            <button
              className="btn btn-secondary"
              onClick={onLearnMoreClick}
              aria-label="Learn More"
            >
              Learn More
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat">
              <div className="stat-number">10</div>
              <div className="stat-label">Specialized AI Agents</div>
            </div>
            <div className="stat">
              <div className="stat-number">7</div>
              <div className="stat-label">AWS Services</div>
            </div>
            <div className="stat">
              <div className="stat-number">∞</div>
              <div className="stat-label">Streams of Life Connected</div>
            </div>
          </div>
        </div>

        <div className="hero-visuals hidden-mobile">
          <div className="floating-card card-1">
            <div className="card-header">
              <div className="card-dot"></div>
              <span>Family Time</span>
            </div>
            <div className="card-time">2:00 PM - 3:30 PM</div>
          </div>

          <div className="floating-card card-2">
            <div className="card-header">
              <div className="card-dot"></div>
              <span>Work</span>
            </div>
            <div className="card-time">9:00 AM - 5:00 PM</div>
          </div>

          <div className="floating-card card-3">
            <div className="card-header">
              <div className="card-dot"></div>
              <span>Health & Fitness</span>
            </div>
            <div className="card-time">6:00 PM - 7:00 PM</div>
          </div>
        </div>
      </div>
    </section>
  );
};
