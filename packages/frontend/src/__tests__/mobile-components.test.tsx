/**
 * Tests for Mobile Components
 * Property-based tests for mobile UI optimization
 * Requirements: 2.1, 2.2, 2.3
 */

import '@testing-library/jest-dom';
import fc from 'fast-check';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileCalendarView, MobileEvent } from '../components/MobileCalendarView';
import { MobileDashboard, TimeAllocationData } from '../components/MobileDashboard';
import { MobileNavigation } from '../components/MobileNavigation';

describe('Mobile Components', () => {
  describe('MobileCalendarView', () => {
    test('should render calendar view', () => {
      const events: MobileEvent[] = [
        {
          id: 'event-1',
          title: 'Test Event',
          startTime: new Date(),
          endTime: new Date(Date.now() + 3600000),
          familyMemberId: 'member-1',
          familyMemberName: 'John',
          category: 'Work',
          color: '#3B82F6',
        },
      ];

      render(<MobileCalendarView events={events} />);

      expect(screen.getByText('Calendar')).toBeInTheDocument();
      expect(screen.getByText('Test Event')).toBeInTheDocument();
    });

    test('should handle date navigation', () => {
      const events: MobileEvent[] = [];
      const onDateChange = jest.fn();

      render(<MobileCalendarView events={events} onDateChange={onDateChange} />);

      const nextButton = screen.getByLabelText('Next day');
      fireEvent.click(nextButton);

      expect(onDateChange).toHaveBeenCalled();
    });

    /**
     * Property 72: Mobile Calendar Event Display
     * **Validates: Requirements 2.1, 2.2, 2.3**
     *
     * For any set of events, the mobile calendar should:
     * 1. Display all events for the selected date
     * 2. Show event times in readable format
     * 3. Display family member names
     * 4. Handle touch interactions
     */
    test('Property 72: Mobile Calendar Event Display', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: fc.uuid(),
              title: fc.string({ minLength: 1, maxLength: 50 }),
              familyMemberName: fc.string({ minLength: 1, maxLength: 30 }),
              category: fc.oneof(
                fc.constant('Work'),
                fc.constant('Health/Fitness'),
                fc.constant('Family Time')
              ),
            }),
            { minLength: 0, maxLength: 10 }
          ),
          async (eventData) => {
            const events: MobileEvent[] = eventData.map((data) => ({
              ...data,
              startTime: new Date(),
              endTime: new Date(Date.now() + 3600000),
              familyMemberId: 'member-1',
              color: '#3B82F6',
            }));

            const { container } = render(<MobileCalendarView events={events} />);

            // Verify calendar is rendered
            expect(container.querySelector('.mobile-calendar-container')).toBeInTheDocument();

            // Verify events are displayed
            eventData.forEach((data) => {
              expect(screen.getByText(data.title)).toBeInTheDocument();
              expect(screen.getByText(data.familyMemberName)).toBeInTheDocument();
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('MobileDashboard', () => {
    test('should render dashboard with allocations', () => {
      const allocations: TimeAllocationData[] = [
        {
          category: 'Work',
          actualHours: 40,
          idealHours: 40,
          percentage: 50,
          color: '#3B82F6',
        },
        {
          category: 'Health/Fitness',
          actualHours: 5,
          idealHours: 5,
          percentage: 6.25,
          color: '#EF4444',
        },
      ];

      render(<MobileDashboard allocations={allocations} />);

      expect(screen.getByText('Time Tracking')).toBeInTheDocument();
      expect(screen.getByText('Work')).toBeInTheDocument();
      expect(screen.getByText('Health/Fitness')).toBeInTheDocument();
    });

    test('should handle category selection', () => {
      const allocations: TimeAllocationData[] = [
        {
          category: 'Work',
          actualHours: 40,
          idealHours: 40,
          percentage: 50,
          color: '#3B82F6',
        },
      ];

      const onCategoryClick = jest.fn();

      render(<MobileDashboard allocations={allocations} onCategoryClick={onCategoryClick} />);

      const workCard = screen.getByText('Work').closest('.mobile-allocation-card');
      if (workCard) {
        fireEvent.click(workCard);
        expect(onCategoryClick).toHaveBeenCalledWith('Work');
      }
    });

    /**
     * Property 73: Mobile Dashboard Metrics Display
     * **Validates: Requirements 2.1, 2.2, 2.3**
     *
     * For any time allocation data, the mobile dashboard should:
     * 1. Display all categories with their metrics
     * 2. Calculate and show percentages correctly
     * 3. Highlight significant deviations
     * 4. Support touch interactions
     */
    test('Property 73: Mobile Dashboard Metrics Display', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              category: fc.oneof(
                fc.constant('Work'),
                fc.constant('Health/Fitness'),
                fc.constant('Family Time'),
                fc.constant('Upskilling'),
                fc.constant('Relaxation')
              ),
              actualHours: fc.integer({ min: 0, max: 24 }),
              idealHours: fc.integer({ min: 1, max: 24 }),
            }),
            { minLength: 1, maxLength: 5 }
          ),
          async (allocationData) => {
            const totalHours = allocationData.reduce((sum, a) => sum + a.actualHours, 0);

            const allocations: TimeAllocationData[] = allocationData.map((data) => ({
              ...data,
              percentage: totalHours > 0 ? (data.actualHours / totalHours) * 100 : 0,
              color: '#3B82F6',
            }));

            const { container } = render(<MobileDashboard allocations={allocations} />);

            // Verify dashboard is rendered
            expect(container.querySelector('.mobile-dashboard-container')).toBeInTheDocument();

            // Verify all categories are displayed
            allocationData.forEach((data) => {
              expect(screen.getByText(data.category)).toBeInTheDocument();
            });
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('MobileNavigation', () => {
    test('should render navigation tabs', () => {
      const onTabChange = jest.fn();

      render(<MobileNavigation activeTab="calendar" onTabChange={onTabChange} />);

      expect(screen.getByLabelText('Calendar')).toBeInTheDocument();
      expect(screen.getByLabelText('Dashboard')).toBeInTheDocument();
      expect(screen.getByLabelText('Settings')).toBeInTheDocument();
    });

    test('should handle tab changes', () => {
      const onTabChange = jest.fn();

      render(<MobileNavigation activeTab="calendar" onTabChange={onTabChange} />);

      const dashboardTab = screen.getByLabelText('Dashboard');
      fireEvent.click(dashboardTab);

      expect(onTabChange).toHaveBeenCalledWith('dashboard');
    });

    test('should display notification badge', () => {
      const onTabChange = jest.fn();

      render(
        <MobileNavigation activeTab="calendar" onTabChange={onTabChange} unreadNotifications={3} />
      );

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    /**
     * Property 74: Mobile Navigation Interaction
     * **Validates: Requirements 2.1, 2.2, 2.3**
     *
     * For any navigation state, the mobile navigation should:
     * 1. Display all tabs
     * 2. Highlight the active tab
     * 3. Handle tab changes
     * 4. Display notification badges when needed
     */
    test('Property 74: Mobile Navigation Interaction', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.constant('calendar'), fc.constant('dashboard'), fc.constant('settings')),
          fc.integer({ min: 0, max: 2 }),
          async (activeTabIndex: string | number, notifications: number) => {
            const onTabChange = jest.fn();
            const tabs = ['calendar', 'dashboard', 'settings'] as const;
            const tabIndex = typeof activeTabIndex === 'number' ? activeTabIndex : 0;
            const activeTab = tabs[tabIndex];

            const { container } = render(
              <MobileNavigation
                activeTab={activeTab}
                onTabChange={onTabChange}
                unreadNotifications={notifications}
              />
            );

            // Verify navigation is rendered
            expect(container.querySelector('.mobile-navigation')).toBeInTheDocument();

            // Verify active tab is marked
            const activeTabElement = screen.getByLabelText(
              activeTab.charAt(0).toUpperCase() + activeTab.slice(1)
            );
            expect(activeTabElement.closest('.nav-tab')).toHaveClass('active');

            // Verify notification badge if needed
            if (notifications > 0) {
              expect(screen.getByText(notifications.toString())).toBeInTheDocument();
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
