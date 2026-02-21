/**
 * Event Parser Agent
 * Base class for AI agents that extract and structure event information from various data formats
 */

import { IAgent, AgentTask, AgentResult, TaskStatus } from './types';

/**
 * Parsed event extracted from raw data
 */
export interface ParsedEvent {
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  location?: string;
  confidence: number; // 0-1, how confident the parser is
  extractedFields: string[]; // Which fields were successfully extracted
  rawText?: string;
}

/**
 * Event details extracted from text
 */
export interface EventDetails {
  dates: Date[];
  times: string[];
  locations: string[];
  participants: string[];
  keywords: string[];
}

/**
 * Event parser agent interface
 */
export interface IEventParserAgent extends IAgent {
  parseFormat: 'email' | 'html' | 'pdf' | 'text' | 'json';
  parse(rawData: string | Buffer): Promise<ParsedEvent[]>;
  extractEventDetails(text: string): Promise<EventDetails>;
  validateParsedData(event: ParsedEvent): boolean;
}

/**
 * Base EventParserAgent class
 * Provides common parsing utilities and validation for all event parser agents
 */
export class EventParserAgent implements IEventParserAgent {
  id: string;
  type: 'event_parser' = 'event_parser';
  capabilities: string[];
  status: 'idle' | 'busy' | 'failed' | 'offline' = 'idle';
  parseFormat: 'email' | 'html' | 'pdf' | 'text' | 'json';

  constructor(
    id: string,
    parseFormat: 'email' | 'html' | 'pdf' | 'text' | 'json' = 'text',
    capabilities: string[] = []
  ) {
    this.id = id;
    this.parseFormat = parseFormat;
    this.capabilities = [
      'parse_events',
      'extract_event_details',
      'validate_parsed_data',
      ...capabilities,
    ];
  }

  /**
   * Execute a parsing task
   */
  async execute(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    this.status = 'busy';

    try {
      if (task.type !== 'parse_events') {
        throw new Error(`Unsupported task type: ${task.type}`);
      }

      const { rawData } = task.payload;
      if (!rawData) {
        throw new Error('No raw data provided in task payload');
      }

      const parsedEvents = await this.parse(rawData);

      const executionTime = Date.now() - startTime;
      this.status = 'idle';

      return {
        taskId: task.id,
        agentId: this.id,
        status: 'success',
        data: { parsedEvents },
        executionTime,
        completedAt: new Date(),
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.status = 'failed';

      return {
        taskId: task.id,
        agentId: this.id,
        status: 'failed',
        data: null,
        errors: [error instanceof Error ? error.message : String(error)],
        executionTime,
        completedAt: new Date(),
      };
    }
  }

  /**
   * Parse raw data into structured events
   * Subclasses should override this method
   */
  async parse(rawData: string | Buffer): Promise<ParsedEvent[]> {
    throw new Error('parse() must be implemented by subclass');
  }

  /**
   * Extract event details from text
   * Subclasses should override this method
   */
  async extractEventDetails(text: string): Promise<EventDetails> {
    throw new Error('extractEventDetails() must be implemented by subclass');
  }

  /**
   * Validate parsed event data
   */
  validateParsedData(event: ParsedEvent): boolean {
    // Basic validation
    if (!event.title || event.title.trim().length === 0) {
      return false;
    }

    if (event.confidence < 0 || event.confidence > 1) {
      return false;
    }

    if (!Array.isArray(event.extractedFields)) {
      return false;
    }

    // If both start and end times are provided, validate they're in correct order
    if (event.startTime && event.endTime) {
      if (event.startTime >= event.endTime) {
        return false;
      }
    }

    return true;
  }

  /**
   * Health check for the agent
   */
  async healthCheck(): Promise<boolean> {
    return this.status !== 'offline' && this.status !== 'failed';
  }

  /**
   * Common utility: Extract dates from text
   */
  protected extractDatesFromText(text: string): Date[] {
    const dates: Date[] = [];
    
    // Simple date pattern matching (YYYY-MM-DD, DD/MM/YYYY, etc.)
    const datePatterns = [
      /(\d{4})-(\d{2})-(\d{2})/g, // YYYY-MM-DD
      /(\d{2})\/(\d{2})\/(\d{4})/g, // DD/MM/YYYY
      /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi, // DD Month YYYY
    ];

    for (const pattern of datePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        try {
          let date: Date | null = null;

          if (pattern.source.includes('YYYY-MM-DD')) {
            date = new Date(`${match[1]}-${match[2]}-${match[3]}`);
          } else if (pattern.source.includes('DD/MM/YYYY')) {
            date = new Date(`${match[3]}-${match[2]}-${match[1]}`);
          } else if (pattern.source.includes('Month')) {
            date = new Date(`${match[3]}-${this.monthToNumber(match[2])}-${match[1]}`);
          }

          if (date && !isNaN(date.getTime())) {
            dates.push(date);
          }
        } catch (e) {
          // Skip invalid dates
        }
      }
    }

    return dates;
  }

  /**
   * Common utility: Extract times from text
   */
  protected extractTimesFromText(text: string): string[] {
    const times: string[] = [];
    
    // Match time patterns (HH:MM, HH:MM AM/PM, etc.)
    const timePattern = /(\d{1,2}):(\d{2})(?:\s*(AM|PM|am|pm))?/g;
    let match;

    while ((match = timePattern.exec(text)) !== null) {
      times.push(match[0]);
    }

    return times;
  }

  /**
   * Common utility: Extract locations from text
   */
  protected extractLocationsFromText(text: string): string[] {
    const locations: string[] = [];
    
    // Look for common location indicators
    const locationPatterns = [
      /(?:at|location|venue|place|room|building):\s*([^,\n]+)/gi,
      /(?:in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g, // Capitalized words (likely place names)
    ];

    for (const pattern of locationPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const location = match[1]?.trim();
        if (location && !locations.includes(location)) {
          locations.push(location);
        }
      }
    }

    return locations;
  }

  /**
   * Common utility: Extract keywords from text
   */
  protected extractKeywordsFromText(text: string): string[] {
    // Simple keyword extraction: split by common delimiters and filter
    const words = text
      .toLowerCase()
      .split(/[\s,;:\-()[\]{}]+/)
      .filter((word) => word.length > 3 && !this.isCommonWord(word));

    return [...new Set(words)]; // Remove duplicates
  }

  /**
   * Common utility: Check if word is a common English word
   */
  private isCommonWord(word: string): boolean {
    const commonWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'her',
      'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how',
      'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
      'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'will', 'with',
    ]);
    return commonWords.has(word);
  }

  /**
   * Common utility: Convert month name to number
   */
  private monthToNumber(month: string): string {
    const months: Record<string, string> = {
      january: '01', february: '02', march: '03', april: '04',
      may: '05', june: '06', july: '07', august: '08',
      september: '09', october: '10', november: '11', december: '12',
    };
    return months[month.toLowerCase()] || '01';
  }
}
