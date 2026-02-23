import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import { HeroSection } from '../components/HeroSection';
import { FeaturesGrid } from '../components/FeaturesGrid';
import { HowItWorks } from '../components/HowItWorks';
import { CTASection } from '../components/CTASection';
import { Footer } from '../components/Footer';

interface LandingPageProps {
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  // onLoginClick,
  onSignUpClick,
}) => {
  const navigate = useNavigate();

  const handleLoginClick = () => {
    navigate('/login');
  };

  const handleDashboardClick = () => {
    navigate('/consolidated-calendar-with-dashboard');
  };

  return (
    <main>
      <Navigation 
        onLoginClick={handleLoginClick} 
        onSignUpClick={onSignUpClick}
        onDashboardClick={handleDashboardClick}
      />
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
      <CTASection onGetStartedClick={onSignUpClick} />
      <Footer />
    </main>
  );
};
