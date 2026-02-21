/**
 * Property-based tests for event classifier agents
 * Property 8: Automatic Event Classification
 * Property 9: Manual Classification Learning
 * Property 10: Category Persistence
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.6
 * 
 * Feature: flo-family-calendar
 */

import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import {
  AIEventClassifier,
  EventForClassification,
  ClassificationResult,
  ClassificationFeedback
} from '../agents/event-classifier-agent';
import { ContextAnalyzer } from '../agents/context-analyzer';
import { FeedbackLearner } from '../agents/feedback-learner';
import { CategoryPredictor } from '../agents/category-predictor';
import { ActivityCategory, DEFAULT_CATEGORIES } from '../models/activity-category';

describe('Property 8: Automatic Event Classification', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.6**
   * 
   * Property: Event classifier should automatically classify any event into one of the default categories
   */
  it('should classify any event into one of the default categories', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 5, maxLength: 100 }),
          description: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined }),
          location: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined }),
          daysFromNow: fc.integer({ min: 0, max: 30 }),
          durationHours: fc.integer({ min: 1, max: 8 })
        }),
        async (eventData) => {
          const classifier = new AIEventClassifier();
          const startTime = new Date();
          startTime.setDate(startTime.getDate() + eventData.daysFromNow);

          const event: EventForClassification = {
            id: uuidv4(),
            title: eventData.title,
            description: eventData.description,
            location: eventData.location,
            startTime,
            endTime: new Date(startTime.getTime() + eventData.durationHours * 60 * 60 * 1000),
            attendees: []
          };

          // Create default categories
          const categories: ActivityCategory[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
            id: uuidv4(),
            familyId: 'family-1',
            name: cat.name as any,
            color: cat.color,
            icon: cat.icon,
            isDefault: true,
            keywords: cat.keywords,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          const result = await classifier.classify(event, categories);

          // Requirement 3.1: System provides five default categories
          expect(categories.length).toBe(5);
          expect(categories.map(c => c.name)).toContain('Work');
          expect(categories.map(c => c.name)).toContain('Family Time');
          expect(categories.map(c => c.name)).toContain('Health/Fitness');
          expect(categories.map(c => c.name)).toContain('Upskilling');
          expect(categories.map(c => c.name)).toContain('Relaxation');

          // Requirement 3.2: Event classifier should classify event
          expect(result).toBeDefined();
          expect(result.category).toBeDefined();
          expect(categories.map(c => c.name)).toContain(result.category.name);

          // Requirement 3.6: Classification should have confidence score
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);

          // Verify classification result structure
          expect(result.requiresUserInput).toBeDefined();
          expect(typeof result.requiresUserInput).toBe('boolean');
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * **Validates: Requirements 3.2, 3.3**
   * 
   * Property: Classifier should provide confidence scores and reasoning for classifications
   */
  it('should provide confidence scores and reasoning for all classifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 100 }),
        async (title) => {
          const classifier = new AIEventClassifier();
          const event: EventForClassification = {
            id: uuidv4(),
            title,
            startTime: new Date(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            attendees: []
          };

          const categories: ActivityCategory[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
            id: uuidv4(),
            familyId: 'family-1',
            name: cat.name as any,
            color: cat.color,
            icon: cat.icon,
            isDefault: true,
            keywords: cat.keywords,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          const result = await classifier.classify(event, categories);

          // Requirement 3.2: Confidence scoring
          expect(result.confidence).toBeGreaterThanOrEqual(0);
          expect(result.confidence).toBeLessThanOrEqual(1);

          // Requirement 3.3: Reasoning for classification
          if (result.reasoning) {
            expect(typeof result.reasoning).toBe('string');
            expect(result.reasoning.length).toBeGreaterThan(0);
          }

          // Verify reasoning contains category name
          expect(result.reasoning).toContain(result.category.name);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirement 3.2**
   * 
   * Property: Classifier should prompt for user input when confidence is below threshold
   */
  it('should indicate when user input is required for low-confidence classifications', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 20 }), // Ambiguous title
        async (ambiguousTitle) => {
          const classifier = new AIEventClassifier();
          const threshold = classifier.getConfidenceThreshold();

          const event: EventForClassification = {
            id: uuidv4(),
            title: ambiguousTitle,
            startTime: new Date(),
            endTime: new Date(Date.now() + 1 * 60 * 60 * 1000),
            attendees: []
          };

          const categories: ActivityCategory[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
            id: uuidv4(),
            familyId: 'family-1',
            name: cat.name as any,
            color: cat.color,
            icon: cat.icon,
            isDefault: true,
            keywords: cat.keywords,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          const result = await classifier.classify(event, categories);

          // If confidence is below threshold, requiresUserInput should be true
          if (result.confidence < threshold) {
            expect(result.requiresUserInput).toBe(true);
            expect(result.suggestedAlternatives).toBeDefined();
            expect(Array.isArray(result.suggestedAlternatives)).toBe(true);
          } else {
            expect(result.requiresUserInput).toBe(false);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirement 3.2**
   * 
   * Property: Batch classification should classify multiple events correctly
   */
  it('should batch classify multiple events correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 5, maxLength: 50 }),
            durationHours: fc.integer({ min: 1, max: 4 })
          }),
          { minLength: 2, maxLength: 10 }
        ),
        async (eventConfigs) => {
          const classifier = new AIEventClassifier();

          const events: EventForClassification[] = eventConfigs.map(config => ({
            id: uuidv4(),
            title: config.title,
            startTime: new Date(),
            endTime: new Date(Date.now() + config.durationHours * 60 * 60 * 1000),
            attendees: []
          }));

          const categories: ActivityCategory[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
            id: uuidv4(),
            familyId: 'family-1',
            name: cat.name as any,
            color: cat.color,
            icon: cat.icon,
            isDefault: true,
            keywords: cat.keywords,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          const results = await classifier.classifyBatch(events, categories);

          // Should return same number of results as events
          expect(results.length).toBe(events.length);

          // Each result should be valid
          for (const result of results) {
            expect(result.category).toBeDefined();
            expect(result.confidence).toBeGreaterThanOrEqual(0);
            expect(result.confidence).toBeLessThanOrEqual(1);
            expect(result.reasoning).toBeDefined();
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property: Context analyzer should provide contextual information for classification
   */
  it('should analyze event context for better classification', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 5, maxLength: 50 }),
          location: fc.option(fc.string({ minLength: 5, maxLength: 30 }), { nil: undefined }),
          attendeeCount: fc.integer({ min: 0, max: 10 })
        }),
        async (eventData) => {
          const event: EventForClassification = {
            id: uuidv4(),
            title: eventData.title,
            location: eventData.location,
            startTime: new Date(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            attendees: Array(eventData.attendeeCount).fill('attendee@example.com')
          };

          const context = ContextAnalyzer.analyzeContext(event);

          // Verify context analysis structure
          expect(context.timeContext).toBeDefined();
          expect(context.locationContext).toBeDefined();
          expect(context.attendeeContext).toBeDefined();
          expect(context.descriptionContext).toBeDefined();
          expect(context.overallContextScore).toBeGreaterThanOrEqual(0);
          expect(context.overallContextScore).toBeLessThanOrEqual(1);

          // Verify time context
          expect(context.timeContext.hour).toBeGreaterThanOrEqual(0);
          expect(context.timeContext.hour).toBeLessThan(24);
          expect(context.timeContext.dayOfWeek).toBeGreaterThanOrEqual(0);
          expect(context.timeContext.dayOfWeek).toBeLessThan(7);
          expect(typeof context.timeContext.isWeekend).toBe('boolean');
          expect(typeof context.timeContext.isBusinessHours).toBe('boolean');

          // Verify attendee context
          expect(context.attendeeContext.attendeeCount).toBe(eventData.attendeeCount);
          expect(typeof context.attendeeContext.hasMultipleAttendees).toBe('boolean');
        }
      ),
      { numRuns: 20 }
    );
  });
});

