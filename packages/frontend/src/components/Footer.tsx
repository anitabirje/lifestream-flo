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
          <div className="footer-info">
            <p className="footer-copyright">
              © {currentYear} Flo Family Calendar. All rights reserved.
            </p>
            <p className="footer-hackathon">
              Built for the ANZ Diversity Hackathon — Amazon Women in AI/ML 2026
            </p>
          </div>
        </div>

        <div className="footer-aws">
          <p className="footer-aws-text">Powered by Amazon Bedrock · Textract · SNS · EventBridge · Polly · Lambda · Amplify · Cognito</p>
        </div>
      </div>
    </footer>
  );
};
