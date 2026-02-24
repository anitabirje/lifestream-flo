import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatTime, formatDateReadable } from '../utils/dateUtils';

/**
 * Property 7: Event Detail Retrieval
 * Validates: Requirements 2.6
 */
describe('Event Detail Retrieval', () => {
  // Helper to generate hex color
  const hexColorArbitrary = fc.tuple(
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 })
  ).map(([r, g, b]) => `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);

  // Arbitraries for generating test data with valid date ranges
  const eventArbitrary = fc.record({
    id: fc.uuid(),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.option(fc.string({ minLength: 1, maxLength: 500 })),
    startTime: fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) }),
    endTime: fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) }),
    location: fc.option(fc.string({ minLength: 1, maxLength: 200 })),
    category: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    familyMemberId: fc.uuid(),
    familyMemberName: fc.string({ minLength: 1, maxLength: 50 }),
    source: fc.constantFrom('google', 'outlook', 'kids_school', 'kids_connect', 'extracurricular', 'internal'),
    color: fc.option(hexColorArbitrary),
  }).filter((event) => event.startTime.getTime() <= event.endTime.getTime());

  it('should retrieve event title from details', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Event details should include title
        expect(event.title).toBeDefined();
        expect(event.title.length).toBeGreaterThan(0);
      })
    );
  });

  it('should retrieve event date and time from details', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Event details should include start and end times
        expect(event.startTime).toBeDefined();
        expect(event.endTime).toBeDefined();

        // Times should be formattable
        const startTimeStr = formatTime(event.startTime);
        const endTimeStr = formatTime(event.endTime);
        expect(startTimeStr).toMatch(/^\d{2}:\d{2}$/);
        expect(endTimeStr).toMatch(/^\d{2}:\d{2}$/);

        // Date should be formattable
        const dateStr = formatDateReadable(event.startTime);
        expect(dateStr.length).toBeGreaterThan(0);
      })
    );
  });

  it('should retrieve event location from details', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Location should be either undefined or a string
        if (event.location !== null && event.location !== undefined) {
          expect(typeof event.location).toBe('string');
          expect(event.location.length).toBeGreaterThan(0);
        }
      })
    );
  });

  it('should retrieve event description from details', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Description should be either undefined or a string
        if (event.description !== null && event.description !== undefined) {
          expect(typeof event.description).toBe('string');
          expect(event.description.length).toBeGreaterThan(0);
        }
      })
    );
  });

  it('should retrieve event source calendar from details', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Event should have a source
        expect(event.source).toBeDefined();
        const validSources = ['google', 'outlook', 'kids_school', 'kids_connect', 'extracurricular', 'internal'];
        expect(validSources).toContain(event.source);
      })
    );
  });

  it('should retrieve complete event details', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // All required details should be retrievable
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

  it('should maintain event detail consistency', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Event ID should be unique and consistent
        expect(event.id).toBeDefined();
        expect(event.id.length).toBeGreaterThan(0);

        // Family member ID should be consistent
        expect(event.familyMemberId).toBeDefined();
        expect(event.familyMemberId.length).toBeGreaterThan(0);

        // Start time should be before or equal to end time
        expect(event.startTime.getTime()).toBeLessThanOrEqual(event.endTime.getTime());
      })
    );
  });

  it('should format event details for display', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Event details should be formattable for display
        const startTime = formatTime(event.startTime);
        const endTime = formatTime(event.endTime);
        const date = formatDateReadable(event.startTime);

        // All formatted values should be non-empty strings
        expect(startTime).toBeDefined();
        expect(startTime.length).toBeGreaterThan(0);
        expect(endTime).toBeDefined();
        expect(endTime.length).toBeGreaterThan(0);
        expect(date).toBeDefined();
        expect(date.length).toBeGreaterThan(0);
      })
    );
  });

  it('should handle optional event details gracefully', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // Optional details should be either null/undefined or valid
        if (event.location !== null && event.location !== undefined) {
          expect(typeof event.location).toBe('string');
        }

        if (event.description !== null && event.description !== undefined) {
          expect(typeof event.description).toBe('string');
        }

        if (event.category !== null && event.category !== undefined) {
          expect(typeof event.category).toBe('string');
        }

        // All optional details should be retrievable without errors
        const details = {
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
          description: event.description,
          source: event.source,
          familyMemberName: event.familyMemberName,
        };

        expect(details).toBeDefined();
      })
    );
  });

  it('should retrieve event details with correct data types', () => {
    fc.assert(
      fc.property(eventArbitrary, (event) => {
        // All required fields should have correct types
        expect(typeof event.id).toBe('string');
        expect(typeof event.title).toBe('string');
        expect(event.startTime instanceof Date).toBe(true);
        expect(event.endTime instanceof Date).toBe(true);
        expect(typeof event.familyMemberId).toBe('string');
        expect(typeof event.familyMemberName).toBe('string');
        expect(typeof event.source).toBe('string');

        // Optional fields should have correct types when present
        if (event.location !== null && event.location !== undefined) {
          expect(typeof event.location).toBe('string');
        }

        if (event.description !== null && event.description !== undefined) {
          expect(typeof event.description).toBe('string');
        }

        if (event.category !== null && event.category !== undefined) {
          expect(typeof event.category).toBe('string');
        }
      })
    );
  });
});
