/**
 * Property-Based Tests for DynamoDB Data Persistence
 * 
 * Feature: flo-family-calendar
 * Property 36: Data Persistence Round Trip
 * Validates: Requirements 9.1
 * 
 * This test verifies that data written to DynamoDB can be read back
 * with complete fidelity (round-trip persistence).
 */

import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import { dynamoDBDataAccess } from '../data-access/dynamodb-client';
import { KeyBuilder, EventEntity, FamilyMemberEntity, SessionEntity } from '../config/schema';

// ============================================================================
// ARBITRARIES (Test Data Generators)
// ============================================================================

/**
 * Generate valid ISO 8601 date strings
 */
const isoDateArbitrary = fc.date().map(date => date.toISOString());

/**
 * Generate valid event entities
 */
const eventEntityArbitrary = fc.record({
  id: fc.uuid(),
  familyId: fc.uuid(),
  familyMemberId: fc.uuid(),
  title: fc.string({ minLength: 1, maxLength: 200 }),
  description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
  startTime: isoDateArbitrary,
  endTime: isoDateArbitrary,
  location: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  category: fc.constantFrom('Work', 'Family Time', 'Health/Fitness', 'Upskilling', 'Relaxation'),
  source: fc.constantFrom('google', 'outlook', 'kids_school', 'kids_connect', 'extracurricular', 'internal'),
  externalId: fc.option(fc.uuid(), { nil: undefined }),
  sourceId: fc.option(fc.uuid(), { nil: undefined }),
  attendees: fc.option(fc.array(fc.emailAddress(), { maxLength: 10 }), { nil: undefined }),
  isDeleted: fc.boolean(),
  classifiedByAgentId: fc.option(fc.uuid(), { nil: undefined }),
  classificationConfidence: fc.option(fc.float({ min: 0, max: 1 }), { nil: undefined }),
}).map(data => {
  const now = new Date().toISOString();
  const dateStr = data.startTime.split('T')[0]; // Extract YYYY-MM-DD
  
  return {
    ...KeyBuilder.event(data.familyId, data.id),
    ...KeyBuilder.eventByDate(data.familyId, dateStr, data.id),
    EntityType: 'EVENT' as const,
    ...data,
    createdAt: now,
    updatedAt: now,
  } as EventEntity;
});

/**
 * Generate valid family member entities
 */
const familyMemberEntityArbitrary = fc.record({
  id: fc.uuid(),
  familyId: fc.uuid(),
  email: fc.emailAddress(),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  passwordHash: fc.string({ minLength: 60, maxLength: 60 }), // bcrypt hash length
  role: fc.constantFrom('admin', 'member'),
  status: fc.constantFrom('active', 'inactive', 'removed'),
  lastLoginAt: fc.option(isoDateArbitrary, { nil: undefined }),
}).map(data => {
  const now = new Date().toISOString();
  
  return {
    ...KeyBuilder.familyMember(data.familyId, data.id),
    EntityType: 'FAMILY_MEMBER' as const,
    ...data,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  } as FamilyMemberEntity;
});

/**
 * Generate valid session entities
 */
