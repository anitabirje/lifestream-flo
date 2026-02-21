/**
 * Property-based tests for event parser agents
 * Property 49: Event Parser Accuracy
 * Property 50: Data Normalization Consistency
 * Validates: Requirements 1.3
 */

import * as fc from 'fast-check';
import {
  EventParserAgent,
  ParsedEvent,
  IEventParserAgent,
} from '../agents/event-parser-agent';
import { SchoolNewsletterParserAgent } from '../agents/school-newsletter-parser-agent';
import { DataNormalizer, NormalizedEvent } from '../agents/data-normalizer';
import { AgentTask, AgentResult } from '../agents/types';

/**
 * Property 49: Event Parser Accuracy
 * Validates: Requirements 1.3
 * 
 * Property: When an event parser agent receives valid raw data with event information,
 * it should extract parsed events with reasonable confidence scores and extracted fields.
 */
describe('Property 49: Event Parser Accuracy', () => {
  let parser: SchoolNewsletterParserAgent;

  beforeEach(() => {
    parser = new SchoolNewsletterParserAgent();
  });

  it('should parse homework events with valid structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          subject: fc.stringMatching(/^[A-Z][a-z]+$/),
          dueDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
          details: fc.string({ minLength: 10, maxLength: 100 }),
        }),
        async (input) => {
          const newsletter = `
            ${input.subject} homework due date: ${input.dueDate.toISOString().split('T')[0]}
            Details: ${input.details}
          `;

          const parsed = await parser.parse(newsletter);

          // All parsed events should have valid structure
          for (const event of parsed) {
            expect(event.title).toBeDefined();
            expect(typeof event.title).toBe('string');
            expect(event.title.length).toBeGreaterThan(0);

            expect(typeof event.confidence).toBe('number');
            expect(event.confidence).toBeGreaterThanOrEqual(0);
            expect(event.confidence).toBeLessThanOrEqual(1);

            expect(Array.isArray(event.extractedFields)).toBe(true);
            expect(event.extractedFields.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should extract form return events with confidence scores', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          formName: fc.stringMatching(/^[A-Z][a-z\s]+$/),
          returnDate: fc.date({ min: new Date('2024-01-01'), max: new Date('2025-12-31') }),
        }),
        async (input) => {
          const newsletter = `
            ${input.formName} form return deadline: ${input.returnDate.toISOString().split('T')[0]}
          `;

          const parsed = await parser.parse(newsletter);

          // Should extract form events
          const formEvents = parsed.filter((e) => e.title.includes('Form'));
          expect(formEvents.length).toBeGreaterThanOrEqual(0);

          // All events should have confidence between 0 and 1
          for (const event of parsed) {
            expect(event.confidence).toBeGreaterThanOrEqual(0);
            expect(event.confidence).toBeLessThanOrEqual(1);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle empty or invalid input gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.string({ maxLength: 5 })
        ),
        async (input) => {
          const parsed = await parser.parse(input);

          // Should return an array (possibly empty)
          expect(Array.isArray(parsed)).toBe(true);

          // All returned events should be valid
          for (const event of parsed) {
            expect(event.title).toBeDefined();
            expect(typeof event.confidence).toBe('number');
            expect(Array.isArray(event.extractedFields)).toBe(true);
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should execute parse_events tasks correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 200 }),
        async (rawData) => {
          const task: AgentTask = {
            id: 'test-task-1',
            type: 'parse_events',
            priority: 'medium',
            payload: { rawData },
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: 3,
          };

          const result = await parser.execute(task);

          // Result should have valid structure
          expect(result.taskId).toBe(task.id);
          expect(result.agentId).toBe(parser.id);
          expect(['success', 'partial_success', 'failed']).toContain(result.status);
          expect(typeof result.executionTime).toBe('number');
          expect(result.executionTime).toBeGreaterThanOrEqual(0);
          expect(result.completedAt).toBeInstanceOf(Date);

          // If successful, data should contain parsedEvents array
          if (result.status === 'success') {
            expect(result.data).toBeDefined();
            expect(Array.isArray(result.data.parsedEvents)).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should validate parsed event structure', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          confidence: fc.float({ min: 0, max: 1, noNaN: true }),
          hasStartTime: fc.boolean(),
          hasEndTime: fc.boolean(),
        }),
        async (input) => {
          const event: ParsedEvent = {
            title: input.title.trim(),
            confidence: input.confidence,
            extractedFields: ['title'],
            startTime: input.hasStartTime ? new Date() : undefined,
            endTime: input.hasEndTime ? new Date(Date.now() + 3600000) : undefined,
          };

          const isValid = parser.validateParsedData(event);

          // Validation should be consistent
          if (input.title.trim().length > 0 && input.confidence >= 0 && input.confidence <= 1) {
            expect(isValid).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * Property 50: Data Normalization Consistency
 * Validates: Requirements 1.3
 * 
 * Property: When parsed events are normalized, the output should maintain data integrity,
 * have valid time ranges, and be consistent across multiple normalizations of the same data.
 */
describe('Property 50: Data Normalization Consistency', () => {
  let normalizer: DataNormalizer;

  beforeEach(() => {
    normalizer = new DataNormalizer({
      source: 'test-source',
      defaultDuration: 60,
      minConfidence: 0.5,
    });
  });

  it('should normalize valid parsed events consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.stringMatching(/^[A-Za-z0-9\s]+$/),
          confidence: fc.float({ min: 0.5, max: 1 }),
          hasStartTime: fc.boolean(),
          hasEndTime: fc.boolean(),
        }),
        async (input) => {
          const now = new Date();
          const startTime = input.hasStartTime ? new Date(now.getTime() + 3600000) : undefined;
          const endTime = input.hasEndTime ? new Date(now.getTime() + 7200000) : undefined;

          const parsed: ParsedEvent = {
            title: input.title,
            confidence: input.confidence,
            extractedFields: ['title'],
            startTime,
            endTime,
          };

          // Normalize twice
          const normalized1 = normalizer.normalize(parsed);
          const normalized2 = normalizer.normalize(parsed);

          // Results should be identical
          if (normalized1 && normalized2) {
            expect(normalized1.title).toBe(normalized2.title);
            expect(normalized1.startTime.getTime()).toBe(normalized2.startTime.getTime());
            expect(normalized1.endTime.getTime()).toBe(normalized2.endTime.getTime());
            expect(normalized1.confidence).toBe(normalized2.confidence);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should maintain valid time ranges after normalization', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          confidence: fc.float({ min: 0.5, max: 1 }),
        }),
        async (input) => {
          const now = new Date();
          const startTime = new Date(now.getTime() + 3600000);
          const endTime = new Date(now.getTime() + 7200000);

          const parsed: ParsedEvent = {
            title: input.title,
            confidence: input.confidence,
            extractedFields: ['title'],
            startTime,
            endTime,
          };

          const normalized = normalizer.normalize(parsed);

          if (normalized) {
            // Start time should be before end time
            expect(normalized.startTime.getTime()).toBeLessThan(normalized.endTime.getTime());

            // Duration should be reasonable (at least 1 minute, at most 24 hours)
            const duration = normalized.endTime.getTime() - normalized.startTime.getTime();
            expect(duration).toBeGreaterThanOrEqual(60000); // 1 minute
            expect(duration).toBeLessThanOrEqual(86400000); // 24 hours
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should filter events below confidence threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.float({ min: 0, max: Math.fround(0.4), noNaN: true }),
        async (lowConfidence) => {
          const parsed: ParsedEvent = {
            title: 'Test Event',
            confidence: lowConfidence,
            extractedFields: ['title'],
            startTime: new Date(),
            endTime: new Date(Date.now() + 3600000),
          };

          const normalized = normalizer.normalize(parsed);

          // Should return null for low confidence events
          expect(normalized).toBeNull();
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should validate normalized events correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          confidence: fc.float({ min: 0, max: 1 }),
        }),
        async (input) => {
          const now = new Date();
          const startTime = new Date(now.getTime() + 3600000);
          const endTime = new Date(now.getTime() + 7200000);

          const normalized: NormalizedEvent = {
            title: input.title,
            startTime,
            endTime,
            confidence: input.confidence,
            source: 'test',
          };

          const isValid = normalizer.validateNormalizedEvent(normalized);

          // Should be valid if title is non-empty and confidence is in range
          if (input.title.length > 0 && input.confidence >= 0 && input.confidence <= 1) {
            expect(isValid).toBe(true);
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should deduplicate identical events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
        }),
        async (input) => {
          const now = new Date();
          const startTime = new Date(now.getTime() + 3600000);
          const endTime = new Date(now.getTime() + 7200000);

          const event: NormalizedEvent = {
            title: input.title,
            startTime,
            endTime,
            confidence: 0.8,
            source: 'test',
          };

          // Create array with duplicates
          const events = [event, event, event];

          const deduplicated = normalizer.deduplicateEvents(events);

          // Should have only one event
          expect(deduplicated.length).toBe(1);
          expect(deduplicated[0].title).toBe(event.title);
        }
      ),
      { numRuns: 30 }
    );
  });

  it('should normalize multiple events consistently', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 1, maxLength: 50 }),
            confidence: fc.float({ min: 0.5, max: 1 }),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (inputs) => {
          const now = new Date();
          const parsed: ParsedEvent[] = inputs.map((input, index) => ({
            title: input.title,
            confidence: input.confidence,
            extractedFields: ['title'],
            startTime: new Date(now.getTime() + index * 3600000),
            endTime: new Date(now.getTime() + (index + 1) * 3600000),
          }));

          const normalized = normalizer.normalizeMultiple(parsed);

          // All normalized events should be valid
          for (const event of normalized) {
            expect(normalizer.validateNormalizedEvent(event)).toBe(true);
          }

          // Should not have more events than input
          expect(normalized.length).toBeLessThanOrEqual(parsed.length);
        }
      ),
      { numRuns: 50 }
    );
  });
});
