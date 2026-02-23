/**
 * Mobile Navigation Component
 * Bottom tab navigation optimized for mobile devices
 * Requirements: 2.1, 2.2, 2.3
 */

import React from 'react';
import './MobileNavigation.css';

export interface MobileNavigationProps {
  activeTab: 'calendar' | 'dashboard' | 'settings';
  onTabChange: (tab: 'calendar' | 'dashboard' | 'settings') => void;
  unreadNotifications?: number;
}

/**
 * Mobile Navigation Component
 * Provides bottom tab navigation for mobile devices
 */
export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeTab,
  onTabChange,
  unreadNotifications = 0,
}) => {
  return (
    <nav className="mobile-navigation">
      <button
        className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
        onClick={() => onTabChange('calendar')}
        aria-label="Calendar"
        aria-current={activeTab === 'calendar' ? 'page' : undefined}
      >
        <span className="nav-icon">📅</span>
        <span className="nav-label">Calendar</span>
      </button>

      <button
        className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => onTabChange('dashboard')}
        aria-label="Dashboard"
        aria-current={activeTab === 'dashboard' ? 'page' : undefined}
      >
        <span className="nav-icon">📊</span>
        <span className="nav-label">Dashboard</span>
      </button>

      <button
        className={`nav-tab ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onTabChange('settings')}
        aria-label="Settings"
        aria-current={activeTab === 'settings' ? 'page' : undefined}
      >
        <span className="nav-icon">⚙️</span>
        <span className="nav-label">Settings</span>
        {unreadNotifications > 0 && (
          <span className="notification-badge">{unreadNotifications}</span>
        )}
      </button>
    </nav>
  );
};

export default MobileNavigation;
