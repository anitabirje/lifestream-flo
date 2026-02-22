/**
 * Unit tests for tool Lambda functions
 * Validates: Requirements 3.6, 3.7
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { handleCalendarTool } from '../calendar-tool';
import { handleWeatherTool } from '../weather-tool';
import { handleClassifierTool } from '../classifier-tool';
import { handleParserTool } from '../parser-tool';
import { handleNewsletterParserTool } from '../newsletter-parser-tool';
import { getToolHandler, invokeTool, getAvailableTools } from '../index';

describe('Calendar Tool', () => {
  it('should return error when familyId is missing', async () => {
    const result = await handleCalendarTool({
      startDate: '2024-01-15T00:00:00Z',
      endDate: '2024-01-20T00:00:00Z',
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('familyId is required');
  });

  it('should return error when dates are missing', async () => {
    const result = await handleCalendarTool({
      familyId: 'family-1',
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('startDate and endDate are required');
  });

  it('should return error for invalid date format', async () => {
    const result = await handleCalendarTool({
      familyId: 'family-1',
      startDate: 'invalid-date',
      endDate: '2024-01-20T00:00:00Z',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid date format');
  });

  it('should return error when startDate is after endDate', async () => {
    const result = await handleCalendarTool({
      familyId: 'family-1',
      startDate: '2024-01-20T00:00:00Z',
      endDate: '2024-01-15T00:00:00Z',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('startDate must be before endDate');
  });

  it('should return structured event data for valid input', async () => {
    const result = await handleCalendarTool({
      familyId: 'family-1',
      startDate: '2024-01-15T00:00:00Z',
      endDate: '2024-01-20T00:00:00Z',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.events).toBeDefined();
    expect(Array.isArray(result.data?.events)).toBe(true);
    expect(result.data?.count).toBeDefined();
    expect(result.data?.dateRange).toBeDefined();
  });

  it('should include optional filters when provided', async () => {
    const result = await handleCalendarTool({
      familyId: 'family-1',
      startDate: '2024-01-15T00:00:00Z',
      endDate: '2024-01-20T00:00:00Z',
      memberId: 'member-1',
      category: 'work',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});

describe('Weather Tool', () => {
  it('should return error when location is missing', async () => {
    const result = await handleWeatherTool({} as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('location is required');
  });

  it('should return error for invalid units', async () => {
    const result = await handleWeatherTool({
      location: 'New York',
      units: 'kelvin' as any,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('units must be either');
  });

  it('should return current weather data for valid input', async () => {
    const result = await handleWeatherTool({
      location: 'New York',
      units: 'fahrenheit',
    });

    expect(result.success).toBe(true);
    expect(result.data?.current).toBeDefined();
    const current = result.data?.current as any;
    expect(current.location).toBe('New York');
    expect(current.temperature).toBeDefined();
    expect(current.condition).toBeDefined();
  });

  it('should include forecast when requested', async () => {
    const result = await handleWeatherTool({
      location: 'New York',
      includeForecast: true,
      forecastDays: 3,
    });

    expect(result.success).toBe(true);
    expect(result.data?.forecast).toBeDefined();
    const forecast = result.data?.forecast as any;
    expect(Array.isArray(forecast)).toBe(true);
    expect(forecast.length).toBe(3);
  });

  it('should use default forecast days when not specified', async () => {
    const result = await handleWeatherTool({
      location: 'New York',
      includeForecast: true,
    });

    expect(result.success).toBe(true);
    const forecast = result.data?.forecast as any;
    expect(forecast.length).toBe(5);
  });

  it('should support celsius units', async () => {
    const result = await handleWeatherTool({
      location: 'London',
      units: 'celsius',
    });

    expect(result.success).toBe(true);
    expect(result.data?.current).toBeDefined();
  });
});

describe('Classifier Tool', () => {
  it('should return error when familyId is missing', async () => {
    const result = await handleClassifierTool({
      eventTitle: 'Team Meeting',
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('familyId is required');
  });

  it('should return error when eventTitle is missing', async () => {
    const result = await handleClassifierTool({
      familyId: 'family-1',
    } as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('eventTitle is required');
  });

  it('should return classification result for valid input', async () => {
    const result = await handleClassifierTool({
      familyId: 'family-1',
      eventTitle: 'Team Meeting',
      eventDescription: 'Weekly sync with the team',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.categoryId).toBeDefined();
    expect(result.data?.categoryName).toBeDefined();
    expect(result.data?.confidence).toBeDefined();
    expect(typeof result.data?.confidence).toBe('number');
    expect(result.data?.confidence).toBeGreaterThanOrEqual(0);
    expect(result.data?.confidence).toBeLessThanOrEqual(1);
  });

  it('should include suggested alternatives', async () => {
    const result = await handleClassifierTool({
      familyId: 'family-1',
      eventTitle: 'Team Meeting',
    });

    expect(result.success).toBe(true);
    expect(result.data?.suggestedAlternatives).toBeDefined();
    expect(Array.isArray(result.data?.suggestedAlternatives)).toBe(true);
  });

  it('should include reasoning for classification', async () => {
    const result = await handleClassifierTool({
      familyId: 'family-1',
      eventTitle: 'Team Meeting',
    });

    expect(result.success).toBe(true);
    expect(result.data?.reasoning).toBeDefined();
    expect(typeof result.data?.reasoning).toBe('string');
  });
});

describe('Parser Tool', () => {
  it('should return error when eventData is missing', async () => {
    const result = await handleParserTool({} as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('eventData is required');
  });

  it('should return error for invalid format', async () => {
    const result = await handleParserTool({
      eventData: 'Some event data',
      format: 'invalid' as any,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('format must be one of');
  });

  it('should parse event data with auto format', async () => {
    const result = await handleParserTool({
      eventData: 'Team Meeting on January 15 at 2 PM',
    });

    expect(result.success).toBe(true);
    expect(result.data?.event).toBeDefined();
    const event = result.data?.event as any;
    expect(event.title).toBeDefined();
    expect(result.data?.parseConfidence).toBeDefined();
  });

  it('should parse event data with specific format', async () => {
    const result = await handleParserTool({
      eventData: 'Team Meeting on January 15 at 2 PM',
      format: 'text',
    });

    expect(result.success).toBe(true);
    expect(result.data?.event).toBeDefined();
  });

  it('should include parse confidence score', async () => {
    const result = await handleParserTool({
      eventData: 'Team Meeting',
    });

    expect(result.success).toBe(true);
    expect(result.data?.parseConfidence).toBeDefined();
    expect(typeof result.data?.parseConfidence).toBe('number');
  });
});

describe('Newsletter Parser Tool', () => {
  it('should return error when newsletterContent is missing', async () => {
    const result = await handleNewsletterParserTool({} as any);

    expect(result.success).toBe(false);
    expect(result.error).toContain('newsletterContent is required');
  });

  it('should parse newsletter content', async () => {
    const result = await handleNewsletterParserTool({
      newsletterContent: 'School Newsletter - January 2024\n\nWinter Concert on January 20',
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data?.content).toBeDefined();
    expect(result.data?.confidence).toBeDefined();
  });

  it('should extract events when requested', async () => {
    const result = await handleNewsletterParserTool({
      newsletterContent: 'Winter Concert on January 20\nScience Fair on February 10',
      extractEvents: true,
    });

    expect(result.success).toBe(true);
    expect(result.data?.extractedEvents).toBeDefined();
    expect(Array.isArray(result.data?.extractedEvents)).toBe(true);
  });

  it('should extract dates and locations', async () => {
    const result = await handleNewsletterParserTool({
      newsletterContent: 'Winter Concert on January 20 at School Auditorium',
    });

    expect(result.success).toBe(true);
    expect(result.data?.extractedDates).toBeDefined();
    expect(result.data?.extractedLocations).toBeDefined();
  });

  it('should include key points', async () => {
    const result = await handleNewsletterParserTool({
      newsletterContent: 'Important: Winter concert scheduled for January 20',
    });

    expect(result.success).toBe(true);
    expect(result.data?.keyPoints).toBeDefined();
    expect(Array.isArray(result.data?.keyPoints)).toBe(true);
  });
});

describe('Tool Registry', () => {
  it('should return available tools', () => {
    const tools = getAvailableTools();
    expect(Array.isArray(tools)).toBe(true);
    expect(tools.length).toBeGreaterThan(0);
    expect(tools).toContain('calendar-tool');
    expect(tools).toContain('weather-tool');
    expect(tools).toContain('classifier-tool');
    expect(tools).toContain('parser-tool');
    expect(tools).toContain('newsletter-parser-tool');
  });

  it('should get tool handler by name', () => {
    const handler = getToolHandler('calendar-tool');
    expect(handler).toBeDefined();
    expect(typeof handler).toBe('function');
  });

  it('should return undefined for unknown tool', () => {
    const handler = getToolHandler('unknown-tool');
    expect(handler).toBeUndefined();
  });

  it('should invoke tool by name', async () => {
    const result = await invokeTool('weather-tool', {
      location: 'New York',
    });

    expect(result.success).toBe(true);
  });

  it('should return error for unknown tool invocation', async () => {
    const result = await invokeTool('unknown-tool', {});

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});