const sessionEntityArbitrary = fc.record({
  id: fc.uuid(),
  userId: fc.uuid(),
  token: fc.uuid(),
}).map(data => {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const ttl = Math.floor(expiresAt.getTime() / 1000); // Unix timestamp
  
  return {
    ...KeyBuilder.session(data.userId, data.token),
    EntityType: 'SESSION' as const,
    ...data,
    expiresAt: expiresAt.toISOString(),
    lastActivityAt: now.toISOString(),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    TTL: ttl,
  } as SessionEntity;
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Clean up test data after each test
 */
async function cleanupTestData(key: Record<string, any>): Promise<void> {
  try {
    await dynamoDBDataAccess.delete(key);
  } catch (error) {
    // Ignore errors during cleanup
  }
}

/**
 * Compare two objects for deep equality, ignoring undefined values
 */
function deepEqual(obj1: any, obj2: any): boolean {
  // Remove undefined values from both objects
  const clean1 = JSON.parse(JSON.stringify(obj1));
  const clean2 = JSON.parse(JSON.stringify(obj2));
  
  return JSON.stringify(clean1) === JSON.stringify(clean2);
}

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe('Property 36: Data Persistence Round Trip', () => {
  /**
   * Property: Any event entity written to DynamoDB can be read back
   * with complete fidelity
   */
  it('should persist and retrieve event entities without data loss', async () => {
    await fc.assert(
      fc.asyncProperty(eventEntityArbitrary, async (event) => {
        const key = { PK: event.PK, SK: event.SK };
        
        try {
          // Write the event to DynamoDB
          await dynamoDBDataAccess.put(event);
          
          // Read it back
          const retrieved = await dynamoDBDataAccess.get<EventEntity>(key);
          
          // Verify the data matches
          expect(retrieved).not.toBeNull();
          expect(deepEqual(retrieved, event)).toBe(true);
          
          // Verify all required fields are present
          expect(retrieved?.id).toBe(event.id);
          expect(retrieved?.familyId).toBe(event.familyId);
          expect(retrieved?.familyMemberId).toBe(event.familyMemberId);
          expect(retrieved?.title).toBe(event.title);
          expect(retrieved?.startTime).toBe(event.startTime);
          expect(retrieved?.endTime).toBe(event.endTime);
          expect(retrieved?.category).toBe(event.category);
          expect(retrieved?.source).toBe(event.source);
          expect(retrieved?.isDeleted).toBe(event.isDeleted);
          
          // Verify optional fields
          if (event.description !== undefined) {
            expect(retrieved?.description).toBe(event.description);
          }
          if (event.location !== undefined) {
            expect(retrieved?.location).toBe(event.location);
          }
          if (event.externalId !== undefined) {
            expect(retrieved?.externalId).toBe(event.externalId);
          }
          if (event.sourceId !== undefined) {
            expect(retrieved?.sourceId).toBe(event.sourceId);
          }
          if (event.attendees !== undefined) {
            expect(retrieved?.attendees).toEqual(event.attendees);
          }
          if (event.classifiedByAgentId !== undefined) {
            expect(retrieved?.classifiedByAgentId).toBe(event.classifiedByAgentId);
          }
          if (event.classificationConfidence !== undefined) {
            expect(retrieved?.classificationConfidence).toBe(event.classificationConfidence);
          }
          
          // Verify GSI keys are present
          expect(retrieved?.GSI1PK).toBe(event.GSI1PK);
          expect(retrieved?.GSI1SK).toBe(event.GSI1SK);
          
        } finally {
          // Cleanup
          await cleanupTestData(key);
        }
      }),
      {
        numRuns: 100, // Run 100 test cases
        timeout: 30000, // 30 second timeout
      }
    );
  }, 60000); // 60 second Jest timeout
  
  /**
   * Property: Any family member entity written to DynamoDB can be read back
   * with complete fidelity
   */
  it('should persist and retrieve family member entities without data loss', async () => {
    await fc.assert(
      fc.asyncProperty(familyMemberEntityArbitrary, async (member) => {
        const key = { PK: member.PK, SK: member.SK };
        
        try {
          // Write the member to DynamoDB
          await dynamoDBDataAccess.put(member);
          
          // Read it back
          const retrieved = await dynamoDBDataAccess.get<FamilyMemberEntity>(key);
          
          // Verify the data matches
          expect(retrieved).not.toBeNull();
          expect(deepEqual(retrieved, member)).toBe(true);
          
          // Verify all required fields are present
          expect(retrieved?.id).toBe(member.id);
          expect(retrieved?.familyId).toBe(member.familyId);
          expect(retrieved?.email).toBe(member.email);
          expect(retrieved?.name).toBe(member.name);
          expect(retrieved?.passwordHash).toBe(member.passwordHash);
          expect(retrieved?.role).toBe(member.role);
          expect(retrieved?.status).toBe(member.status);
          expect(retrieved?.joinedAt).toBe(member.joinedAt);
          
          // Verify optional fields
          if (member.lastLoginAt !== undefined) {
            expect(retrieved?.lastLoginAt).toBe(member.lastLoginAt);
          }
          
        } finally {
          // Cleanup
          await cleanupTestData(key);
        }
      }),
      {
        numRuns: 100,
        timeout: 30000,
      }
    );
  }, 60000);
  
  /**
   * Property: Any session entity written to DynamoDB can be read back
   * with complete fidelity, including TTL
   */
  it('should persist and retrieve session entities without data loss', async () => {
    await fc.assert(
      fc.asyncProperty(sessionEntityArbitrary, async (session) => {
        const key = { PK: session.PK, SK: session.SK };
        
        try {
          // Write the session to DynamoDB
          await dynamoDBDataAccess.put(session);
          
          // Read it back
          const retrieved = await dynamoDBDataAccess.get<SessionEntity>(key);
          
          // Verify the data matches
          expect(retrieved).not.toBeNull();
          expect(deepEqual(retrieved, session)).toBe(true);
          
          // Verify all required fields are present
          expect(retrieved?.id).toBe(session.id);
          expect(retrieved?.userId).toBe(session.userId);
          expect(retrieved?.token).toBe(session.token);
          expect(retrieved?.expiresAt).toBe(session.expiresAt);
          expect(retrieved?.lastActivityAt).toBe(session.lastActivityAt);
          expect(retrieved?.TTL).toBe(session.TTL);
          
        } finally {
          // Cleanup
          await cleanupTestData(key);
        }
      }),
      {
        numRuns: 100,
        timeout: 30000,
      }
    );
  }, 60000);
  
  /**
   * Property: Batch write and batch read operations preserve data fidelity
   */
  it('should persist and retrieve multiple events via batch operations', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(eventEntityArbitrary, { minLength: 1, maxLength: 10 }),
        async (events) => {
          // Ensure unique keys
          const uniqueEvents = events.map((event, index) => ({
            ...event,
            id: `${event.id}-${index}`,
            PK: `FAMILY#${event.familyId}`,
            SK: `EVENT#${event.id}-${index}`,
          }));
          
          const keys = uniqueEvents.map(e => ({ PK: e.PK, SK: e.SK }));
          
          try {
            // Batch write
            await dynamoDBDataAccess.batchWrite(
              uniqueEvents.map(event => ({
                PutRequest: { Item: event },
              }))
            );
            
            // Batch read
            const retrieved = await dynamoDBDataAccess.batchGet<EventEntity>(keys);
            
            // Verify all items were retrieved
            expect(retrieved.length).toBe(uniqueEvents.length);
            
            // Verify each item matches
            for (const event of uniqueEvents) {
              const found = retrieved.find(r => r.id === event.id);
              expect(found).toBeDefined();
              expect(deepEqual(found, event)).toBe(true);
            }
            
          } finally {
            // Cleanup
            await dynamoDBDataAccess.batchWrite(
              keys.map(key => ({
                DeleteRequest: { Key: key },
              }))
            );
          }
        }
      ),
      {
        numRuns: 50, // Fewer runs for batch operations
        timeout: 30000,
      }
    );
  }, 60000);
});
