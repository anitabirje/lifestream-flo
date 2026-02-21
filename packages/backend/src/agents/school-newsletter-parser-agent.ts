/**
 * School Newsletter Parser Agent
 * AI-powered parsing of school newsletter emails to extract event details
 */

import { EventParserAgent, ParsedEvent, EventDetails } from './event-parser-agent';

/**
 * School newsletter parser agent
 * Specializes in parsing school newsletter emails and extracting event information
 */
export class SchoolNewsletterParserAgent extends EventParserAgent {
  constructor(id: string = 'school-newsletter-parser') {
    super(id, 'email', ['parse_school_newsletter', 'extract_homework_dates', 'extract_form_deadlines']);
  }

  /**
   * Parse school newsletter email content
   */
  async parse(rawData: string | Buffer): Promise<ParsedEvent[]> {
    const text = typeof rawData === 'string' ? rawData : rawData.toString('utf-8');
    
    if (!text || text.trim().length === 0) {
      return [];
    }

    const parsedEvents: ParsedEvent[] = [];

    // Extract homework due dates
    const homeworkEvents = this.extractHomeworkEvents(text);
    parsedEvents.push(...homeworkEvents);

    // Extract form return dates
    const formEvents = this.extractFormReturnEvents(text);
    parsedEvents.push(...formEvents);

    // Extract event booking deadlines
    const bookingEvents = this.extractEventBookingDeadlines(text);
    parsedEvents.push(...bookingEvents);

    // Extract general events mentioned in newsletter
    const generalEvents = this.extractGeneralEvents(text);
    parsedEvents.push(...generalEvents);

    return parsedEvents;
  }

  /**
   * Extract event details from newsletter text
   */
  async extractEventDetails(text: string): Promise<EventDetails> {
    return {
      dates: this.extractDatesFromText(text),
      times: this.extractTimesFromText(text),
      locations: this.extractLocationsFromText(text),
      participants: this.extractParticipantsFromText(text),
      keywords: this.extractKeywordsFromText(text),
    };
  }

  /**
   * Extract homework due date events
   */
  private extractHomeworkEvents(text: string): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    
    // Patterns for homework mentions
    const homeworkPatterns = [
      /homework\s+(?:due|due date|deadline):\s*([^\n]+)/gi,
      /(?:due|due date|deadline).*?homework[:\s]+([^\n]+)/gi,
      /([A-Za-z\s]+)\s+homework\s+(?:due|due date):\s*([^\n]+)/gi,
    ];

    for (const pattern of homeworkPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const details = match[1] || match[2] || '';

        // Extract date from details
        const dates = this.extractDatesFromText(details);
        if (dates.length > 0) {
          events.push({
            title: `Homework: ${details.substring(0, 50)}`,
            description: fullMatch,
            startTime: dates[0],
            endTime: dates[0],
            confidence: 0.8,
            extractedFields: ['title', 'startTime', 'endTime'],
            rawText: fullMatch,
          });
        }
      }
    }

    return events;
  }

  /**
   * Extract form return date events
   */
  private extractFormReturnEvents(text: string): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    
    // Patterns for form mentions
    const formPatterns = [
      /form\s+(?:return|due|due date|deadline):\s*([^\n]+)/gi,
      /(?:return|submit)\s+(?:the\s+)?form\s+(?:by|on|before):\s*([^\n]+)/gi,
      /([A-Za-z\s]+)\s+form\s+(?:return|due):\s*([^\n]+)/gi,
    ];

    for (const pattern of formPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const details = match[1] || match[2] || '';

        // Extract date from details
        const dates = this.extractDatesFromText(details);
        if (dates.length > 0) {
          events.push({
            title: `Form Return: ${details.substring(0, 50)}`,
            description: fullMatch,
            startTime: dates[0],
            endTime: dates[0],
            confidence: 0.8,
            extractedFields: ['title', 'startTime', 'endTime'],
            rawText: fullMatch,
          });
        }
      }
    }

    return events;
  }

  /**
   * Extract event booking deadline events
   */
  private extractEventBookingDeadlines(text: string): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    
    // Patterns for event booking deadlines
    const bookingPatterns = [
      /(?:booking|registration|sign-up|signup)\s+(?:deadline|closes|due):\s*([^\n]+)/gi,
      /(?:book|register|sign up)\s+(?:by|before|on):\s*([^\n]+)/gi,
      /([A-Za-z\s]+)\s+(?:booking|registration)\s+(?:deadline|closes):\s*([^\n]+)/gi,
    ];

    for (const pattern of bookingPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const details = match[1] || match[2] || '';

        // Extract date from details
        const dates = this.extractDatesFromText(details);
        if (dates.length > 0) {
          events.push({
            title: `Event Booking Deadline: ${details.substring(0, 50)}`,
            description: fullMatch,
            startTime: dates[0],
            endTime: dates[0],
            confidence: 0.75,
            extractedFields: ['title', 'startTime', 'endTime'],
            rawText: fullMatch,
          });
        }
      }
    }

    return events;
  }

  /**
   * Extract general events mentioned in newsletter
   */
  private extractGeneralEvents(text: string): ParsedEvent[] {
    const events: ParsedEvent[] = [];
    
    // Patterns for general events
    const eventPatterns = [
      /(?:event|activity|excursion|trip|camp|workshop):\s*([^\n]+)/gi,
      /([A-Za-z\s]+)\s+(?:event|activity)\s+(?:on|at):\s*([^\n]+)/gi,
    ];

    for (const pattern of eventPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const fullMatch = match[0];
        const title = match[1] || match[2] || '';
        const details = match[2] || match[1] || '';

        // Extract dates and times
        const dates = this.extractDatesFromText(details);
        const times = this.extractTimesFromText(details);

        if (dates.length > 0) {
          const startTime = dates[0];
          let endTime = dates[1] || dates[0];

          // If we have times, try to adjust end time
          if (times.length > 1) {
            const endTimeStr = times[1];
            const [hours, minutes] = endTimeStr.split(':').map(Number);
            endTime = new Date(startTime);
            endTime.setHours(hours, minutes);
          }

          events.push({
            title: title.substring(0, 100),
            description: fullMatch,
            startTime,
            endTime,
            location: this.extractLocationsFromText(details)[0],
            confidence: 0.7,
            extractedFields: ['title', 'startTime', 'endTime', ...(this.extractLocationsFromText(details).length > 0 ? ['location'] : [])],
            rawText: fullMatch,
          });
        }
      }
    }

    return events;
  }

  /**
   * Extract participants from text
   */
  private extractParticipantsFromText(text: string): string[] {
    const participants: string[] = [];
    
    // Look for common participant indicators
    const participantPatterns = [
      /(?:for|with|involving|participants?):\s*([^,\n]+(?:,\s*[^,\n]+)*)/gi,
      /(?:class|grade|year|group):\s*([^,\n]+)/gi,
    ];

    for (const pattern of participantPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const participantStr = match[1]?.trim();
        if (participantStr) {
          const parts = participantStr.split(',').map((p) => p.trim());
          participants.push(...parts);
        }
      }
    }

    return [...new Set(participants)]; // Remove duplicates
  }
}
