import React from 'react';
import './HowItWorks.css';

interface Step {
  id: string;
  number: number;
  icon: string;
  title: string;
  description: string;
}

interface HowItWorksProps {
  steps?: Step[];
}

const DEFAULT_STEPS: Step[] = [
  {
    id: '1',
    number: 1,
    icon: '🔗',
    title: 'Connect Your Calendars',
    description: 'Link your Google Calendar, Outlook, or other calendar sources to Flo.',
  },
  {
    id: '2',
    number: 2,
    icon: '🏷️',
    title: 'Set Activity Categories',
    description: 'Define custom categories like Work, Family Time, Health, and more.',
  },
  {
    id: '3',
    number: 3,
    icon: '⏱️',
    title: 'Define Time Allocation',
    description: 'Set ideal time targets for each activity category per week.',
  },
  {
    id: '4',
    number: 4,
    icon: '💡',
    title: 'Get Insights & Suggestions',
    description: 'Receive smart recommendations to optimize your family\'s schedule.',
  },
];

export const HowItWorks: React.FC<HowItWorksProps> = ({
  steps = DEFAULT_STEPS,
}) => {
  return (
    <section id="how-it-works" className="how-it-works-section">
      <div className="how-it-works-container">
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            Get started with Flo in just 4 simple steps
          </p>
        </div>

        <div className="steps-grid">
          {steps.map((step) => (
            <div key={step.id} className="step-card">
              <div className="step-number">{step.number}</div>
              <div className="step-icon">{step.icon}</div>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-description">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
