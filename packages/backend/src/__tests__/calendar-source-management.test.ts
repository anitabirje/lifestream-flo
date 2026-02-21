/**
 * Property-Based Tests for Calendar Source Management
 * 
 * Feature: flo-family-calendar
 * Property 4: Data Preservation During Source Management
 * Validates: Requirements 1.7
 * 
 * This test verifies that calendar events and data are preserved when
 * calendar sources are added, updated, or removed from the system.
 */

import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import { DynamoDBClientWrapper } from '../data-access/dynamodb-client';
import { CalendarSourceRegistry, CalendarSourceConfig } from '../services/calendar-source-registry';
import { AgentTaskDispatcher } from '../services/agent-task-dispatcher';
import { AgentOrchestrator } from '../agents/agent-orchestrator';
import { AgentRegistry } from '../agents/agent-registry';
import { IAgent, AgentOrchestrationConfig } from '../agents/types';

// ============================================================================
// MOCK SETUP
// ============================================================================

/**
 * Mock DynamoDB client for testing
 */
class MockDynamoDBClient implements Partial<DynamoDBClientWrapper> {
  private store: Map<string, any> = new Map();

  async put(item: any): Promise<void> {
    const key = `${item.PK}#${item.SK}`;
    this.store.set(key, item);
  }

  async get(key: any): Promise<any> {
    const compositeKey = `${key.PK}#${key.SK}`;
    return this.store.get(compositeKey) || null;
  }

  async query(
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    options?: any
  ): Promise<{ items: any[]; lastEvaluatedKey?: Record<string, any> }> {
    const results: any[] = [];
    const pk = expressionAttributeValues[':pk'];
    const sk = expressionAttributeValues[':sk'];

    for (const [key, value] of this.store.entries()) {
      if (key.startsWith(`${pk}#`)) {
        if (sk && key.includes(sk)) {
          results.push(value);
        } else if (!sk) {
          results.push(value);
        }
      }
    }
    return { items: results };
  }

  async update(
    key: any,
    updateExpression: string,
    expressionAttributeNames?: Record<string, string>,
    expressionAttributeValues?: Record<string, any>
  ): Promise<void> {
    const compositeKey = `${key.PK}#${key.SK}`;
    const existing = this.store.get(compositeKey);
    if (existing && expressionAttributeValues) {
      // Simple update: just merge the values
      const updates: any = {};
      for (const [key, value] of Object.entries(expressionAttributeValues)) {
        const attrName = key.replace(':', '');
        updates[attrName] = value;
      }
      this.store.set(compositeKey, { ...existing, ...updates });
    }
  }

  async delete(key: any): Promise<void> {
    const compositeKey = `${key.PK}#${key.SK}`;
    this.store.delete(compositeKey);
  }

  async batchWrite(requests: any[]): Promise<void> {
    for (const request of requests) {
      if (request.PutRequest) {
        const item = request.PutRequest.Item;
        const key = `${item.PK}#${item.SK}`;
        this.store.set(key, item);
      } else if (request.DeleteRequest) {
        const key = request.DeleteRequest.Key;
        const compositeKey = `${key.PK}#${key.SK}`;
        this.store.delete(compositeKey);
      }
    }
  }

  async batchGet(keys: any[]): Promise<any[]> {
    const results: any[] = [];
    for (const key of keys) {
      const compositeKey = `${key.PK}#${key.SK}`;
      const item = this.store.get(compositeKey);
      if (item) {
        results.push(item);
      }
    }
    return results;
  }

  clear(): void {
    this.store.clear();
  }
}

/**
 * Mock agent for testing
 */
class MockCalendarQueryAgent implements IAgent {
  id: string;
  type: 'calendar_query' = 'calendar_query';
  capabilities: string[] = ['calendar_query'];
  status: 'idle' | 'busy' | 'failed' | 'offline' = 'idle';

  constructor(id?: string) {
    this.id = id || uuidv4();
  }

