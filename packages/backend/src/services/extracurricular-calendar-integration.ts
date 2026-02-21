/**
 * Extracurricular Calendar Integration Service
 * Converts extracurricular activities into calendar events
 * and applies activity classification
 */

import { ExtracurricularActivity } from '../models/extracurricular-activity';
import { EventEntity } from '../config/schema';
import { v4 as uuidv4 } from 'uuid';

export interface CalendarEvent {
  id: string;
  familyId: string;
  familyMemberId: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  category: 'Work' | 'Family Time' | 'Health/Fitness' | 'Upskilling' | 'Relaxation';
  source: 'google' | 'outlook' | 'kids_school' | 'kids_connect' | 'extracurricular' | 'internal';
  externalId?: string;
  sourceId?: string;
  attendees?: string[];
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isDeleted: boolean;
  classifiedByAgentId?: string;
  classificationConfidence?: number;
}

/**
 * Parse schedule string to extract recurring pattern
 * Examples: "Every Monday 4-5 PM", "Tuesdays 3:30-4:30 PM"
 */
export interface SchedulePattern {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  isRecurring: boolean;
}

export class ExtracurricularCalendarIntegration {
  /**
   * Parse schedule string into structured pattern
   * This is a simplified parser - in production, you'd want more robust parsing
   */
  parseSchedule(schedule: string): SchedulePattern | null {
    // Simple pattern matching for "Every Monday 4-5 PM" format
    const dayMap: Record<string, number> = {
      sunday: 0,
      monday: 1,
      tuesday: 2,
      wednesday: 3,
      thursday: 4,
      friday: 5,
      saturday: 6,
    };

    const lowerSchedule = schedule.toLowerCase();
    
    // Find day of week
    let dayOfWeek = -1;
    for (const [day, num] of Object.entries(dayMap)) {
      if (lowerSchedule.includes(day)) {
        dayOfWeek = num;
        break;
      }
    }

    if (dayOfWeek === -1) {
      return null;
    }

    // Parse time range (e.g., "4-5 PM" or "3:30-4:30 PM")
    const timeMatch = lowerSchedule.match(/(\d{1,2}):?(\d{2})?\s*-\s*(\d{1,2}):?(\d{2})?\s*(am|pm)?/);
    if (!timeMatch) {
      return null;
    }

    let startHour = parseInt(timeMatch[1]);
    const startMinute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    let endHour = parseInt(timeMatch[3]);
    const endMinute = timeMatch[4] ? parseInt(timeMatch[4]) : 0;
    const period = timeMatch[5];

    // Convert to 24-hour format if PM
    if (period === 'pm' && startHour < 12) {
      startHour += 12;
      endHour += 12;
    }

    return {
      dayOfWeek,
      startHour,
      startMinute,
      endHour,
      endMinute,
      isRecurring: lowerSchedule.includes('every') || lowerSchedule.includes('weekly'),
    };
  }

  /**
   * Generate calendar events for an extracurricular activity
   * For recurring activities, generates events for the next N weeks
   */
  generateEventsForActivity(
    activity: ExtracurricularActivity,
    weeksAhead: number = 12
  ): CalendarEvent[] {
    const pattern = this.parseSchedule(activity.schedule);
    if (!pattern) {
      // If we can't parse the schedule, return empty array
      return [];
    }

    const events: CalendarEvent[] = [];
    const now = new Date();

    // Generate events for the next N weeks
    for (let week = 0; week < weeksAhead; week++) {
      const eventDate = new Date(now);
      
      // Calculate days until next occurrence
      const currentDay = eventDate.getDay();
      let daysUntil = pattern.dayOfWeek - currentDay;
      if (daysUntil < 0) {
        daysUntil += 7;
      }
      daysUntil += week * 7;

      eventDate.setDate(eventDate.getDate() + daysUntil);
      eventDate.setHours(pattern.startHour, pattern.startMinute, 0, 0);

      const endDate = new Date(eventDate);
      endDate.setHours(pattern.endHour, pattern.endMinute, 0, 0);

      // Classify activity based on type
      let category: CalendarEvent['category'] = 'Family Time';
      if (activity.activityType === 'sports') {
        category = 'Health/Fitness';
      } else if (activity.activityType === 'music') {
        category = 'Upskilling';
      }

      events.push({
        id: uuidv4(),
        familyId: activity.familyId,
        familyMemberId: activity.familyMemberId,
        title: activity.name,
        description: `${activity.activityType} activity - ${activity.schedule}`,
        startTime: eventDate,
        endTime: endDate,
        location: activity.location,
        category,
        source: 'extracurricular',
        sourceId: activity.id,
        attendees: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: activity.familyMemberId,
        isDeleted: false,
        classificationConfidence: 0.9, // High confidence for rule-based classification
      });
    }

    return events;
  }

  /**
   * Convert calendar event to DynamoDB EventEntity
   */
  eventToDynamoDB(event: CalendarEvent): EventEntity {
    const dateStr = event.startTime.toISOString().split('T')[0]; // YYYY-MM-DD

    return {
      PK: `FAMILY#${event.familyId}`,
      SK: `EVENT#${event.id}`,
      GSI1PK: `FAMILY#${event.familyId}#EVENTS`,
      GSI1SK: `${dateStr}#${event.id}`,
      EntityType: 'EVENT',
      id: event.id,
      familyId: event.familyId,
      familyMemberId: event.familyMemberId,
      title: event.title,
      description: event.description,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      location: event.location,
      category: event.category,
      source: event.source,
      externalId: event.externalId,
      sourceId: event.sourceId,
      attendees: event.attendees,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      isDeleted: event.isDeleted,
      classifiedByAgentId: event.classifiedByAgentId,
      classificationConfidence: event.classificationConfidence,
    };
  }

  /**
   * Convert DynamoDB EventEntity to CalendarEvent
   */
  eventFromDynamoDB(entity: EventEntity): CalendarEvent {
    return {
      id: entity.id,
      familyId: entity.familyId,
      familyMemberId: entity.familyMemberId,
      title: entity.title,
      description: entity.description,
      startTime: new Date(entity.startTime),
      endTime: new Date(entity.endTime),
      location: entity.location,
      category: entity.category,
      source: entity.source,
      externalId: entity.externalId,
      sourceId: entity.sourceId,
      attendees: entity.attendees || [],
      createdAt: new Date(entity.createdAt),
      updatedAt: new Date(entity.updatedAt),
      createdBy: entity.familyMemberId, // Assuming creator is the family member
      isDeleted: entity.isDeleted,
      classifiedByAgentId: entity.classifiedByAgentId,
      classificationConfidence: entity.classificationConfidence,
    };
  }
}
