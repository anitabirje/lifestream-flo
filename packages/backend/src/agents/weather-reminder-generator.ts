/**
 * Weather Reminder Generator
 * Generates contextual weather reminders for outdoor events
 * - Umbrella reminders for rainy outdoor events
 * - Sunscreen reminders for high UV outdoor events
 */

import { WeatherData } from './weather-agent';
import { CalendarEvent, WeatherEventAssociation } from './weather-event-associator';

/**
 * Weather reminder types
 */
export type ReminderType = 'umbrella' | 'sunscreen' | 'general';

/**
 * Weather reminder
 */
export interface WeatherReminder {
  id: string;
  eventId: string;
  type: ReminderType;
  message: string;
  priority: 'low' | 'medium' | 'high';
  weatherData: WeatherData;
  createdAt: Date;
}

/**
 * Reminder generation rules
 */
export interface ReminderRules {
  rainThreshold: number; // Precipitation chance % to trigger umbrella reminder
  uvThreshold: number; // UV index to trigger sunscreen reminder
  outdoorKeywords: string[]; // Keywords to identify outdoor events
}

/**
 * Weather Reminder Generator
 * Analyzes weather-event associations and generates contextual reminders
 */
export class WeatherReminderGenerator {
  private rules: ReminderRules;

  constructor(rules?: Partial<ReminderRules>) {
    this.rules = {
      rainThreshold: rules?.rainThreshold || 50, // 50% chance of rain
      uvThreshold: rules?.uvThreshold || 6, // UV index 6 or higher
      outdoorKeywords: rules?.outdoorKeywords || [
        'outdoor', 'outside', 'park', 'beach', 'playground', 'sports',
        'soccer', 'football', 'cricket', 'tennis', 'picnic', 'bbq',
        'barbecue', 'hiking', 'walk', 'run', 'cycling', 'bike',
        'swimming', 'pool', 'garden', 'yard', 'field'
      ]
    };
  }

  /**
   * Generate reminders for an event with weather association
   */
  generateReminders(event: CalendarEvent, association: WeatherEventAssociation): WeatherReminder[] {
    const reminders: WeatherReminder[] = [];

    // Check if event is outdoor
    if (!this.isOutdoorEvent(event)) {
      return reminders;
    }

    const weatherData = association.weatherData;

    // Check for rain reminder
    if (this.shouldGenerateUmbrellaReminder(weatherData)) {
      reminders.push(this.createUmbrellaReminder(event, weatherData));
    }

    // Check for sunscreen reminder
    if (this.shouldGenerateSunscreenReminder(weatherData)) {
      reminders.push(this.createSunscreenReminder(event, weatherData));
    }

    return reminders;
  }

  /**
   * Generate reminders for multiple events
   */
  generateRemindersForEvents(
    events: CalendarEvent[],
    associations: Map<string, WeatherEventAssociation>
  ): WeatherReminder[] {
    const allReminders: WeatherReminder[] = [];

    for (const event of events) {
      const association = associations.get(event.id);
      if (association) {
        const reminders = this.generateReminders(event, association);
        allReminders.push(...reminders);
      }
    }

    return allReminders;
  }

  /**
   * Check if event is outdoor based on title and location
   */
  private isOutdoorEvent(event: CalendarEvent): boolean {
    const searchText = `${event.title} ${event.location || ''}`.toLowerCase();

    return this.rules.outdoorKeywords.some(keyword =>
      searchText.includes(keyword.toLowerCase())
    );
  }

  /**
   * Check if umbrella reminder should be generated
   */
  private shouldGenerateUmbrellaReminder(weatherData: WeatherData): boolean {
    return weatherData.precipitationChance >= this.rules.rainThreshold;
  }

  /**
   * Check if sunscreen reminder should be generated
   */
  private shouldGenerateSunscreenReminder(weatherData: WeatherData): boolean {
    return weatherData.uvIndex >= this.rules.uvThreshold;
  }

  /**
   * Create umbrella reminder
   */
  private createUmbrellaReminder(event: CalendarEvent, weatherData: WeatherData): WeatherReminder {
    const priority = weatherData.precipitationChance >= 70 ? 'high' : 'medium';
    
    let message = `Don't forget your umbrella! `;
    message += `There's a ${weatherData.precipitationChance}% chance of rain for "${event.title}". `;
    message += `Weather: ${weatherData.conditions}, ${weatherData.temperature}°${weatherData.temperatureUnit}.`;

    return {
      id: `reminder-${event.id}-umbrella-${Date.now()}`,
      eventId: event.id,
      type: 'umbrella',
      message,
      priority,
      weatherData,
      createdAt: new Date()
    };
  }

  /**
   * Create sunscreen reminder
   */
  private createSunscreenReminder(event: CalendarEvent, weatherData: WeatherData): WeatherReminder {
    const priority = weatherData.uvIndex >= 8 ? 'high' : 'medium';
    
    let message = `Remember to apply sunscreen! `;
    message += `UV index is ${weatherData.uvIndex} (${this.getUVRating(weatherData.uvIndex)}) for "${event.title}". `;
    message += `Weather: ${weatherData.conditions}, ${weatherData.temperature}°${weatherData.temperatureUnit}.`;

    return {
      id: `reminder-${event.id}-sunscreen-${Date.now()}`,
      eventId: event.id,
      type: 'sunscreen',
      message,
      priority,
      weatherData,
      createdAt: new Date()
    };
  }

  /**
   * Get UV rating description
   */
  private getUVRating(uvIndex: number): string {
    if (uvIndex <= 2) return 'Low';
    if (uvIndex <= 5) return 'Moderate';
    if (uvIndex <= 7) return 'High';
    if (uvIndex <= 10) return 'Very High';
    return 'Extreme';
  }

  /**
   * Update reminder rules
   */
  updateRules(rules: Partial<ReminderRules>): void {
    this.rules = {
      ...this.rules,
      ...rules
    };
  }

  /**
   * Get current rules
   */
  getRules(): ReminderRules {
    return { ...this.rules };
  }

  /**
   * Add outdoor keyword
   */
  addOutdoorKeyword(keyword: string): void {
    if (!this.rules.outdoorKeywords.includes(keyword.toLowerCase())) {
      this.rules.outdoorKeywords.push(keyword.toLowerCase());
    }
  }

  /**
   * Remove outdoor keyword
   */
  removeOutdoorKeyword(keyword: string): boolean {
    const index = this.rules.outdoorKeywords.indexOf(keyword.toLowerCase());
    if (index > -1) {
      this.rules.outdoorKeywords.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get outdoor keywords
   */
  getOutdoorKeywords(): string[] {
    return [...this.rules.outdoorKeywords];
  }
}
