/**
 * Context Analyzer
 * Analyzes event context for better classification
 * Considers time, location, attendees, and description
 */

import { EventForClassification } from './event-classifier-agent';
import { ActivityCategory } from '../models/activity-category';

/**
 * Context analysis result
 */
export interface ContextAnalysis {
  timeContext: TimeContext;
  locationContext: LocationContext;
  attendeeContext: AttendeeContext;
  descriptionContext: DescriptionContext;
  overallContextScore: number; // 0-1
}

/**
 * Time-based context
 */
export interface TimeContext {
  hour: number;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  isWeekend: boolean;
  isBusinessHours: boolean; // 8 AM - 6 PM
  duration: number; // hours
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

/**
 * Location-based context
 */
export interface LocationContext {
  location?: string;
  isOutdoor: boolean;
  isWork: boolean;
  isHome: boolean;
  isSchool: boolean;
  isSports: boolean;
}

/**
 * Attendee-based context
 */
export interface AttendeeContext {
  attendeeCount: number;
  hasMultipleAttendees: boolean;
  likelyFamilyEvent: boolean;
  likelyWorkEvent: boolean;
}

/**
 * Description-based context
 */
export interface DescriptionContext {
  hasDescription: boolean;
  descriptionLength: number;
  keywords: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
}

/**
 * Context Analyzer implementation
 */
export class ContextAnalyzer {
  /**
   * Analyze event context
   */
  static analyzeContext(event: EventForClassification): ContextAnalysis {
    const timeContext = this.analyzeTimeContext(event);
    const locationContext = this.analyzeLocationContext(event);
    const attendeeContext = this.analyzeAttendeeContext(event);
    const descriptionContext = this.analyzeDescriptionContext(event);

    const overallContextScore = this.calculateOverallScore(
      timeContext,
      locationContext,
      attendeeContext,
      descriptionContext
    );

    return {
      timeContext,
      locationContext,
      attendeeContext,
      descriptionContext,
      overallContextScore
    };
  }

  /**
   * Analyze time-based context
   */
  private static analyzeTimeContext(event: EventForClassification): TimeContext {
    const startTime = event.startTime;
    const endTime = event.endTime;

    const hour = startTime.getHours();
    const dayOfWeek = startTime.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isBusinessHours = hour >= 8 && hour < 18;

    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    let timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    if (hour >= 5 && hour < 12) {
      timeOfDay = 'morning';
    } else if (hour >= 12 && hour < 17) {
      timeOfDay = 'afternoon';
    } else if (hour >= 17 && hour < 21) {
      timeOfDay = 'evening';
    } else {
      timeOfDay = 'night';
    }

    return {
      hour,
      dayOfWeek,
      isWeekend,
      isBusinessHours,
      duration,
      timeOfDay
    };
  }

  /**
   * Analyze location-based context
   */
  private static analyzeLocationContext(event: EventForClassification): LocationContext {
    const location = event.location?.toLowerCase() || '';

    const outdoorKeywords = ['park', 'beach', 'outdoor', 'field', 'court', 'trail', 'garden', 'stadium'];
    const workKeywords = ['office', 'meeting', 'conference', 'workplace', 'desk', 'building'];
    const homeKeywords = ['home', 'house', 'apartment', 'residence', 'living room', 'kitchen'];
    const schoolKeywords = ['school', 'classroom', 'campus', 'university', 'college', 'library'];
    const sportsKeywords = ['gym', 'fitness', 'yoga', 'sports', 'court', 'field', 'pool', 'track'];

    const isOutdoor = outdoorKeywords.some(kw => location.includes(kw));
    const isWork = workKeywords.some(kw => location.includes(kw));
    const isHome = homeKeywords.some(kw => location.includes(kw));
    const isSchool = schoolKeywords.some(kw => location.includes(kw));
    const isSports = sportsKeywords.some(kw => location.includes(kw));

    return {
      location: event.location,
      isOutdoor,
      isWork,
      isHome,
      isSchool,
      isSports
    };
  }

  /**
   * Analyze attendee-based context
   */
  private static analyzeAttendeeContext(event: EventForClassification): AttendeeContext {
    const attendeeCount = event.attendees?.length || 0;
    const hasMultipleAttendees = attendeeCount > 1;

    // Heuristic: events with many attendees are often work or family events
    const likelyFamilyEvent = attendeeCount >= 2 && attendeeCount <= 5;
    const likelyWorkEvent = attendeeCount > 5;

    return {
      attendeeCount,
      hasMultipleAttendees,
      likelyFamilyEvent,
      likelyWorkEvent
    };
  }

