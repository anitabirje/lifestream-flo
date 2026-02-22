import React from 'react';
import './FeaturesGrid.css';

interface Feature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface FeaturesGridProps {
  features?: Feature[];
}

const DEFAULT_FEATURES: Feature[] = [
  {
    id: '1',
    icon: '📅',
    title: 'Consolidated Calendar View',
    description: 'See all family members\' events in one unified weekly view with color-coded categories.',
  },
  {
    id: '2',
    icon: '📊',
    title: 'Time Tracking & Analytics',
    description: 'Track time allocation across activities and compare actual vs ideal time spent.',
  },
  {
    id: '3',
    icon: '🤖',
    title: 'Intelligent Classification',
    description: 'AI-powered automatic event categorization using advanced machine learning.',
  },
  {
    id: '4',
    icon: '⚠️',
    title: 'Conflict Detection',
    description: 'Automatically detect overlapping events and get smart resolution suggestions.',
  },
  {
    id: '5',
    icon: '⏰',
    title: 'Proactive Time Booking',
    description: 'Get suggestions for activities with insufficient allocated time.',
  },
  {
    id: '6',
    icon: '📈',
    title: 'Weekly Summaries',
    description: 'Receive consolidated reports on calendar events and time allocation.',
  },
];

export const FeaturesGrid: React.FC<FeaturesGridProps> = ({
  features = DEFAULT_FEATURES,
}) => {
  return (
    <section id="features" className="features-section">
      <div className="features-container">
        <div className="section-header">
          <h2 className="section-title">Powerful Features</h2>
          <p className="section-subtitle">
            Everything you need to keep your family organized and on track
          </p>
        </div>

        <div className="features-grid">
          {features.map((feature) => (
            <div key={feature.id} className="feature-card card">
              <div className="feature-icon">{feature.icon}</div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-description">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
