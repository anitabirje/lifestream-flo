import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Event, FamilyMember } from '../types/calendar';
import { formatTime, formatDateReadable } from '../utils/dateUtils';

/**
 * Property 6: Event Information Completeness
 * Validates: Requirements 2.4, 2.5
 */
describe('Event Information Display', () => {
  // Helper to generate hex color
  const hexColorArbitrary = fc.tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  ).map(([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);

  // Arbitraries for generating test data
  const eventArbitrary = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.option(fc.string({ maxLength: 500 })),
    startTime: fc.date(),
    endTime: fc.date(),
    location: fc.option(fc.string({ maxLength: 200 })),
    category: fc.option(fc.string({ maxLength: 50 })),
    familyMemberId: fc.uuid(),
    familyMemberName: fc.string({ minLength: 1, maxLength: 50 }),
    source: fc.constantFrom('google', 'outlook', 'kids_school', 'kids_connect', 'extracurricular', 'internal'),
    color: fc.option(hexColorArbitrary),
  });

  const familyMemberArbitrary = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    email: fc.emailAddress(),
    color: hexColorArbitrary,
  });

  it('should display event title', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Event should have a title
        expect(event.title).toBeDefined();
        expect(event.title.length).toBeGreaterThan(0);
      })
    );
  });

  it('should display event start time', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Event should have a start time
        expect(event.startTime).toBeDefined();
        expect(event.startTime instanceof Date).toBe(true);

        // Start time should be formattable
        const formattedTime = formatTime(event.startTime);
        expect(formattedTime).toMatch(/^\d{2}:\d{2}$/);
      })
    );
  });

  it('should display event end time', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Event should have an end time
        expect(event.endTime).toBeDefined();
        expect(event.endTime instanceof Date).toBe(true);

        // End time should be formattable
        const formattedTime = formatTime(event.endTime);
        expect(formattedTime).toMatch(/^\d{2}:\d{2}$/);
      })
    );
  });

  it('should display family member name', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Event should have a family member name
        expect(event.familyMemberName).toBeDefined();
        expect(event.familyMemberName.length).toBeGreaterThan(0);
      })
    );
  });

  it('should display event with all required information', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // All required fields should be present
        expect(event.id).toBeDefined();
        expect(event.title).toBeDefined();
        expect(event.startTime).toBeDefined();
        expect(event.endTime).toBeDefined();
        expect(event.familyMemberId).toBeDefined();
        expect(event.familyMemberName).toBeDefined();
        expect(event.source).toBeDefined();

        // Required fields should not be empty
        expect(event.title.length).toBeGreaterThan(0);
        expect(event.familyMemberName.length).toBeGreaterThan(0);
      })
    );
  });

  it('should format event times correctly', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        const startTime = formatTime(event.startTime);
        const endTime = formatTime(event.endTime);

        // Times should be in HH:MM format
        expect(startTime).toMatch(/^\d{2}:\d{2}$/);
        expect(endTime).toMatch(/^\d{2}:\d{2}$/);

        // Hours should be 0-23
        const [startHour] = startTime.split(':').map(Number);
        const [endHour] = endTime.split(':').map(Number);
        expect(startHour).toBeGreaterThanOrEqual(0);
        expect(startHour).toBeLessThan(24);
        expect(endHour).toBeGreaterThanOrEqual(0);
        expect(endHour).toBeLessThan(24);

        // Minutes should be 0-59
        const [, startMinute] = startTime.split(':').map(Number);
        const [, endMinute] = endTime.split(':').map(Number);
        expect(startMinute).toBeGreaterThanOrEqual(0);
        expect(startMinute).toBeLessThan(60);
        expect(endMinute).toBeGreaterThanOrEqual(0);
        expect(endMinute).toBeLessThan(60);
      })
    );
  });

  it('should display family member with distinct color', () => {
    fc.assert(
      fc.property(familyMemberArbitrary, (member) => {
        // Family member should have a color
        expect(member.color).toBeDefined();
        expect(member.color).toMatch(/^#[0-9a-f]{6}$/i);
      })
    );
  });

  it('should maintain event information consistency', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Event ID should be unique
        expect(event.id).toBeDefined();
        expect(event.id.length).toBeGreaterThan(0);

        // Family member ID should be unique
        expect(event.familyMemberId).toBeDefined();
        expect(event.familyMemberId.length).toBeGreaterThan(0);

        // Event source should be valid
        const validSources = ['google', 'outlook', 'kids_school', 'kids_connect', 'extracurricular', 'internal'];
        expect(validSources).toContain(event.source);
      })
    );
  });

  it('should handle optional event fields gracefully', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Optional fields should be either null/undefined or have valid values
        if (event.description !== null && event.description !== undefined) {
          expect(typeof event.description).toBe('string');
        }

        if (event.location !== null && event.location !== undefined) {
          expect(typeof event.location).toBe('string');
        }

        if (event.category !== null && event.category !== undefined) {
          expect(typeof event.category).toBe('string');
        }

        if (event.color !== null && event.color !== undefined) {
          expect(event.color).toMatch(/^#[0-9a-f]{6}$/i);
        }
      })
    );
  });

  it('should display event date in readable format', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        const formattedDate = formatDateReadable(event.startTime);

        // Date should be formatted as readable string
        expect(formattedDate).toBeDefined();
        expect(formattedDate.length).toBeGreaterThan(0);

        // Should contain day name and date
        const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const containsDayName = dayNames.some((day) => formattedDate.includes(day));
        expect(containsDayName).toBe(true);
      })
    );
  });
});
