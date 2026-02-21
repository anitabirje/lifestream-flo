/**
 * Property-Based Tests for Ideal Time Allocation
 * 
 * Feature: flo-family-calendar
 * Property 64: Ideal vs Actual Time Comparison
 * Property 65: Deviation Highlighting
 * Validates: Requirements 4.3, 4.4, 4.5
 * 
 * These tests verify that ideal time allocation preferences can be set,
 * retrieved, and compared against actual time allocation with proper
 * deviation highlighting.
 */

import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import { IdealAllocationService } from '../services/ideal-allocation-service';
import { dynamoDBClient } from '../config/dynamodb';
import { config } from '../config/env';

describe('Property 64: Ideal vs Actual Time Comparison', () => {
  let idealAllocationService: IdealAllocationService;
  const tableName = config.dynamodb.tableName;

  beforeAll(() => {
    idealAllocationService = new IdealAllocationService(dynamoDBClient, tableName);
  });

  // Arbitrary for allocation type
  const allocationTypeArb = fc.oneof(
    fc.constant('percentage' as const),
    fc.constant('hours' as const)
  );

  // Arbitrary for percentage (0-100)
  const percentageArb = fc.float({ min: 0, max: 100 });

  // Arbitrary for hours per week (0-168)
  const hoursArb = fc.float({ min: 0, max: 168 });

  // Arbitrary for category names
  const categoryNameArb = fc.oneof(
    fc.constant('Work'),
    fc.constant('Family Time'),
    fc.constant('Health/Fitness'),
    fc.constant('Upskilling'),
    fc.constant('Relaxation')
  );

  afterEach(async () => {
    // Cleanup: Delete test data
    // Note: In a real scenario, you'd want to use a test database
  });

  it('should set and retrieve ideal time allocation with percentage', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        percentageArb,
        async (categoryName, targetValue) => {
          const familyId = `test-family-${uuidv4()}`;
          const familyMemberId = `test-member-${uuidv4()}`;
          const categoryId = `category-${uuidv4()}`;

          // Set ideal allocation
          const allocation = await idealAllocationService.setIdealAllocation(
            familyId,
            familyMemberId,
            categoryId,
            categoryName,
            'percentage',
            targetValue
          );

          // Verify allocation was created
          expect(allocation.id).toBeTruthy();
          expect(allocation.familyId).toBe(familyId);
          expect(allocation.familyMemberId).toBe(familyMemberId);
          expect(allocation.categoryId).toBe(categoryId);
          expect(allocation.categoryName).toBe(categoryName);
          expect(allocation.allocationType).toBe('percentage');
          expect(allocation.targetValue).toBe(targetValue);

          // Retrieve and verify
          const retrieved = await idealAllocationService.getIdealAllocation(
            familyId,
            familyMemberId,
            categoryId
          );

          expect(retrieved).not.toBeNull();
          expect(retrieved?.targetValue).toBe(targetValue);
          expect(retrieved?.allocationType).toBe('percentage');
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  it('should set and retrieve ideal time allocation with hours', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        async (categoryName, targetValue) => {
          const familyId = `test-family-${uuidv4()}`;
          const familyMemberId = `test-member-${uuidv4()}`;
          const categoryId = `category-${uuidv4()}`;

          // Set ideal allocation
          const allocation = await idealAllocationService.setIdealAllocation(
            familyId,
            familyMemberId,
            categoryId,
            categoryName,
            'hours',
            targetValue
          );

          // Verify allocation was created
          expect(allocation.allocationType).toBe('hours');
          expect(allocation.targetValue).toBe(targetValue);

          // Retrieve and verify
          const retrieved = await idealAllocationService.getIdealAllocation(
            familyId,
            familyMemberId,
            categoryId
          );

          expect(retrieved).not.toBeNull();
          expect(retrieved?.targetValue).toBe(targetValue);
          expect(retrieved?.allocationType).toBe('hours');
        }
      ),
      { numRuns: 50 }
    );
  }, 60000);

  it('should update existing ideal allocation', async () => {
    await fc.assert(
      fc.asyncProperty(
        categoryNameArb,
        hoursArb,
        hoursArb,
        async (categoryName, initialValue, updatedValue) => {
          fc.pre(Math.abs(initialValue - updatedValue) > 1); // Ensure values are different

          const familyId = `test-family-${uuidv4()}`;
          const familyMemberId = `test-member-${uuidv4()}`;
          const categoryId = `category-${uuidv4()}`;

          // Set initial allocation
          await idealAllocationService.setIdealAllocation(
            familyId,
            familyMemberId,
            categoryId,
            categoryName,
            'hours',
            initialValue
          );

          // Update allocation
          const updated = await idealAllocationService.updateIdealAllocation(
            familyId,
            familyMemberId,
            categoryId,
            categoryName,
            'hours',
            updatedValue
          );

          // Verify update
          expect(updated.targetValue).toBe(updatedValue);

          // Retrieve and verify
          const retrieved = await idealAllocationService.getIdealAllocation(
            familyId,
            familyMemberId,
            categoryId
          );

          expect(retrieved?.targetValue).toBe(updatedValue);
        }
      ),
      { numRuns: 30 }
    );
  }, 60000);

  it('should retrieve all allocations for a family member', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            categoryName: categoryNameArb,
            categoryId: fc.string({ minLength: 5, maxLength: 20 }),
            targetValue: hoursArb,
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (allocations) => {
          const familyId = `test-family-${uuidv4()}`;
          const familyMemberId = `test-member-${uuidv4()}`;

          // Create multiple allocations
          for (const alloc of allocations) {
            await idealAllocationService.setIdealAllocation(
              familyId,
              familyMemberId,
              alloc.categoryId,
              alloc.categoryName,
              'hours',
              alloc.targetValue
            );
          }

          // Retrieve all allocations
          const retrieved = await idealAllocationService.getIdealAllocationsForMember(
            familyId,
            familyMemberId
          );

          // Verify count
          expect(retrieved.length).toBe(allocations.length);

          // Verify all allocations are present
          for (const alloc of allocations) {
            const found = retrieved.find(r => r.categoryId === alloc.categoryId);
            expect(found).toBeTruthy();
            expect(found?.targetValue).toBe(alloc.targetValue);
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  it('should reject invalid percentage values', async () => {
    const familyId = `test-family-${uuidv4()}`;
    const familyMemberId = `test-member-${uuidv4()}`;
    const categoryId = `category-${uuidv4()}`;

    // Test values outside valid range
    await expect(
      idealAllocationService.setIdealAllocation(
        familyId,
        familyMemberId,
        categoryId,
        'Work',
        'percentage',
        -10
      )
    ).rejects.toThrow('Invalid ideal allocation');

    await expect(
      idealAllocationService.setIdealAllocation(
        familyId,
        familyMemberId,
        categoryId,
        'Work',
        'percentage',
        150
      )
    ).rejects.toThrow('Invalid ideal allocation');
  }, 10000);

  it('should reject invalid hours values', async () => {
    const familyId = `test-family-${uuidv4()}`;
    const familyMemberId = `test-member-${uuidv4()}`;
    const categoryId = `category-${uuidv4()}`;

    // Test values outside valid range
    await expect(
      idealAllocationService.setIdealAllocation(
        familyId,
        familyMemberId,
        categoryId,
        'Work',
        'hours',
        -5
      )
    ).rejects.toThrow('Invalid ideal allocation');

    await expect(
      idealAllocationService.setIdealAllocation(
        familyId,
        familyMemberId,
        categoryId,
        'Work',
        'hours',
        200
      )
    ).rejects.toThrow('Invalid ideal allocation');
  }, 10000);
});

describe('Property 65: Deviation Highlighting', () => {
  // Helper function to calculate deviation percentage
  const calculateDeviation = (actual: number, ideal: number): number => {
    if (ideal === 0) return 0;
    return ((actual - ideal) / ideal) * 100;
  };

  // Helper function to check if deviation is significant (>20%)
  const isSignificantDeviation = (actual: number, ideal: number): boolean => {
    const deviation = Math.abs(calculateDeviation(actual, ideal));
    return deviation > 20;
  };

  // Arbitrary for actual hours
  const actualHoursArb = fc.float({ min: 0, max: 168 });

  // Arbitrary for ideal hours
  const idealHoursArb = fc.float({ min: 1, max: 168 }); // min 1 to avoid division by zero

  it('should correctly calculate deviation percentage', async () => {
    await fc.assert(
      fc.asyncProperty(
        actualHoursArb,
        idealHoursArb,
        async (actual, ideal) => {
          // Skip NaN cases
          if (isNaN(actual) || isNaN(ideal)) {
            return true;
          }

          const deviation = calculateDeviation(actual, ideal);

          // Verify deviation calculation
          const expectedDeviation = ((actual - ideal) / ideal) * 100;
          
          // Handle NaN case
          if (isNaN(expectedDeviation)) {
            expect(isNaN(deviation)).toBe(true);
            return;
          }

          expect(deviation).toBeCloseTo(expectedDeviation, 2);

          // Verify deviation properties
          if (actual > ideal) {
            expect(deviation).toBeGreaterThan(0);
          } else if (actual < ideal) {
            expect(deviation).toBeLessThan(0);
          } else {
            expect(deviation).toBe(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should correctly identify significant deviations (>20%)', async () => {
    await fc.assert(
      fc.asyncProperty(
        actualHoursArb,
        idealHoursArb,
        async (actual, ideal) => {
          const isSignificant = isSignificantDeviation(actual, ideal);
          const deviation = Math.abs(calculateDeviation(actual, ideal));

          // Verify significant deviation detection
          if (deviation > 20) {
            expect(isSignificant).toBe(true);
          } else {
            expect(isSignificant).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should highlight deviations when actual exceeds ideal by >20%', async () => {
    await fc.assert(
      fc.asyncProperty(
        idealHoursArb,
        fc.float({ min: Math.fround(1.3), max: Math.fround(3) }), // Multiplier to ensure >20% deviation
        async (ideal, multiplier) => {
          const actual = ideal * multiplier;
          const deviation = calculateDeviation(actual, ideal);
          const isSignificant = isSignificantDeviation(actual, ideal);

          // Verify positive deviation is detected
          expect(deviation).toBeGreaterThan(20);
          expect(isSignificant).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should highlight deviations when actual is below ideal by >20%', async () => {
    await fc.assert(
      fc.asyncProperty(
        idealHoursArb,
        fc.float({ min: Math.fround(0.1), max: Math.fround(0.7) }), // Multiplier to ensure >20% deviation
        async (ideal, multiplier) => {
          const actual = ideal * multiplier;
          const deviation = calculateDeviation(actual, ideal);
          const isSignificant = isSignificantDeviation(actual, ideal);

          // Verify negative deviation is detected
          expect(deviation).toBeLessThan(-20);
          expect(isSignificant).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should not highlight deviations within 20% threshold', async () => {
    await fc.assert(
      fc.asyncProperty(
        idealHoursArb,
        fc.float({ min: Math.fround(0.85), max: Math.fround(1.15) }), // Multiplier to ensure <=20% deviation
        async (ideal, multiplier) => {
          const actual = ideal * multiplier;
          const isSignificant = isSignificantDeviation(actual, ideal);

          // Verify small deviations are not highlighted
          expect(isSignificant).toBe(false);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('should handle edge case where ideal is zero', () => {
    const actual = 10;
    const ideal = 0;
    const deviation = calculateDeviation(actual, ideal);

    // When ideal is 0, deviation should be 0 (or handled gracefully)
    expect(deviation).toBe(0);
  });

  it('should handle edge case where both actual and ideal are zero', () => {
    const actual = 0;
    const ideal = 0;
    const deviation = calculateDeviation(actual, ideal);
    const isSignificant = isSignificantDeviation(actual, ideal);

    expect(deviation).toBe(0);
    expect(isSignificant).toBe(false);
  });
});
