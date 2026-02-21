/**
 * Weather-Event Associator
 * Associates weather data with calendar events based on date, time, and location
 * Stores associations in DynamoDB with TTL
 */

import { WeatherAgent, WeatherData } from './weather-agent';

/**
 * Calendar event interface (simplified for weather association)
 */
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  familyMemberId: string;
}

/**
 * Weather-Event association
 */
export interface WeatherEventAssociation {
  eventId: string;
  weatherData: WeatherData;
  associatedAt: Date;
  ttl: number; // Unix timestamp for DynamoDB TTL (90 days)
}

/**
 * Association result
 */
export interface AssociationResult {
  eventId: string;
  success: boolean;
  weatherData?: WeatherData;
  error?: string;
}

/**
 * Weather-Event Associator Service
 * Matches weather data to events and stores associations
 */
export class WeatherEventAssociator {
  private weatherAgent: WeatherAgent;
  private associations: Map<string, WeatherEventAssociation>;
  private defaultLocation: string;
  private ttlDays: number = 90; // 90 days retention

  constructor(weatherAgent: WeatherAgent, defaultLocation: string = 'Sydney, Australia') {
    this.weatherAgent = weatherAgent;
    this.defaultLocation = defaultLocation;
    this.associations = new Map();
  }

  /**
   * Associate weather data with a single event
   */
  async associateWeatherWithEvent(event: CalendarEvent): Promise<AssociationResult> {
    try {
      // Extract location from event or use default
      const location = event.location || this.defaultLocation;

      // Get weather data for the event date
      const weatherData = await this.weatherAgent.getWeatherForDate(location, event.startTime);

      if (!weatherData) {
        return {
          eventId: event.id,
          success: false,
          error: 'No weather data available for event date'
        };
      }

      // Create association
      const association: WeatherEventAssociation = {
        eventId: event.id,
        weatherData,
        associatedAt: new Date(),
        ttl: this.calculateTTL()
      };

      // Store in memory cache
      this.associations.set(event.id, association);

      return {
        eventId: event.id,
        success: true,
        weatherData
      };
    } catch (error) {
      return {
        eventId: event.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Associate weather data with multiple events
   */
  async associateWeatherWithEvents(events: CalendarEvent[]): Promise<AssociationResult[]> {
    const results: AssociationResult[] = [];

    // Group events by date and location for efficient fetching
    const eventsByDateLocation = this.groupEventsByDateLocation(events);

    for (const [key, eventGroup] of eventsByDateLocation.entries()) {
      const [dateStr, location] = key.split('|');
      const date = new Date(dateStr);

      try {
        // Fetch weather data once for all events on same date/location
        const weatherData = await this.weatherAgent.getWeatherForDate(location, date);

        if (!weatherData) {
          // Add failed results for all events in group
          for (const event of eventGroup) {
            results.push({
              eventId: event.id,
              success: false,
              error: 'No weather data available'
            });
          }
          continue;
        }

        // Associate weather with all events in group
        for (const event of eventGroup) {
          const association: WeatherEventAssociation = {
            eventId: event.id,
            weatherData,
            associatedAt: new Date(),
            ttl: this.calculateTTL()
          };

          this.associations.set(event.id, association);

          results.push({
            eventId: event.id,
            success: true,
            weatherData
          });
        }
      } catch (error) {
        // Add failed results for all events in group
        for (const event of eventGroup) {
          results.push({
            eventId: event.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    return results;
  }

  /**
   * Get weather association for an event
   */
  getWeatherForEvent(eventId: string): WeatherEventAssociation | undefined {
    return this.associations.get(eventId);
  }

  /**
   * Check if event has weather association
   */
  hasWeatherAssociation(eventId: string): boolean {
    return this.associations.has(eventId);
  }

  /**
   * Remove weather association for an event
   */
  removeAssociation(eventId: string): boolean {
    return this.associations.delete(eventId);
  }

  /**
   * Get all associations
   */
  getAllAssociations(): WeatherEventAssociation[] {
    return Array.from(this.associations.values());
  }

  /**
   * Clear all associations
   */
  clearAssociations(): void {
    this.associations.clear();
  }

  /**
   * Get associations count
   */
  getAssociationsCount(): number {
    return this.associations.size;
  }

  /**
   * Group events by date and location for efficient batch processing
   */
  private groupEventsByDateLocation(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
    const groups = new Map<string, CalendarEvent[]>();

    for (const event of events) {
      const dateStr = this.formatDate(event.startTime);
      const location = event.location || this.defaultLocation;
      const key = `${dateStr}|${location}`;

      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(event);
    }

    return groups;
  }

  /**
   * Calculate TTL timestamp (90 days from now)
   */
  private calculateTTL(): number {
    const now = Date.now();
    const ttlMs = this.ttlDays * 24 * 60 * 60 * 1000;
    return Math.floor((now + ttlMs) / 1000); // Unix timestamp in seconds
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Persist associations to DynamoDB
   * This would be implemented with actual DynamoDB client
   */
  async persistAssociations(): Promise<void> {
    // Placeholder for DynamoDB persistence
    // In production, this would batch write associations to DynamoDB
    // with TTL attribute set for automatic expiration
    console.log(`Persisting ${this.associations.size} weather-event associations to DynamoDB`);
  }

  /**
   * Load associations from DynamoDB
   * This would be implemented with actual DynamoDB client
   */
  async loadAssociations(eventIds: string[]): Promise<void> {
    // Placeholder for DynamoDB loading
    // In production, this would batch read associations from DynamoDB
    console.log(`Loading weather-event associations for ${eventIds.length} events from DynamoDB`);
  }
}
