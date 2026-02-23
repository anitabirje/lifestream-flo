import React from 'react';
import './CTASection.css';

interface CTASectionProps {
  onGetStartedClick?: () => void;
}

export const CTASection: React.FC<CTASectionProps> = ({
  onGetStartedClick,
}) => {
  return (
    <section className="cta-section">
      <div className="cta-container">
        <h2 className="cta-headline">Ready to go with the flow?</h2>
        <p className="cta-subheading">
          Built for families who want to stay organized and balanced. Start your free trial today.
        </p>
        <button
          className="btn btn-primary"
          onClick={onGetStartedClick}
          aria-label="Get Started"
        >
          Get Started Free
        </button>
      </div>
    </section>
  );
};
