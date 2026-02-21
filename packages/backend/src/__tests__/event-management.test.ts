/**
 * Property-Based Tests for Event Management
 * 
 * Feature: flo-family-calendar
 * Property 26: Event Creation and Sync
 * Property 27: Event Update Synchronization
 * Property 28: Event Deletion Synchronization
 * Property 30: Event Audit Logging
 * Validates: Requirements 7.1, 7.2, 7.3, 7.6
 */

import * as fc from 'fast-check';
import { v4 as uuidv4 } from 'uuid';
import { EventManagementService } from '../services/event-management-service';
import { AuditLogger } from '../services/audit-logger';
import { AgentTaskDispatcher } from '../services/agent-task-dispatcher';
import { dynamoDBDataAccess, dynamoDBClientWrapper } from '../data-access/dynamodb-client';
import { AgentOrchestrator } from '../agents/agent-orchestrator';
import { CalendarSourceRegistry } from '../services/calendar-source-registry';

// Test data generators
const eventDataArbitrary = fc.record({
  title: fc.string({ minLength: 1, maxLength: 200 }).filter(s => s.trim().length > 0),
  description: fc.option(fc.string({ maxLength: 1000 }), { nil: undefined }),
  startTime: fc.date(),
  endTime: fc.date(),
  location: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  category: fc.option(
    fc.constantFrom('Work', 'Family Time', 'Health/Fitness', 'Upskilling', 'Relaxation'),
    { nil: undefined }
  ),
  attendees: fc.option(fc.array(fc.emailAddress(), { maxLength: 5 }), { nil: undefined }),
}).filter(data => data.startTime < data.endTime);

// Helper functions
async function cleanupTestData(familyId: string, eventId: string): Promise<void> {
  try {
    await dynamoDBClientWrapper.delete({ PK: `FAMILY#${familyId}`, SK: `EVENT#${eventId}` });
  } catch (error) {
    // Ignore errors during cleanup
  }
}

