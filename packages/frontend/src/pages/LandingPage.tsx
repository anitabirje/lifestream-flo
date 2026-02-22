import React from 'react';
import { Navigation } from '../components/Navigation';
import { HeroSection } from '../components/HeroSection';
import { FeaturesGrid } from '../components/FeaturesGrid';
import { HowItWorks } from '../components/HowItWorks';
import { Testimonials } from '../components/Testimonials';
import { CTASection } from '../components/CTASection';
import { Footer } from '../components/Footer';

interface LandingPageProps {
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
  onSignUpClick,
}) => {
  return (
    <main>
      <Navigation onLoginClick={onLoginClick} onSignUpClick={onSignUpClick} />
      <HeroSection
        onGetStartedClick={onSignUpClick}
        onLearnMoreClick={() => {
          const element = document.getElementById('features');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />
      <FeaturesGrid />
      <HowItWorks />
      <Testimonials />
      <CTASection onGetStartedClick={onSignUpClick} />
      <Footer />
    </main>
  );
};
