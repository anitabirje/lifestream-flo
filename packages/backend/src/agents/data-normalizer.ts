/**
 * Data Normalizer
 * Normalizes parsed event data into standard event format and validates/cleans extracted data
 */

import { ParsedEvent } from './event-parser-agent';

/**
 * Normalized event format
 */
export interface NormalizedEvent {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  confidence: number;
  source: string;
  rawData?: any;
}

/**
 * Normalization options
 */
export interface NormalizationOptions {
  source?: string;
  defaultDuration?: number; // minutes, default 60
  minConfidence?: number; // 0-1, default 0.5
  timezone?: string;
}

/**
 * Data Normalizer class
 * Converts parsed events into standard format with validation and cleaning
 */
export class DataNormalizer {
  private defaultDuration: number;
  private minConfidence: number;
  private timezone: string;
  private source: string;

  constructor(options: NormalizationOptions = {}) {
    this.defaultDuration = options.defaultDuration || 60;
    this.minConfidence = options.minConfidence || 0.5;
    this.timezone = options.timezone || 'UTC';
    this.source = options.source || 'unknown';
  }

  /**
   * Normalize a single parsed event
   */
  normalize(parsedEvent: ParsedEvent): NormalizedEvent | null {
    // Validate basic requirements
    if (!this.isValidParsedEvent(parsedEvent)) {
      return null;
    }

    // Check confidence threshold
    if (parsedEvent.confidence < this.minConfidence) {
      return null;
    }

    // Clean and normalize title
    const title = this.cleanTitle(parsedEvent.title);
    if (!title) {
      return null;
    }

    // Normalize times
    const { startTime, endTime } = this.normalizeTimes(parsedEvent);
    if (!startTime || !endTime) {
      return null;
    }

    // Clean description
    const description = parsedEvent.description ? this.cleanDescription(parsedEvent.description) : undefined;

    // Clean location
    const location = parsedEvent.location ? this.cleanLocation(parsedEvent.location) : undefined;

    return {
      title,
      description,
      startTime,
      endTime,
      location,
      confidence: parsedEvent.confidence,
      source: this.source,
      rawData: parsedEvent.rawText,
    };
  }

  /**
   * Normalize multiple parsed events
   */
  normalizeMultiple(parsedEvents: ParsedEvent[]): NormalizedEvent[] {
    return parsedEvents
      .map((event) => this.normalize(event))
      .filter((event): event is NormalizedEvent => event !== null);
  }

  /**
   * Validate parsed event has required fields
   */
  private isValidParsedEvent(event: ParsedEvent): boolean {
    if (!event.title || typeof event.title !== 'string') {
      return false;
    }

    if (typeof event.confidence !== 'number' || event.confidence < 0 || event.confidence > 1) {
      return false;
    }

    if (!Array.isArray(event.extractedFields)) {
      return false;
    }

    return true;
  }

