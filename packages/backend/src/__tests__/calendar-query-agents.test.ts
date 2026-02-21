/**
 * Property-based tests for calendar query agents
 * Property 1: Multi-Source Event Retrieval
 * Validates: Requirements 1.1, 1.2, 1.4
 * 
 * Feature: flo-family-calendar
 */

import * as fc from 'fast-check';
import { 
  GoogleCalendarQueryAgent,
  OutlookCalendarQueryAgent,
  SchoolAppQueryAgent
} from '../agents';
import {
  CalendarQuery,
  AuthCredentials,
  ExternalEvent
} from '../agents/calendar-query-agent';

describe('Property 1: Multi-Source Event Retrieval', () => {
  /**
   * **Validates: Requirement 1.1**
   * 
   * Property: Google Calendar agent should authenticate and query events successfully
   */
  it('should authenticate with Google Calendar and execute query tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 50 }), // access token
        fc.integer({ min: 1, max: 7 }), // days range
        async (accessToken, days) => {
          const agent = new GoogleCalendarQueryAgent();
          
          // Authenticate
          const credentials: AuthCredentials = {
            type: 'oauth',
            accessToken,
            refreshToken: 'refresh-token',
            expiresAt: new Date(Date.now() + 3600 * 1000)
          };
          
          const authToken = await agent.authenticate(credentials);
          
          // Verify authentication
          expect(authToken).toBeDefined();
          expect(authToken.accessToken).toBe(accessToken);
          expect(authToken.tokenType).toBe('Bearer');
          expect(authToken.expiresAt).toBeInstanceOf(Date);
          expect(agent.status).toBe('idle');
          
          // Create query
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + days);
          
          const query: CalendarQuery = {
            startDate,
            endDate,
            maxResults: 100
          };
          
          // Execute query task
          const task = {
            id: `task-google-${Date.now()}`,
            type: 'query_calendar' as const,
            priority: 'medium' as const,
            payload: query,
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: 3
          };
          
          const result = await agent.execute(task);
          
          // Verify result
          expect(result.taskId).toBe(task.id);
          expect(result.agentId).toBe(agent.id);
          expect(result.status).toBe('success');
          expect(result.data).toBeDefined();
          expect(Array.isArray(result.data)).toBe(true);
          expect(result.executionTime).toBeGreaterThan(0);
          expect(result.completedAt).toBeInstanceOf(Date);
          
          // Verify agent capabilities
          expect(agent.capabilities).toContain('query_calendar');
          expect(agent.capabilities).toContain('google_calendar');
          expect(agent.capabilities).toContain('oauth2');
          expect(agent.sourceType).toBe('google');
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * **Validates: Requirement 1.2**
   * 
   * Property: Outlook Calendar agent should authenticate and query events successfully
   */
  it('should authenticate with Outlook Calendar and execute query tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 10, maxLength: 50 }), // access token
        fc.integer({ min: 1, max: 7 }), // days range
        async (accessToken, days) => {
          const agent = new OutlookCalendarQueryAgent();
          
          // Authenticate
          const credentials: AuthCredentials = {
            type: 'oauth',
            accessToken,
            refreshToken: 'refresh-token',
            expiresAt: new Date(Date.now() + 3600 * 1000)
          };
          
          const authToken = await agent.authenticate(credentials);
          
          // Verify authentication
          expect(authToken).toBeDefined();
          expect(authToken.accessToken).toBe(accessToken);
          expect(authToken.tokenType).toBe('Bearer');
          expect(authToken.expiresAt).toBeInstanceOf(Date);
          expect(agent.status).toBe('idle');
          
          // Create query
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + days);
          
          const query: CalendarQuery = {
            startDate,
            endDate,
            maxResults: 100
          };
          
          // Execute query task
          const task = {
            id: `task-outlook-${Date.now()}`,
            type: 'query_calendar' as const,
            priority: 'medium' as const,
            payload: query,
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: 3
          };
          
          const result = await agent.execute(task);
          
          // Verify result
          expect(result.taskId).toBe(task.id);
          expect(result.agentId).toBe(agent.id);
          expect(result.status).toBe('success');
          expect(result.data).toBeDefined();
          expect(Array.isArray(result.data)).toBe(true);
          expect(result.executionTime).toBeGreaterThan(0);
          expect(result.completedAt).toBeInstanceOf(Date);
          
          // Verify agent capabilities
          expect(agent.capabilities).toContain('query_calendar');
          expect(agent.capabilities).toContain('outlook_calendar');
          expect(agent.capabilities).toContain('microsoft_graph');
          expect(agent.capabilities).toContain('oauth2');
          expect(agent.sourceType).toBe('outlook');
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * **Validates: Requirement 1.4**
   * 
   * Property: School App agent should authenticate and parse teacher messages to extract events
   */
  it('should authenticate with school apps and execute query tasks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 5, maxLength: 20 }), // username
        fc.string({ minLength: 8, maxLength: 20 }), // password
        fc.integer({ min: 1, max: 7 }), // days range
        async (username, password, days) => {
          const agent = new SchoolAppQueryAgent();
          
          // Authenticate with basic auth
          const credentials: AuthCredentials = {
            type: 'basic',
            username,
            password
          };
          
          const authToken = await agent.authenticate(credentials);
          
          // Verify authentication
          expect(authToken).toBeDefined();
          expect(authToken.accessToken).toBeDefined();
          expect(authToken.tokenType).toBe('Basic');
          expect(authToken.expiresAt).toBeInstanceOf(Date);
          expect(agent.status).toBe('idle');
          
          // Create query
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + days);
          
          const query: CalendarQuery = {
            startDate,
            endDate,
            maxResults: 50
          };
          
          // Execute query task
          const task = {
            id: `task-school-${Date.now()}`,
            type: 'query_calendar' as const,
            priority: 'medium' as const,
            payload: query,
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: 3
          };
          
          const result = await agent.execute(task);
          
          // Verify result
          expect(result.taskId).toBe(task.id);
          expect(result.agentId).toBe(agent.id);
          expect(result.status).toBe('success');
          expect(result.data).toBeDefined();
          expect(Array.isArray(result.data)).toBe(true);
          expect(result.executionTime).toBeGreaterThan(0);
          expect(result.completedAt).toBeInstanceOf(Date);
          
          // Verify agent capabilities
          expect(agent.capabilities).toContain('query_calendar');
          expect(agent.capabilities).toContain('school_app');
          expect(agent.capabilities).toContain('natural_language_parsing');
          expect(agent.capabilities).toContain('event_extraction');
          expect(agent.sourceType).toBe('kids_school');
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * **Validates: Requirement 1.4**
   * 
   * Property: School App agent should support API key authentication
   */
  it('should authenticate with school apps using API key', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 20, maxLength: 50 }), // API key
        async (apiKey) => {
          const agent = new SchoolAppQueryAgent();
          
          // Authenticate with API key
          const credentials: AuthCredentials = {
            type: 'api_key',
            apiKey
          };
          
          const authToken = await agent.authenticate(credentials);
          
          // Verify authentication
          expect(authToken).toBeDefined();
          expect(authToken.accessToken).toBe(apiKey);
          expect(authToken.tokenType).toBe('ApiKey');
          expect(authToken.expiresAt).toBeInstanceOf(Date);
          expect(agent.status).toBe('idle');
          
          // Verify token has longer expiry (30 days for API keys)
          const expiryDays = Math.floor(
            (authToken.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          );
          expect(expiryDays).toBeGreaterThanOrEqual(25); // Allow some tolerance
          expect(expiryDays).toBeLessThanOrEqual(31);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * **Validates: Requirements 1.1, 1.2, 1.4**
   * 
   * Property: All calendar agents should pass health checks when authenticated
   */
  it('should pass health checks for all calendar agent types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('google', 'outlook', 'school'),
        async (agentType) => {
          let agent;
          let credentials: AuthCredentials;
          
          if (agentType === 'google') {
            agent = new GoogleCalendarQueryAgent();
            credentials = {
              type: 'oauth',
              accessToken: 'test-token',
              expiresAt: new Date(Date.now() + 3600 * 1000)
            };
          } else if (agentType === 'outlook') {
            agent = new OutlookCalendarQueryAgent();
            credentials = {
              type: 'oauth',
              accessToken: 'test-token',
              expiresAt: new Date(Date.now() + 3600 * 1000)
            };
          } else {
            agent = new SchoolAppQueryAgent();
            credentials = {
              type: 'basic',
              username: 'testuser',
              password: 'testpass'
            };
          }
          
          // Authenticate
          await agent.authenticate(credentials);
          
          // Health check should pass
          const isHealthy = await agent.healthCheck();
          expect(isHealthy).toBe(true);
          expect(agent.status).not.toBe('offline');
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirements 1.1, 1.2, 1.4**
   * 
   * Property: Calendar agents should handle expired tokens correctly
   */
  it('should detect expired tokens during health checks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('google', 'outlook'),
        async (agentType) => {
          let agent;
          
          if (agentType === 'google') {
            agent = new GoogleCalendarQueryAgent();
          } else {
            agent = new OutlookCalendarQueryAgent();
          }
          
          // Authenticate with expired token
          const credentials: AuthCredentials = {
            type: 'oauth',
            accessToken: 'expired-token',
            expiresAt: new Date(Date.now() - 1000) // Already expired
          };
          
          await agent.authenticate(credentials);
          
          // Health check should fail due to expired token
          const isHealthy = await agent.healthCheck();
          expect(isHealthy).toBe(false);
          expect(agent.status).toBe('failed');
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * **Validates: Requirements 1.1, 1.2**
   * 
   * Property: Calendar agents should reject queries when not authenticated
   */
  it('should reject queries when not authenticated', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('google', 'outlook', 'school'),
        async (agentType) => {
          let agent;
          
          if (agentType === 'google') {
            agent = new GoogleCalendarQueryAgent();
          } else if (agentType === 'outlook') {
            agent = new OutlookCalendarQueryAgent();
          } else {
            agent = new SchoolAppQueryAgent();
          }
          
          // Try to query without authentication
          const query: CalendarQuery = {
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            maxResults: 100
          };
          
          // Should throw error
          await expect(agent.queryEvents(query)).rejects.toThrow();
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * **Validates: Requirements 1.1, 1.2, 1.4**
   * 
   * Property: Calendar agents should have correct type and capabilities
   */
  it('should have correct agent type and capabilities for each source', async () => {
    const googleAgent = new GoogleCalendarQueryAgent();
    expect(googleAgent.type).toBe('calendar_query');
    expect(googleAgent.sourceType).toBe('google');
    expect(googleAgent.capabilities).toContain('query_calendar');
    expect(googleAgent.capabilities).toContain('create_event');
    expect(googleAgent.capabilities).toContain('update_event');
    expect(googleAgent.capabilities).toContain('delete_event');
    
    const outlookAgent = new OutlookCalendarQueryAgent();
    expect(outlookAgent.type).toBe('calendar_query');
    expect(outlookAgent.sourceType).toBe('outlook');
    expect(outlookAgent.capabilities).toContain('query_calendar');
    expect(outlookAgent.capabilities).toContain('microsoft_graph');
    
    const schoolAgent = new SchoolAppQueryAgent();
    expect(schoolAgent.type).toBe('calendar_query');
    expect(schoolAgent.sourceType).toBe('kids_school');
    expect(schoolAgent.capabilities).toContain('query_calendar');
    expect(schoolAgent.capabilities).toContain('natural_language_parsing');
    expect(schoolAgent.capabilities).toContain('event_extraction');
  });

  /**
   * **Validates: Requirement 1.4**
   * 
   * Property: School App agent should not support write operations (read-only)
   */
  it('should reject write operations for school app agents', async () => {
    const agent = new SchoolAppQueryAgent();
    
    // Authenticate
    const credentials: AuthCredentials = {
      type: 'basic',
      username: 'testuser',
      password: 'testpass'
    };
    await agent.authenticate(credentials);
    
    // Try to create event - should throw
    const eventData = {
      title: 'Test Event',
      startTime: new Date(),
      endTime: new Date(Date.now() + 3600 * 1000)
    };
    
    await expect(agent.createEvent(eventData)).rejects.toThrow('not supported');
    
    // Try to update event - should throw
    await expect(agent.updateEvent('event-1', eventData)).rejects.toThrow('not supported');
    
    // Try to delete event - should throw
    await expect(agent.deleteEvent('event-1')).rejects.toThrow('not supported');
  });

  /**
   * **Validates: Requirements 1.1, 1.2**
   * 
   * Property: Google and Outlook agents should support CRUD operations
   */
  it('should support create, update, and delete operations for Google and Outlook', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom('google', 'outlook'),
        fc.string({ minLength: 5, maxLength: 50 }), // event title
        async (agentType, eventTitle) => {
          let agent;
          
          if (agentType === 'google') {
            agent = new GoogleCalendarQueryAgent();
          } else {
            agent = new OutlookCalendarQueryAgent();
          }
          
          // Authenticate
          const credentials: AuthCredentials = {
            type: 'oauth',
            accessToken: 'test-token',
            expiresAt: new Date(Date.now() + 3600 * 1000)
          };
          await agent.authenticate(credentials);
          
          // Create event
          const eventData = {
            title: eventTitle,
            startTime: new Date(),
            endTime: new Date(Date.now() + 3600 * 1000),
            location: 'Test Location'
          };
          
          const eventId = await agent.createEvent(eventData);
          expect(eventId).toBeDefined();
          expect(typeof eventId).toBe('string');
          expect(eventId.length).toBeGreaterThan(0);
          
          // Update event
          await expect(agent.updateEvent(eventId, {
            ...eventData,
            title: `${eventTitle} - Updated`
          })).resolves.not.toThrow();
          
          // Delete event
          await expect(agent.deleteEvent(eventId)).resolves.not.toThrow();
        }
      ),
      { numRuns: 15 }
    );
  });
});
