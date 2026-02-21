/**
 * Calendar Query Agent Base Class
 * Base implementation for AI-powered calendar query agents
 * Provides common authentication and error handling
 */

import { IAgent, AgentTask, AgentResult, AgentStatus } from './types';
import { v4 as uuidv4 } from 'uuid';

/**
 * External event structure from calendar sources
 */
export interface ExternalEvent {
  sourceId: string;
  externalId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
  source: 'google' | 'outlook' | 'kids_school' | 'kids_connect' | 'extracurricular';
  rawData?: any;
}

/**
 * Calendar query parameters
 */
export interface CalendarQuery {
  startDate: Date;
  endDate: Date;
  filters?: {
    keywords?: string[];
    attendees?: string[];
    categories?: string[];
  };
  maxResults?: number;
}

/**
 * Authentication credentials for calendar sources
 */
export interface AuthCredentials {
  type: 'oauth' | 'basic' | 'api_key';
  accessToken?: string;
  refreshToken?: string;
  username?: string;
  password?: string;
  apiKey?: string;
  expiresAt?: Date;
}

/**
 * Authentication token result
 */
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
}

/**
 * Event data for creating/updating events
 */
export interface EventData {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  attendees?: string[];
}

/**
 * Calendar query agent interface
 */
export interface ICalendarQueryAgent extends IAgent {
  sourceType: 'google' | 'outlook' | 'kids_school' | 'kids_connect' | 'extracurricular';
  
  /**
   * Authenticate with the calendar source
   */
  authenticate(credentials: AuthCredentials): Promise<AuthToken>;
  
  /**
   * Query events from the calendar source
   */
  queryEvents(query: CalendarQuery): Promise<ExternalEvent[]>;
  
  /**
   * Create a new event in the calendar source
   */
  createEvent(event: EventData): Promise<string>;
  
  /**
   * Update an existing event in the calendar source
   */
  updateEvent(eventId: string, event: EventData): Promise<void>;
  
  /**
   * Delete an event from the calendar source
   */
  deleteEvent(eventId: string): Promise<void>;
}

/**
 * Base Calendar Query Agent implementation
 * Provides common functionality for all calendar query agents
 */
export abstract class BaseCalendarQueryAgent implements ICalendarQueryAgent {
  public readonly id: string;
  public readonly type: 'calendar_query' = 'calendar_query';
  public abstract readonly sourceType: 'google' | 'outlook' | 'kids_school' | 'kids_connect' | 'extracurricular';
  public readonly capabilities: string[];
  public status: AgentStatus;
  
  protected authToken?: AuthToken;
  protected credentials?: AuthCredentials;

  constructor(id?: string, capabilities: string[] = []) {
    this.id = id || `calendar-query-agent-${uuidv4()}`;
    this.capabilities = [
      'query_calendar',
      'create_event',
      'update_event',
      'delete_event',
      ...capabilities
    ];
    this.status = 'idle';
  }

  /**
   * Execute a calendar query task
   */
  async execute(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    this.status = 'busy';

    try {
      if (task.type !== 'query_calendar') {
        throw new Error(`Unsupported task type: ${task.type}`);
      }

      const query = task.payload as CalendarQuery;
      const events = await this.queryEvents(query);

      this.status = 'idle';
      const executionTime = Math.max(1, Date.now() - startTime);
      return {
        taskId: task.id,
        agentId: this.id,
        status: 'success',
        data: events,
        executionTime,
        completedAt: new Date()
      };
    } catch (error) {
      this.status = 'failed';
      const executionTime = Math.max(1, Date.now() - startTime);
      return {
        taskId: task.id,
        agentId: this.id,
        status: 'failed',
        data: null,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        executionTime,
        completedAt: new Date()
      };
    }
  }

  /**
   * Health check for the calendar query agent
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Check if agent is responsive and authenticated
      if (this.status === 'offline') {
        return false;
      }
      
      // Check if authentication is still valid
      if (this.authToken && this.authToken.expiresAt < new Date()) {
        // Token expired, mark as failed
        this.status = 'failed';
        return false;
      }
      
      return true;
    } catch {
      this.status = 'offline';
      return false;
    }
  }

  /**
   * Check if authentication is valid
   */
  protected isAuthenticated(): boolean {
    if (!this.authToken) {
      return false;
    }
    return this.authToken.expiresAt > new Date();
  }

  /**
   * Handle authentication errors with retry logic
   */
  protected async handleAuthError(error: Error): Promise<void> {
    console.error(`Authentication error for ${this.sourceType}: ${error.message}`);
    
    // Try to re-authenticate if credentials are available
    if (this.credentials) {
      try {
        await this.authenticate(this.credentials);
      } catch (retryError) {
        this.status = 'failed';
        throw new Error(`Failed to re-authenticate: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
      }
    } else {
      this.status = 'failed';
      throw new Error('Authentication failed and no credentials available for retry');
    }
  }

  /**
   * Handle API errors with appropriate error messages
   */
  protected handleAPIError(error: Error, operation: string): never {
    console.error(`API error during ${operation} for ${this.sourceType}: ${error.message}`);
    this.status = 'failed';
    throw new Error(`Failed to ${operation}: ${error.message}`);
  }

  // Abstract methods to be implemented by specific calendar agents
  abstract authenticate(credentials: AuthCredentials): Promise<AuthToken>;
  abstract queryEvents(query: CalendarQuery): Promise<ExternalEvent[]>;
  abstract createEvent(event: EventData): Promise<string>;
  abstract updateEvent(eventId: string, event: EventData): Promise<void>;
  abstract deleteEvent(eventId: string): Promise<void>;
}