  /**
   * Clean and normalize title
   */
  private cleanTitle(title: string): string {
    if (!title || typeof title !== 'string') {
      return '';
    }

    return title
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, '') // Remove leading/trailing special chars
      .substring(0, 255); // Limit length
  }

  /**
   * Clean and normalize description
   */
  private cleanDescription(description: string): string {
    if (!description || typeof description !== 'string') {
      return '';
    }

    return description
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 1000); // Limit length
  }

  /**
   * Clean and normalize location
   */
  private cleanLocation(location: string): string {
    if (!location || typeof location !== 'string') {
      return '';
    }

    return location
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 255);
  }

  /**
   * Normalize start and end times
   */
  private normalizeTimes(event: ParsedEvent): { startTime: Date | null; endTime: Date | null } {
    let startTime: Date | null = null;
    let endTime: Date | null = null;

    // Use provided times if available
    if (event.startTime && this.isValidDate(event.startTime)) {
      startTime = new Date(event.startTime);
    }

    if (event.endTime && this.isValidDate(event.endTime)) {
      endTime = new Date(event.endTime);
    }

    // If only start time is provided, calculate end time
    if (startTime && !endTime) {
      endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + this.defaultDuration);
    }

    // If only end time is provided, calculate start time
    if (!startTime && endTime) {
      startTime = new Date(endTime);
      startTime.setMinutes(startTime.getMinutes() - this.defaultDuration);
    }

    // Validate time order
    if (startTime && endTime && startTime >= endTime) {
      // Swap if in wrong order
      const temp = startTime;
      startTime = endTime;
      endTime = temp;
    }

    return { startTime, endTime };
  }

  /**
   * Check if a value is a valid date
   */
  private isValidDate(date: any): boolean {
    if (!(date instanceof Date)) {
      return false;
    }
    return !isNaN(date.getTime());
  }

  /**
   * Validate normalized event
   */
  validateNormalizedEvent(event: NormalizedEvent): boolean {
    // Check required fields
    if (!event.title || event.title.trim().length === 0) {
      return false;
    }

    if (!this.isValidDate(event.startTime) || !this.isValidDate(event.endTime)) {
      return false;
    }

    // Check time order
    if (event.startTime >= event.endTime) {
      return false;
    }

    // Check confidence
    if (event.confidence < 0 || event.confidence > 1) {
      return false;
    }

    return true;
  }

  /**
   * Validate multiple normalized events
   */
  validateNormalizedEvents(events: NormalizedEvent[]): NormalizedEvent[] {
    return events.filter((event) => this.validateNormalizedEvent(event));
  }

  /**
   * Deduplicate events based on title and time similarity
   */
  deduplicateEvents(events: NormalizedEvent[]): NormalizedEvent[] {
    const deduplicated: NormalizedEvent[] = [];
    const seen = new Set<string>();

    for (const event of events) {
      const key = this.generateEventKey(event);
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(event);
      }
    }

    return deduplicated;
  }

  /**
   * Generate a unique key for an event for deduplication
   */
  private generateEventKey(event: NormalizedEvent): string {
    const titleNorm = event.title.toLowerCase().trim();
    const dateStr = event.startTime.toISOString().split('T')[0];
    const timeStr = event.startTime.toISOString().split('T')[1].substring(0, 5);
    return `${titleNorm}|${dateStr}|${timeStr}`;
  }

  /**
   * Merge similar events (same title, overlapping times)
   */
  mergeOverlappingEvents(events: NormalizedEvent[]): NormalizedEvent[] {
    if (events.length <= 1) {
      return events;
    }

    const sorted = [...events].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    const merged: NormalizedEvent[] = [];

    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];

      // Check if events overlap or are very close
      if (this.eventsOverlap(current, next) || this.eventsAreClose(current, next)) {
        // Merge events
        current = this.mergeEvents(current, next);
      } else {
        merged.push(current);
        current = next;
      }
    }

    merged.push(current);
    return merged;
  }

  /**
   * Check if two events overlap
   */
  private eventsOverlap(event1: NormalizedEvent, event2: NormalizedEvent): boolean {
    return event1.startTime < event2.endTime && event1.endTime > event2.startTime;
  }

  /**
   * Check if two events are close in time (within 30 minutes)
   */
  private eventsAreClose(event1: NormalizedEvent, event2: NormalizedEvent): boolean {
    const gap = event2.startTime.getTime() - event1.endTime.getTime();
    return gap >= 0 && gap <= 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Merge two events into one
   */
  private mergeEvents(event1: NormalizedEvent, event2: NormalizedEvent): NormalizedEvent {
    return {
      title: event1.title, // Keep first event's title
      description: [event1.description, event2.description].filter(Boolean).join(' | '),
      startTime: new Date(Math.min(event1.startTime.getTime(), event2.startTime.getTime())),
      endTime: new Date(Math.max(event1.endTime.getTime(), event2.endTime.getTime())),
      location: event1.location || event2.location,
      confidence: Math.max(event1.confidence, event2.confidence),
      source: event1.source,
      rawData: [event1.rawData, event2.rawData].filter(Boolean).join(' | '),
    };
  }
}