  async execute(task: any): Promise<any> {
    return {
      taskId: task.id,
      agentId: this.id,
      status: 'success',
      data: { events: [] },
      executionTime: 100,
      completedAt: new Date()
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

// ============================================================================
// ARBITRARIES (Test Data Generators)
// ============================================================================

/**
 * Generate valid calendar source configurations
 */
const calendarSourceArbitrary = fc.record({
  familyMemberId: fc.uuid(),
  type: fc.constantFrom('google' as const, 'outlook' as const, 'kids_school' as const, 'kids_connect' as const),
  credentials: fc.record({
    email: fc.emailAddress(),
    accessToken: fc.string({ minLength: 10, maxLength: 100 }),
    refreshToken: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined })
  })
});

/**
 * Generate valid event data
 */
const eventDataArbitrary = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  startTime: fc.date().map(d => d.toISOString()),
  endTime: fc.date().map(d => d.toISOString()),
  location: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  category: fc.constantFrom('Work', 'Family Time', 'Health/Fitness', 'Upskilling', 'Relaxation')
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create a test setup with mock dependencies
 */
function createTestSetup() {
  const mockDb = new MockDynamoDBClient();
  const encryptionKey = '0'.repeat(64); // 32 bytes in hex
  
  const registry = new CalendarSourceRegistry(mockDb as any as DynamoDBClientWrapper, {
    encryptionKey,
    maxRetries: 3
  });

  const config: AgentOrchestrationConfig = {
    maxConcurrentAgents: 5,
    taskTimeout: 30000,
    retryStrategy: 'exponential',
    retryDelay: 1000,
    healthCheckInterval: 5000
  };

  const orchestrator = new AgentOrchestrator(config);
  const dispatcher = new AgentTaskDispatcher(orchestrator, registry);

  return { mockDb, registry, orchestrator, dispatcher };
}

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 4: Data Preservation During Source Management', () => {
  /**
   * Property: When a calendar source is added, existing events are preserved
   */
  it('should preserve existing events when adding a new calendar source', async () => {
    await fc.assert(
      fc.asyncProperty(
        calendarSourceArbitrary,
        calendarSourceArbitrary,
        eventDataArbitrary,
        async (source1, source2, eventData) => {
          const { registry, mockDb } = createTestSetup();
          const familyId = uuidv4();
          const familyMemberId = uuidv4();

          try {
            // Register first source
            const registeredSource1 = await registry.registerSource(
              familyMemberId,
              source1.type,
              source1.credentials,
              familyId
            );

            // Manually add an event to the database (simulating existing event)
            const eventId = uuidv4();
            const existingEvent = {
              PK: `FAMILY#${familyId}`,
              SK: `EVENT#${eventId}`,
              EntityType: 'EVENT',
              id: eventId,
              familyId,
              familyMemberId,
              ...eventData,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await mockDb.put(existingEvent);

            // Register second source
            const registeredSource2 = await registry.registerSource(
              familyMemberId,
              source2.type,
              source2.credentials,
              familyId
            );

            // Verify both sources are registered
            const retrievedSource1 = await registry.getSource(registeredSource1.id, familyId);
            const retrievedSource2 = await registry.getSource(registeredSource2.id, familyId);

            expect(retrievedSource1).not.toBeNull();
            expect(retrievedSource2).not.toBeNull();
            expect(retrievedSource1?.id).toBe(registeredSource1.id);
            expect(retrievedSource2?.id).toBe(registeredSource2.id);

            // Verify existing event is still present
            const retrievedEvent = await mockDb.get({
              PK: `FAMILY#${familyId}`,
              SK: `EVENT#${eventId}`
            });

            expect(retrievedEvent).not.toBeNull();
            expect(retrievedEvent.id).toBe(eventId);
            expect(retrievedEvent.title).toBe(eventData.title);
            expect(retrievedEvent.startTime).toBe(eventData.startTime);
            expect(retrievedEvent.endTime).toBe(eventData.endTime);

          } finally {
            mockDb.clear();
          }
        }
      ),
      {
        numRuns: 50,
        timeout: 10000
      }
    );
  }, 30000);

  /**
   * Property: When a calendar source is updated, existing events are preserved
   */
  it('should preserve existing events when updating a calendar source', async () => {
    await fc.assert(
      fc.asyncProperty(
        calendarSourceArbitrary,
        calendarSourceArbitrary,
        eventDataArbitrary,
        async (source1, source2, eventData) => {
          const { registry, mockDb } = createTestSetup();
          const familyId = uuidv4();
          const familyMemberId = uuidv4();

          try {
            // Register source
            const registeredSource = await registry.registerSource(
              familyMemberId,
              source1.type,
              source1.credentials,
              familyId
            );

            // Add an event
            const eventId = uuidv4();
            const existingEvent = {
              PK: `FAMILY#${familyId}`,
              SK: `EVENT#${eventId}`,
              EntityType: 'EVENT',
              id: eventId,
              familyId,
              familyMemberId,
              ...eventData,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await mockDb.put(existingEvent);

            // Update the source
            const updatedSource = await registry.updateSource(
              registeredSource.id,
              familyId,
              {
                syncStatus: 'active',
                lastSyncTime: new Date(),
                retryCount: 0
              }
            );

            // Verify source was updated
            expect(updatedSource.syncStatus).toBe('active');

            // Verify existing event is still present
            const retrievedEvent = await mockDb.get({
              PK: `FAMILY#${familyId}`,
              SK: `EVENT#${eventId}`
            });

            expect(retrievedEvent).not.toBeNull();
            expect(retrievedEvent.id).toBe(eventId);
            expect(retrievedEvent.title).toBe(eventData.title);

          } finally {
            mockDb.clear();
          }
        }
      ),
      {
        numRuns: 50,
        timeout: 10000
      }
    );
  }, 30000);

  /**
   * Property: When a calendar source is removed, other sources' events are preserved
   */
  it('should preserve events from other sources when removing a calendar source', async () => {
    await fc.assert(
      fc.asyncProperty(
        calendarSourceArbitrary,
        calendarSourceArbitrary,
        eventDataArbitrary,
        eventDataArbitrary,
        async (source1, source2, eventData1, eventData2) => {
          const { registry, mockDb } = createTestSetup();
          const familyId = uuidv4();
          const familyMemberId = uuidv4();

          try {
            // Register two sources
            const registeredSource1 = await registry.registerSource(
              familyMemberId,
              source1.type,
              source1.credentials,
              familyId
            );

            const registeredSource2 = await registry.registerSource(
              familyMemberId,
              source2.type,
              source2.credentials,
              familyId
            );

            // Add events from both sources
            const event1Id = uuidv4();
            const event1 = {
              PK: `FAMILY#${familyId}`,
              SK: `EVENT#${event1Id}`,
              EntityType: 'EVENT',
              id: event1Id,
              familyId,
              familyMemberId,
              sourceId: registeredSource1.id,
              ...eventData1,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            const event2Id = uuidv4();
            const event2 = {
              PK: `FAMILY#${familyId}`,
              SK: `EVENT#${event2Id}`,
              EntityType: 'EVENT',
              id: event2Id,
              familyId,
              familyMemberId,
              sourceId: registeredSource2.id,
              ...eventData2,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            await mockDb.put(event1);
            await mockDb.put(event2);

            // Remove first source
            const removed = await registry.removeSource(registeredSource1.id, familyId);
            expect(removed).toBe(true);

            // Verify first source is removed
            const retrievedSource1 = await registry.getSource(registeredSource1.id, familyId);
            expect(retrievedSource1).toBeNull();

            // Verify second source still exists
            const retrievedSource2 = await registry.getSource(registeredSource2.id, familyId);
            expect(retrievedSource2).not.toBeNull();

            // Verify event from second source is still present
            const retrievedEvent2 = await mockDb.get({
              PK: `FAMILY#${familyId}`,
              SK: `EVENT#${event2Id}`
            });

            expect(retrievedEvent2).not.toBeNull();
            expect(retrievedEvent2.id).toBe(event2Id);
            expect(retrievedEvent2.title).toBe(eventData2.title);

          } finally {
            mockDb.clear();
          }
        }
      ),
      {
        numRuns: 50,
        timeout: 10000
      }
    );
  }, 30000);

  /**
   * Property: Multiple sources can be managed without data loss
   */
  it('should manage multiple sources without losing event data', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(calendarSourceArbitrary, { minLength: 1, maxLength: 5 }),
        eventDataArbitrary,
        async (sources, eventData) => {
          const { registry, mockDb } = createTestSetup();
          const familyId = uuidv4();
          const familyMemberId = uuidv4();

          try {
            // Register all sources
            const registeredSources = [];
            for (const source of sources) {
              const registered = await registry.registerSource(
                familyMemberId,
                source.type,
                source.credentials,
                familyId
              );
              registeredSources.push(registered);
            }

            // Add events for each source
            const eventIds: string[] = [];
            for (let i = 0; i < registeredSources.length; i++) {
              const eventId = uuidv4();
              eventIds.push(eventId);

              const event = {
                PK: `FAMILY#${familyId}`,
                SK: `EVENT#${eventId}`,
                EntityType: 'EVENT',
                id: eventId,
                familyId,
                familyMemberId,
                sourceId: registeredSources[i].id,
                ...eventData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };

              await mockDb.put(event);
            }

            // Retrieve all sources
            const retrievedSources = await registry.getActiveSources(familyId);
            expect(retrievedSources.length).toBe(registeredSources.length);

            // Verify all events are still present
            for (const eventId of eventIds) {
              const retrievedEvent = await mockDb.get({
                PK: `FAMILY#${familyId}`,
                SK: `EVENT#${eventId}`
              });

              expect(retrievedEvent).not.toBeNull();
              expect(retrievedEvent.id).toBe(eventId);
            }

          } finally {
            mockDb.clear();
          }
        }
      ),
      {
        numRuns: 30,
        timeout: 10000
      }
    );
  }, 30000);

  /**
   * Property: Credential encryption preserves data integrity
   */
  it('should preserve credential data through encryption/decryption cycles', async () => {
    await fc.assert(
      fc.asyncProperty(
        calendarSourceArbitrary,
        async (source) => {
          const { registry } = createTestSetup();
          const familyId = uuidv4();
          const familyMemberId = uuidv4();

          try {
            // Register source with credentials
            const registered = await registry.registerSource(
              familyMemberId,
              source.type,
              source.credentials,
              familyId
            );

            // Retrieve and decrypt credentials
            const decrypted = await registry.getDecryptedCredentials(registered.id, familyId);

            // Verify credentials match
            expect(decrypted.email).toBe(source.credentials.email);
            expect(decrypted.accessToken).toBe(source.credentials.accessToken);
            if (source.credentials.refreshToken) {
              expect(decrypted.refreshToken).toBe(source.credentials.refreshToken);
            }

          } finally {
            // Cleanup handled by mock
          }
        }
      ),
      {
        numRuns: 50,
        timeout: 10000
      }
    );
  }, 30000);
});
