/**
 * Property-Based Tests for Onboarding Wizard
 * Feature: flo-family-calendar
 * Property 54: Onboarding Completion State
 * Validates: Requirements 1b.1-1b.11
 */

import * as fc from 'fast-check';
import { OnboardingService } from '../services/onboarding-service';
import { DynamoDBClientWrapper } from '../data-access/dynamodb-client';

// Mock the DynamoDB configuration to avoid AWS credential issues in tests
jest.mock('../config/dynamodb', () => {
  const mockDocClient = {
    send: jest.fn(),
    config: {},
  };
  return {
    docClient: mockDocClient,
    dynamoDBClient: {},
  };
});

describe('Onboarding Wizard Property Tests', () => {
  let onboardingService: OnboardingService;
  let dynamoClient: DynamoDBClientWrapper;
  let mockSend: jest.Mock;

  beforeAll(() => {
    const { docClient } = require('../config/dynamodb');
    mockSend = docClient.send as jest.Mock;
    
    dynamoClient = new DynamoDBClientWrapper();
    onboardingService = new OnboardingService(dynamoClient);
  });

  beforeEach(() => {
    mockSend.mockClear();
  });

  /**
   * Property 54: Onboarding Completion State
   * 
   * PROPERTY: When a user completes onboarding with valid data,
   * the system SHALL save the state with isComplete=true and
   * allow the user to retrieve and re-run the wizard later.
   * 
   * Validates: Requirements 1b.1-1b.11
   */
  describe('Property 54: Onboarding Completion State', () => {
    it('should save and retrieve onboarding state correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate arbitrary onboarding data
          fc.record({
            userId: fc.uuid(),
            familyId: fc.uuid(),
            selectedSources: fc.array(
              fc.constantFrom('google', 'outlook', 'school-newsletter', 'seesaw', 'connect-now', 'seqta', 'extracurricular'),
              { minLength: 1, maxLength: 7 }
            ),
            connectedSources: fc.dictionary(
              fc.constantFrom('google', 'outlook', 'school-newsletter', 'seesaw', 'connect-now', 'seqta', 'extracurricular'),
              fc.boolean()
            ),
            categoryTrackingEnabled: fc.boolean(),
            customCategories: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
            timeAllocations: fc.dictionary(
              fc.string({ minLength: 1, maxLength: 50 }),
              fc.record({
                ideal: fc.float({ min: 0, max: 168, noNaN: true }),
                max: fc.oneof(fc.constant(undefined), fc.float({ min: 0, max: 168, noNaN: true })),
                min: fc.oneof(fc.constant(undefined), fc.float({ min: 0, max: 168, noNaN: true }))
              })
            )
          }),
          async (onboardingData) => {
            // Mock DynamoDB responses for this test
            let savedState: any = null;
            
            mockSend.mockImplementation((command: any) => {
              const commandName = command.constructor.name;
              
              if (commandName === 'PutCommand') {
                savedState = command.input.Item;
                return Promise.resolve({});
              }
              
              if (commandName === 'GetCommand') {
                return Promise.resolve({ Item: savedState });
              }
              
              return Promise.resolve({});
            });

            // Save onboarding state as incomplete
            const saveResult = await onboardingService.saveOnboardingState({
              ...onboardingData,
              isComplete: false
            });

            // Property 1: Save operation should succeed
            expect(saveResult.success).toBe(true);
            expect(saveResult.state).toBeDefined();

            // Property 2: Saved state should match input data
            expect(saveResult.state?.userId).toBe(onboardingData.userId);
            expect(saveResult.state?.familyId).toBe(onboardingData.familyId);
            expect(saveResult.state?.selectedSources).toEqual(onboardingData.selectedSources);
            expect(saveResult.state?.categoryTrackingEnabled).toBe(onboardingData.categoryTrackingEnabled);
            expect(saveResult.state?.isComplete).toBe(false);

            // Property 3: Should be able to retrieve saved state
            const retrievedState = await onboardingService.getOnboardingState(onboardingData.userId);
            expect(retrievedState).toBeDefined();
            expect(retrievedState?.userId).toBe(onboardingData.userId);
            expect(retrievedState?.isComplete).toBe(false);

            // Property 4: Mark onboarding as complete
            const completeResult = await onboardingService.markOnboardingComplete(onboardingData.userId);
            expect(completeResult.success).toBe(true);
            expect(completeResult.state?.isComplete).toBe(true);
            expect(completeResult.state?.completedAt).toBeDefined();

            // Property 5: Completion status should be queryable
            const isComplete = await onboardingService.isOnboardingComplete(onboardingData.userId);
            expect(isComplete).toBe(true);

            // Property 6: Should be able to reset onboarding
            const resetResult = await onboardingService.resetOnboarding(onboardingData.userId);
            expect(resetResult.success).toBe(true);
            expect(resetResult.state?.isComplete).toBe(false);
            expect(resetResult.state?.completedAt).toBeUndefined();

            // Property 7: After reset, completion status should be false
            const isCompleteAfterReset = await onboardingService.isOnboardingComplete(onboardingData.userId);
            expect(isCompleteAfterReset).toBe(false);

            // Property 8: Original data should be preserved after reset
            const stateAfterReset = await onboardingService.getOnboardingState(onboardingData.userId);
            expect(stateAfterReset?.selectedSources).toEqual(onboardingData.selectedSources);
            expect(stateAfterReset?.categoryTrackingEnabled).toBe(onboardingData.categoryTrackingEnabled);
          }
        ),
        { numRuns: 100 }
      );
    }, 60000); // 60 second timeout for property test

    it('should handle calendar source selection correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.array(
            fc.constantFrom('google', 'outlook', 'school-newsletter', 'seesaw', 'connect-now', 'seqta', 'extracurricular'),
            { minLength: 1, maxLength: 7 }
          ),
          async (userId, familyId, selectedSources) => {
            // Mock DynamoDB responses
            let savedState: any = null;
            
            mockSend.mockImplementation((command: any) => {
              const commandName = command.constructor.name;
              
              if (commandName === 'PutCommand') {
                savedState = command.input.Item;
                return Promise.resolve({});
              }
              
              if (commandName === 'GetCommand') {
                return Promise.resolve({ Item: savedState });
              }
              
              return Promise.resolve({});
            });

            // Property: User must select at least one calendar source (Requirement 1b.2)
            expect(selectedSources.length).toBeGreaterThan(0);

            const result = await onboardingService.saveOnboardingState({
              userId,
              familyId,
              selectedSources,
              connectedSources: {},
              categoryTrackingEnabled: true,
              customCategories: [],
              timeAllocations: {},
              isComplete: false
            });

            expect(result.success).toBe(true);
            expect(result.state?.selectedSources).toEqual(selectedSources);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle category tracking toggle correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.boolean(),
          fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
          async (userId, familyId, categoryTrackingEnabled, customCategories) => {
            // Mock DynamoDB responses
            let savedState: any = null;
            
            mockSend.mockImplementation((command: any) => {
              const commandName = command.constructor.name;
              
              if (commandName === 'PutCommand') {
                savedState = command.input.Item;
                return Promise.resolve({});
              }
              
              if (commandName === 'GetCommand') {
                return Promise.resolve({ Item: savedState });
              }
              
              return Promise.resolve({});
            });

            // Property: Category tracking can be enabled or disabled (Requirement 1b.6)
            const result = await onboardingService.saveOnboardingState({
              userId,
              familyId,
              selectedSources: ['google'],
              connectedSources: {},
              categoryTrackingEnabled,
              customCategories: categoryTrackingEnabled ? customCategories : [],
              timeAllocations: {},
              isComplete: false
            });

            expect(result.success).toBe(true);
            expect(result.state?.categoryTrackingEnabled).toBe(categoryTrackingEnabled);

            // Property: Custom categories should only be saved if tracking is enabled
            if (categoryTrackingEnabled) {
              expect(result.state?.customCategories).toEqual(customCategories);
            } else {
              expect(result.state?.customCategories).toEqual([]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle time allocation preferences correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 50 }),
            fc.record({
              ideal: fc.float({ min: 0, max: 168, noNaN: true }),
              max: fc.oneof(fc.constant(undefined), fc.float({ min: 0, max: 168, noNaN: true })),
              min: fc.oneof(fc.constant(undefined), fc.float({ min: 0, max: 168, noNaN: true }))
            })
          ),
          async (userId, familyId, timeAllocations) => {
            // Mock DynamoDB responses
            let savedState: any = null;
            
            mockSend.mockImplementation((command: any) => {
              const commandName = command.constructor.name;
              
              if (commandName === 'PutCommand') {
                savedState = command.input.Item;
                return Promise.resolve({});
              }
              
              if (commandName === 'GetCommand') {
                return Promise.resolve({ Item: savedState });
              }
              
              return Promise.resolve({});
            });

            // Property: Time allocations should be saved correctly (Requirements 1b.8, 1b.9)
            const result = await onboardingService.saveOnboardingState({
              userId,
              familyId,
              selectedSources: ['google'],
              connectedSources: {},
              categoryTrackingEnabled: true,
              customCategories: [],
              timeAllocations,
              isComplete: false
            });

            expect(result.success).toBe(true);
            expect(result.state?.timeAllocations).toEqual(timeAllocations);

            // Property: All time values should be non-negative and <= 168 hours/week
            Object.values(result.state?.timeAllocations || {}).forEach(allocation => {
              expect(allocation.ideal).toBeGreaterThanOrEqual(0);
              expect(allocation.ideal).toBeLessThanOrEqual(168);
              
              if (allocation.max !== undefined) {
                expect(allocation.max).toBeGreaterThanOrEqual(0);
                expect(allocation.max).toBeLessThanOrEqual(168);
              }
              
              if (allocation.min !== undefined) {
                expect(allocation.min).toBeGreaterThanOrEqual(0);
                expect(allocation.min).toBeLessThanOrEqual(168);
              }
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should preserve data integrity across updates', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.array(fc.constantFrom('google', 'outlook', 'school-newsletter'), { minLength: 1, maxLength: 3 }),
          fc.array(fc.constantFrom('google', 'outlook', 'extracurricular'), { minLength: 1, maxLength: 3 }),
          async (userId, familyId, initialSources, updatedSources) => {
            // Mock DynamoDB responses
            let savedState: any = null;
            
            mockSend.mockImplementation((command: any) => {
              const commandName = command.constructor.name;
              
              if (commandName === 'PutCommand') {
                savedState = command.input.Item;
                return Promise.resolve({});
              }
              
              if (commandName === 'GetCommand') {
                return Promise.resolve({ Item: savedState });
              }
              
              return Promise.resolve({});
            });

            // Save initial state
            const initialResult = await onboardingService.saveOnboardingState({
              userId,
              familyId,
              selectedSources: initialSources,
              connectedSources: {},
              categoryTrackingEnabled: true,
              customCategories: ['Custom1'],
              timeAllocations: { work: { ideal: 40 } },
              isComplete: false
            });

            expect(initialResult.success).toBe(true);

            // Update state
            const updateResult = await onboardingService.saveOnboardingState({
              userId,
              familyId,
              selectedSources: updatedSources,
              connectedSources: {},
              categoryTrackingEnabled: false,
              customCategories: [],
              timeAllocations: {},
              isComplete: false
            });

            expect(updateResult.success).toBe(true);

            // Property: Updated state should reflect new values
            expect(updateResult.state?.selectedSources).toEqual(updatedSources);
            expect(updateResult.state?.categoryTrackingEnabled).toBe(false);

            // Property: createdAt should remain unchanged, updatedAt should change
            expect(updateResult.state?.createdAt).toEqual(initialResult.state?.createdAt);
            expect(updateResult.state?.updatedAt).not.toEqual(initialResult.state?.updatedAt);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