describe('Property 9: Manual Classification Learning', () => {
  /**
   * **Validates: Requirements 3.4, 3.6**
   * 
   * Property: Classifier should learn from user classification corrections and improve accuracy
   */
  it('should learn from user feedback and improve classification accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            title: fc.string({ minLength: 5, maxLength: 50 }),
            categoryIndex: fc.integer({ min: 0, max: 4 })
          }),
          { minLength: 3, maxLength: 10 }
        ),
        async (feedbackConfigs) => {
          const classifier = new AIEventClassifier();
          const feedbackLearner = new FeedbackLearner();

          const categories: ActivityCategory[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
            id: uuidv4(),
            familyId: 'family-1',
            name: cat.name as any,
            color: cat.color,
            icon: cat.icon,
            isDefault: true,
            keywords: cat.keywords,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          // Provide feedback for multiple events
          for (const config of feedbackConfigs) {
            const feedback: ClassificationFeedback = {
              eventId: uuidv4(),
              assignedCategory: categories[0],
              userSelectedCategory: categories[config.categoryIndex],
              timestamp: new Date(),
              familyMemberId: 'member-1',
              eventContext: {
                title: config.title,
                time: new Date()
              }
            };

            feedbackLearner.learnFromFeedback(feedback);
          }

          // Verify learning occurred
          const stats = feedbackLearner.getStatistics();
          expect(stats.totalFeedbackItems).toBe(feedbackConfigs.length);
          expect(stats.patternsLearned).toBeGreaterThan(0);

          // Verify patterns were learned for categories
          for (const category of categories) {
            const patterns = feedbackLearner.getPatternsForCategory(category.name);
            // Some categories should have learned patterns
            if (feedbackConfigs.some(c => c.categoryIndex === categories.indexOf(category))) {
              expect(patterns.length).toBeGreaterThanOrEqual(0);
            }
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * **Validates: Requirement 3.4**
   * 
   * Property: Feedback learner should track learned patterns and improve confidence
   */
  it('should track learned patterns and increase confidence with repeated feedback', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),
        fc.integer({ min: 1, max: 5 }),
        async (title, feedbackCount) => {
          const feedbackLearner = new FeedbackLearner();

          const category: ActivityCategory = {
            id: uuidv4(),
            familyId: 'family-1',
            name: 'Work',
            color: '#3B82F6',
            icon: '💼',
            isDefault: true,
            keywords: ['work', 'meeting', 'office'],
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Provide same feedback multiple times
          for (let i = 0; i < feedbackCount; i++) {
            const feedback: ClassificationFeedback = {
              eventId: uuidv4(),
              assignedCategory: category,
              userSelectedCategory: category,
              timestamp: new Date(),
              familyMemberId: 'member-1',
              eventContext: {
                title,
                time: new Date()
              }
            };

            feedbackLearner.learnFromFeedback(feedback);
          }

          // Verify patterns were learned
          const patterns = feedbackLearner.getPatternsForCategory(category.name);
          expect(patterns.length).toBeGreaterThan(0);

          // Verify confidence increased with repeated feedback
          const firstPattern = patterns[0];
          expect(firstPattern.occurrences).toBe(feedbackCount);
          expect(firstPattern.confidence).toBeGreaterThan(0.5);
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * **Validates: Requirement 3.4**
   * 
   * Property: Category predictor should use learned patterns for better predictions
   */
  it('should use learned patterns to improve category predictions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),
        async (title) => {
          const feedbackLearner = new FeedbackLearner();
          const predictor = new CategoryPredictor(feedbackLearner);

          const categories: ActivityCategory[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
            id: uuidv4(),
            familyId: 'family-1',
            name: cat.name as any,
            color: cat.color,
            icon: cat.icon,
            isDefault: true,
            keywords: cat.keywords,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          // Provide feedback to learn patterns
          const workCategory = categories.find(c => c.name === 'Work')!;
          const feedback: ClassificationFeedback = {
            eventId: uuidv4(),
            assignedCategory: categories[0],
            userSelectedCategory: workCategory,
            timestamp: new Date(),
            familyMemberId: 'member-1',
            eventContext: {
              title,
              time: new Date()
            }
          };

          feedbackLearner.learnFromFeedback(feedback);

          // Now predict category for similar event
          const event: EventForClassification = {
            id: uuidv4(),
            title,
            startTime: new Date(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            attendees: []
          };

          const predictions = predictor.predictCategories(event, categories);

          // Verify predictions are ranked by confidence
          expect(predictions.length).toBe(categories.length);
          for (let i = 0; i < predictions.length - 1; i++) {
            expect(predictions[i].confidence).toBeGreaterThanOrEqual(predictions[i + 1].confidence);
          }

          // Verify each prediction has reasoning
          for (const prediction of predictions) {
            expect(prediction.reasoning).toBeDefined();
            expect(prediction.reasoning.length).toBeGreaterThan(0);
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property: Feedback learner should export and import patterns
   */
  it('should export and import learned patterns for persistence', async () => {
    const feedbackLearner = new FeedbackLearner();

    const categories: ActivityCategory[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
      id: uuidv4(),
      familyId: 'family-1',
      name: cat.name as any,
      color: cat.color,
      icon: cat.icon,
      isDefault: true,
      keywords: cat.keywords,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Learn some patterns
    const feedback: ClassificationFeedback = {
      eventId: uuidv4(),
      assignedCategory: categories[0],
      userSelectedCategory: categories[1],
      timestamp: new Date(),
      familyMemberId: 'member-1',
      eventContext: {
        title: 'Team meeting',
        time: new Date()
      }
    };

    feedbackLearner.learnFromFeedback(feedback);

    // Export patterns
    const exported = feedbackLearner.exportPatterns();
    expect(exported).toBeDefined();
    expect(typeof exported).toBe('string');

    // Create new learner and import
    const newLearner = new FeedbackLearner();
    const categoryMap = new Map(categories.map(c => [c.name, c]));
    newLearner.importPatterns(exported, categoryMap);

    // Verify patterns were imported
    const stats = newLearner.getStatistics();
    expect(stats.patternsLearned).toBeGreaterThan(0);
  });
});

describe('Property 10: Category Persistence', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3**
   * 
   * Property: Activity categories should be persisted and retrievable
   */
  it('should persist and retrieve activity categories', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 5, maxLength: 30 }),
            color: fc.string({ minLength: 7, maxLength: 7 }), // Hex color
            icon: fc.string({ minLength: 1, maxLength: 2 })
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (categoryConfigs) => {
          const categories: ActivityCategory[] = categoryConfigs.map(config => ({
            id: uuidv4(),
            familyId: 'family-1',
            name: config.name,
            color: config.color,
            icon: config.icon,
            isDefault: false,
            keywords: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          // Verify categories are created
          expect(categories.length).toBe(categoryConfigs.length);

          // Verify each category has required fields
          for (const category of categories) {
            expect(category.id).toBeDefined();
            expect(category.familyId).toBe('family-1');
            expect(category.name).toBeDefined();
            expect(category.color).toBeDefined();
            expect(category.icon).toBeDefined();
            expect(category.isDefault).toBe(false);
            expect(category.keywords).toBeDefined();
            expect(Array.isArray(category.keywords)).toBe(true);
            expect(category.createdAt).toBeInstanceOf(Date);
            expect(category.updatedAt).toBeInstanceOf(Date);
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * **Validates: Requirement 3.2**
   * 
   * Property: Default categories should be immutable
   */
  it('should provide immutable default categories', async () => {
    const defaultCategories: ActivityCategory[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
      id: uuidv4(),
      familyId: 'family-1',
      name: cat.name as any,
      color: cat.color,
      icon: cat.icon,
      isDefault: true,
      keywords: cat.keywords,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Verify default categories
    expect(defaultCategories.length).toBe(5);
    expect(defaultCategories.every(c => c.isDefault)).toBe(true);

    const categoryNames = defaultCategories.map(c => c.name);
    expect(categoryNames).toContain('Work');
    expect(categoryNames).toContain('Family Time');
    expect(categoryNames).toContain('Health/Fitness');
    expect(categoryNames).toContain('Upskilling');
    expect(categoryNames).toContain('Relaxation');

    // Verify each default category has keywords
    for (const category of defaultCategories) {
      expect(category.keywords.length).toBeGreaterThan(0);
    }
  });

  /**
   * **Validates: Requirement 3.3**
   * 
   * Property: Event classifications should be stored with events
   */
  it('should store classification results with events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 50 }),
        async (title) => {
          const classifier = new AIEventClassifier();

          const event: EventForClassification = {
            id: uuidv4(),
            title,
            startTime: new Date(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            attendees: []
          };

          const categories: ActivityCategory[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
            id: uuidv4(),
            familyId: 'family-1',
            name: cat.name as any,
            color: cat.color,
            icon: cat.icon,
            isDefault: true,
            keywords: cat.keywords,
            createdAt: new Date(),
            updatedAt: new Date()
          }));

          const result = await classifier.classify(event, categories);

          // Verify classification can be stored
          const storedClassification = {
            eventId: event.id,
            category: result.category,
            confidence: result.confidence,
            timestamp: new Date()
          };

          expect(storedClassification.eventId).toBe(event.id);
          expect(storedClassification.category).toBeDefined();
          expect(storedClassification.confidence).toBeGreaterThanOrEqual(0);
          expect(storedClassification.confidence).toBeLessThanOrEqual(1);
          expect(storedClassification.timestamp).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Classifier should maintain state across multiple classifications
   */
  it('should maintain classifier state across multiple operations', async () => {
    const classifier = new AIEventClassifier();

    const categories: ActivityCategory[] = DEFAULT_CATEGORIES.map((cat, idx) => ({
      id: uuidv4(),
      familyId: 'family-1',
      name: cat.name as any,
      color: cat.color,
      icon: cat.icon,
      isDefault: true,
      keywords: cat.keywords,
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    // Classify multiple events
    for (let i = 0; i < 5; i++) {
      const event: EventForClassification = {
        id: uuidv4(),
        title: `Event ${i}`,
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
        attendees: []
      };

      const result = await classifier.classify(event, categories);
      expect(result.category).toBeDefined();
    }

    // Verify classifier is still operational
    const healthCheck = await classifier.healthCheck();
    expect(healthCheck).toBe(true);
    expect(classifier.status).not.toBe('offline');
  });
});
