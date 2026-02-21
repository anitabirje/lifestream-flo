import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  getCurrentWeekRange,
  getNextWeekRange,
  getPreviousWeekRange,
  getWeekRangeForDate,
  getDaysInWeek,
  getWeekNumber,
} from '../utils/dateUtils';

/**
 * Property 5: Weekly Calendar Navigation
 * Validates: Requirements 2.1, 2.2, 2.3
 */
describe('Weekly Calendar Navigation', () => {
  it('should display current week by default', () => {
    const weekRange = getCurrentWeekRange();
    const today = new Date();

    // Current week should contain today
    expect(today.getTime()).toBeGreaterThanOrEqual(weekRange.start.getTime());
    expect(today.getTime()).toBeLessThanOrEqual(weekRange.end.getTime());
  });

  it('should display 7-day week (Monday-Sunday) in grid format', () => {
    const weekRange = getCurrentWeekRange();
    const days = getDaysInWeek(weekRange);

    // Should have exactly 7 days
    expect(days).toHaveLength(7);

    // First day should be Monday (day 1)
    expect(days[0].getDay()).toBe(1);

    // Last day should be Sunday (day 0)
    expect(days[6].getDay()).toBe(0);

    // Days should be consecutive
    for (let i = 1; i < days.length; i++) {
      const dayDiff = (days[i].getTime() - days[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      expect(dayDiff).toBe(1);
    }
  });

  it('should navigate to next week correctly', () => {
    const currentWeek = getCurrentWeekRange();
    const nextWeek = getNextWeekRange(currentWeek);

    // Next week should start 7 days after current week
    const daysDiff = (nextWeek.start.getTime() - currentWeek.start.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBe(7);

    // Next week should have same structure
    const nextWeekDays = getDaysInWeek(nextWeek);
    expect(nextWeekDays).toHaveLength(7);
    expect(nextWeekDays[0].getDay()).toBe(1);
    expect(nextWeekDays[6].getDay()).toBe(0);
  });

  it('should navigate to previous week correctly', () => {
    const currentWeek = getCurrentWeekRange();
    const prevWeek = getPreviousWeekRange(currentWeek);

    // Previous week should start 7 days before current week
    const daysDiff = (currentWeek.start.getTime() - prevWeek.start.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBe(7);

    // Previous week should have same structure
    const prevWeekDays = getDaysInWeek(prevWeek);
    expect(prevWeekDays).toHaveLength(7);
    expect(prevWeekDays[0].getDay()).toBe(1);
    expect(prevWeekDays[6].getDay()).toBe(0);
  });

  it('should maintain week structure when navigating forward and backward', () => {
    const currentWeek = getCurrentWeekRange();
    const nextWeek = getNextWeekRange(currentWeek);
    const backToCurrent = getPreviousWeekRange(nextWeek);

    // Should return to same week
    expect(backToCurrent.start.getTime()).toBe(currentWeek.start.getTime());
    expect(backToCurrent.end.getTime()).toBe(currentWeek.end.getTime());
  });

  it('should correctly calculate week numbers', () => {
    fc.assert(
      fc.property(fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) }), (date) => {
        const weekNumber = getWeekNumber(date);

        // Week number should be between 1 and 53
        expect(weekNumber).toBeGreaterThanOrEqual(1);
        expect(weekNumber).toBeLessThanOrEqual(53);
      })
    );
  });

  it('should handle week range for any date correctly', () => {
    fc.assert(
      fc.property(fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) }), (date) => {
        const weekRange = getWeekRangeForDate(date);

        // Date should be within the week range
        expect(date.getTime()).toBeGreaterThanOrEqual(weekRange.start.getTime());
        expect(date.getTime()).toBeLessThanOrEqual(weekRange.end.getTime());

        // Week should have 7 days
        const days = getDaysInWeek(weekRange);
        expect(days).toHaveLength(7);

        // First day should be Monday
        expect(days[0].getDay()).toBe(1);

        // Last day should be Sunday
        expect(days[6].getDay()).toBe(0);
      })
    );
  });

  it('should maintain consistency when navigating multiple weeks', () => {
    fc.assert(
      fc.property(fc.integer({ min: -52, max: 52 }), (weeksOffset) => {
        let weekRange = getCurrentWeekRange();

        // Navigate forward or backward
        if (weeksOffset > 0) {
          for (let i = 0; i < weeksOffset; i++) {
            weekRange = getNextWeekRange(weekRange);
          }
        } else {
          for (let i = 0; i < Math.abs(weeksOffset); i++) {
            weekRange = getPreviousWeekRange(weekRange);
          }
        }

        // Week should always have 7 days
        const days = getDaysInWeek(weekRange);
        expect(days).toHaveLength(7);

        // First day should always be Monday
        expect(days[0].getDay()).toBe(1);

        // Last day should always be Sunday
        expect(days[6].getDay()).toBe(0);

        // All days should be consecutive
        for (let i = 1; i < days.length; i++) {
          const dayDiff = (days[i].getTime() - days[i - 1].getTime()) / (1000 * 60 * 60 * 24);
          expect(dayDiff).toBe(1);
        }
      })
    );
  });
});
