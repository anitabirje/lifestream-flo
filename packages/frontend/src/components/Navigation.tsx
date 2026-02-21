import React from 'react';
import './Navigation.css';

export interface NavigationProps {
  currentPage: 'calendar' | 'dashboard';
  onNavigate: (page: 'calendar' | 'dashboard') => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate }) => {
  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-brand">
          <h1>Flo</h1>
          <p>Family Calendar</p>
        </div>
        
        <ul className="nav-menu">
          <li>
            <button
              className={`nav-link ${currentPage === 'calendar' ? 'active' : ''}`}
              onClick={() => onNavigate('calendar')}
            >
              📅 Calendar
            </button>
          </li>
          <li>
            <button
              className={`nav-link ${currentPage === 'dashboard' ? 'active' : ''}`}
              onClick={() => onNavigate('dashboard')}
            >
              📊 Dashboard
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};