  /**
   * Analyze description-based context
   */
  private static analyzeDescriptionContext(event: EventForClassification): DescriptionContext {
    const description = event.description || '';
    const hasDescription = description.length > 0;
    const descriptionLength = description.length;

    const keywords = this.extractKeywords(description);
    const sentiment = this.analyzeSentiment(description);

    return {
      hasDescription,
      descriptionLength,
      keywords,
      sentiment
    };
  }

  /**
   * Extract keywords from text
   */
  private static extractKeywords(text: string): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = [
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been'
    ];

    return words
      .filter(word => word.length > 3 && !stopWords.includes(word))
      .slice(0, 10); // Limit to top 10 keywords
  }

  /**
   * Analyze sentiment of text
   */
  private static analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['great', 'good', 'excellent', 'fun', 'enjoy', 'happy', 'amazing', 'wonderful'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'frustrated', 'difficult'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount) {
      return 'positive';
    } else if (negativeCount > positiveCount) {
      return 'negative';
    }
    return 'neutral';
  }

  /**
   * Calculate overall context score
   */
  private static calculateOverallScore(
    timeContext: TimeContext,
    locationContext: LocationContext,
    attendeeContext: AttendeeContext,
    descriptionContext: DescriptionContext
  ): number {
    let score = 0;
    let factors = 0;

    // Time context factors
    if (timeContext.isBusinessHours) score += 0.2;
    if (!timeContext.isWeekend) score += 0.1;
    if (timeContext.duration > 0.5) score += 0.1;
    factors += 3;

    // Location context factors
    if (locationContext.location) score += 0.15;
    if (locationContext.isWork) score += 0.1;
    if (locationContext.isHome) score += 0.1;
    factors += 3;

    // Attendee context factors
    if (attendeeContext.hasMultipleAttendees) score += 0.15;
    if (attendeeContext.likelyWorkEvent) score += 0.1;
    factors += 2;

    // Description context factors
    if (descriptionContext.hasDescription) score += 0.15;
    if (descriptionContext.keywords.length > 0) score += 0.1;
    factors += 2;

    return Math.min(1, score / factors);
  }

  /**
   * Get category recommendations based on context
   */
  static getContextualCategoryRecommendations(
    context: ContextAnalysis,
    categories: ActivityCategory[]
  ): ActivityCategory[] {
    const recommendations: Array<{ category: ActivityCategory; score: number }> = [];

    for (const category of categories) {
      let score = 0;

      // Work category recommendations
      if (category.name === 'Work') {
        if (context.timeContext.isBusinessHours) score += 0.3;
        if (context.locationContext.isWork) score += 0.3;
        if (context.attendeeContext.likelyWorkEvent) score += 0.2;
      }

      // Family Time recommendations
      if (category.name === 'Family Time') {
        if (context.timeContext.timeOfDay === 'evening') score += 0.2;
        if (context.timeContext.isWeekend) score += 0.2;
        if (context.locationContext.isHome) score += 0.2;
        if (context.attendeeContext.likelyFamilyEvent) score += 0.3;
      }

      // Health/Fitness recommendations
      if (category.name === 'Health/Fitness') {
        if (context.locationContext.isSports) score += 0.4;
        if (context.timeContext.timeOfDay === 'morning' || context.timeContext.timeOfDay === 'evening') {
          score += 0.2;
        }
      }

      // Upskilling recommendations
      if (category.name === 'Upskilling') {
        if (context.descriptionContext.hasDescription) score += 0.2;
        if (context.timeContext.duration >= 1) score += 0.2;
        if (context.locationContext.isSchool) score += 0.3;
      }

      // Relaxation recommendations
      if (category.name === 'Relaxation') {
        if (context.timeContext.timeOfDay === 'evening' || context.timeContext.timeOfDay === 'night') {
          score += 0.2;
        }
        if (context.descriptionContext.sentiment === 'positive') score += 0.2;
      }

      if (score > 0) {
        recommendations.push({ category, score });
      }
    }

    // Sort by score descending
    return recommendations
      .sort((a, b) => b.score - a.score)
      .map(r => r.category);
  }
}
