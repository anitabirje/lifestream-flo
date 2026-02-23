import React, { useState } from 'react';
import './Navigation.css';

interface NavigationProps {
  onLoginClick?: () => void;
  onSignUpClick?: () => void;
  onDashboardClick?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  onLoginClick,
  onSignUpClick,
  onDashboardClick,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="navigation">
      <nav className="nav-container">
        <div className="nav-logo">
          <span className="gradient-text">Flo</span>
        </div>

        <button
          className="hamburger"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={mobileMenuOpen}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <div className={`nav-menu ${mobileMenuOpen ? 'open' : ''}`}>
          <button
            className="nav-link"
            onClick={() => handleNavClick('features')}
          >
            Features
          </button>
          <button
            className="nav-link"
            onClick={() => handleNavClick('how-it-works')}
          >
            How It Works
          </button>
          <button
            className="nav-link"
            onClick={() => handleNavClick('testimonials')}
          >
            Testimonials
          </button>
          <button
            className="nav-link"
            onClick={onDashboardClick}
          >
            Dashboard
          </button>
        </div>

        <div className="nav-auth">
          <button
            className="btn btn-ghost"
            onClick={onLoginClick}
            aria-label="Login"
          >
            Login
          </button>
          <button
            className="btn btn-primary"
            onClick={onSignUpClick}
            aria-label="Sign Up"
          >
            Sign Up
          </button>
        </div>
      </nav>
    </header>
  );
};
