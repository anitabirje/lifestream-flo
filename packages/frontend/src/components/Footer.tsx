import React from 'react';
import './Footer.css';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-logo">
            <span className="gradient-text">Flo</span>
          </div>
          <p className="footer-copyright">
            © {currentYear} Flo Family Calendar. All rights reserved.
          </p>
        </div>

        <div className="footer-aws">
          <p className="footer-aws-text">Powered by</p>
          <div className="aws-badge">
            <span>AWS</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