async function cleanupAuditLogs(familyId: string): Promise<void> {
  try {
    const items = await dynamoDBDataAccess.query(`FAMILY#${familyId}`, 'AUDIT#');
    for (const item of items) {
      await dynamoDBClientWrapper.delete({ PK: item.PK, SK: item.SK });
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
}

// Initialize services once for all tests
const auditLogger = new AuditLogger(dynamoDBDataAccess);
const orchestrator = new AgentOrchestrator({
  maxConcurrentAgents: 5,
  taskTimeout: 30000,
  retryStrategy: 'exponential',
  retryDelay: 1000,
  healthCheckInterval: 60000,
});
const registry = new CalendarSourceRegistry(dynamoDBClientWrapper, {
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-key',
  maxRetries: 3,
});
const agentDispatcher = new AgentTaskDispatcher(orchestrator, registry, {
  maxRetries: 3,
  taskTimeout: 30000,
  loadBalancingStrategy: 'least_loaded',
});
const eventService = new EventManagementService(dynamoDBDataAccess, agentDispatcher, auditLogger);

describe('Property 26: Event Creation and Sync', () => {
  it('should create events with all required fields', async () => {
    await fc.assert(
      fc.asyncProperty(eventDataArbitrary, async (eventData) => {
        const familyId = uuidv4();
        const familyMemberId = uuidv4();
        const userId = uuidv4();

        try {
          const createdEvent = await eventService.createEvent({
            familyId,
            familyMemberId,
            title: eventData.title,
            description: eventData.description,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            location: eventData.location,
            category: eventData.category as any,
            attendees: eventData.attendees,
            source: 'internal',
            createdBy: userId,
          });

          expect(createdEvent.id).toBeDefined();
          expect(createdEvent.familyId).toBe(familyId);
          expect(createdEvent.title).toBe(eventData.title);
          expect(createdEvent.isDeleted).toBe(false);

          const retrievedEvent = await eventService.getEvent(familyId, createdEvent.id);
          expect(retrievedEvent?.id).toBe(createdEvent.id);

          await cleanupTestData(familyId, createdEvent.id);
          await cleanupAuditLogs(familyId);
        } catch (error) {
          throw error;
        }
      }),
      { numRuns: 5 }
    );
  });
});

describe('Property 27: Event Update Synchronization', () => {
  it('should update events and maintain data consistency', async () => {
    await fc.assert(
      fc.asyncProperty(eventDataArbitrary, eventDataArbitrary, async (initialData, updateData) => {
        const familyId = uuidv4();
        const familyMemberId = uuidv4();
        const userId = uuidv4();

        try {
          const createdEvent = await eventService.createEvent({
            familyId,
            familyMemberId,
            title: initialData.title,
            description: initialData.description,
            startTime: initialData.startTime,
            endTime: initialData.endTime,
            location: initialData.location,
            category: initialData.category as any,
            attendees: initialData.attendees,
            source: 'internal',
            createdBy: userId,
          });

          const originalUpdatedAt = createdEvent.updatedAt;
          await new Promise(resolve => setTimeout(resolve, 10));

          const updatedEvent = await eventService.updateEvent(
            familyId,
            createdEvent.id,
            {
              title: updateData.title,
              description: updateData.description,
              startTime: updateData.startTime,
              endTime: updateData.endTime,
              location: updateData.location,
              category: updateData.category as any,
              attendees: updateData.attendees,
            },
            userId
          );

          expect(updatedEvent?.title).toBe(updateData.title);
          expect(updatedEvent?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
          expect(updatedEvent?.createdAt).toEqual(createdEvent.createdAt);

          await cleanupTestData(familyId, createdEvent.id);
          await cleanupAuditLogs(familyId);
        } catch (error) {
          throw error;
        }
      }),
      { numRuns: 5 }
    );
  });
});

describe('Property 28: Event Deletion Synchronization', () => {
  it('should delete events and exclude them from listings', async () => {
    await fc.assert(
      fc.asyncProperty(eventDataArbitrary, async (eventData) => {
        const familyId = uuidv4();
        const familyMemberId = uuidv4();
        const userId = uuidv4();

        try {
          const createdEvent = await eventService.createEvent({
            familyId,
            familyMemberId,
            title: eventData.title,
            description: eventData.description,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            location: eventData.location,
            category: eventData.category as any,
            attendees: eventData.attendees,
            source: 'internal',
            createdBy: userId,
          });

          let events = await eventService.listEvents(familyId);
          expect(events.some(e => e.id === createdEvent.id)).toBe(true);

          const deleted = await eventService.deleteEvent(familyId, createdEvent.id, userId);
          expect(deleted).toBe(true);

          events = await eventService.listEvents(familyId);
          expect(events.some(e => e.id === createdEvent.id)).toBe(false);

          const deletedEvent = await eventService.getEvent(familyId, createdEvent.id);
          expect(deletedEvent?.isDeleted).toBe(true);

          await cleanupTestData(familyId, createdEvent.id);
          await cleanupAuditLogs(familyId);
        } catch (error) {
          throw error;
        }
      }),
      { numRuns: 5 }
    );
  });
});

describe('Property 30: Event Audit Logging', () => {
  it('should log all event changes to audit trail', async () => {
    await fc.assert(
      fc.asyncProperty(eventDataArbitrary, async (eventData) => {
        const familyId = uuidv4();
        const familyMemberId = uuidv4();
        const userId = uuidv4();

        try {
          const createdEvent = await eventService.createEvent({
            familyId,
            familyMemberId,
            title: eventData.title,
            description: eventData.description,
            startTime: eventData.startTime,
            endTime: eventData.endTime,
            location: eventData.location,
            category: eventData.category as any,
            attendees: eventData.attendees,
            source: 'internal',
            createdBy: userId,
          });

          let logs = await auditLogger.getAuditLogs(familyId, createdEvent.id);
          expect(logs.length).toBeGreaterThan(0);
          expect(logs[0].action).toBe('created');

          await eventService.updateEvent(
            familyId,
            createdEvent.id,
            { title: 'Updated Title' },
            userId
          );

          logs = await auditLogger.getAuditLogs(familyId, createdEvent.id);
          const updateLog = logs.find(l => l.action === 'updated');
          expect(updateLog).toBeDefined();

          await eventService.deleteEvent(familyId, createdEvent.id, userId);

          logs = await auditLogger.getAuditLogs(familyId, createdEvent.id);
          const deleteLog = logs.find(l => l.action === 'deleted');
          expect(deleteLog).toBeDefined();

          await cleanupTestData(familyId, createdEvent.id);
          await cleanupAuditLogs(familyId);
        } catch (error) {
          throw error;
        }
      }),
      { numRuns: 5 }
    );
  });
});
