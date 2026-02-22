/**
 * Tool exports and registry
 * Validates: Requirements 3.1-3.5, 3.6
 */

export { handleCalendarTool, handler as calendarToolHandler } from './calendar-tool';
export type { CalendarEvent, CalendarQueryInput } from './calendar-tool';

export { handleWeatherTool, handler as weatherToolHandler } from './weather-tool';
export type { WeatherData, WeatherForecast, WeatherToolInput } from './weather-tool';

export { handleClassifierTool, handler as classifierToolHandler } from './classifier-tool';
export type { ClassificationResult, ClassifierToolInput } from './classifier-tool';

export { handleParserTool, handler as parserToolHandler } from './parser-tool';
export type { ParsedEvent, ParserToolInput } from './parser-tool';

export { handleNewsletterParserTool, handler as newsletterParserToolHandler } from './newsletter-parser-tool';
export type { ParsedNewsletter, NewsletterParserToolInput } from './newsletter-parser-tool';

import { ToolInput, ToolOutput } from '../types';

/**
 * Tool registry mapping tool names to handlers
 */
export type ToolHandler = (input: ToolInput) => Promise<ToolOutput>;

export const toolRegistry: Record<string, ToolHandler> = {
  'calendar-tool': async (input: ToolInput) => {
    const { handleCalendarTool } = await import('./calendar-tool');
    return handleCalendarTool(input as any);
  },
  'weather-tool': async (input: ToolInput) => {
    const { handleWeatherTool } = await import('./weather-tool');
    return handleWeatherTool(input as any);
  },
  'classifier-tool': async (input: ToolInput) => {
    const { handleClassifierTool } = await import('./classifier-tool');
    return handleClassifierTool(input as any);
  },
  'parser-tool': async (input: ToolInput) => {
    const { handleParserTool } = await import('./parser-tool');
    return handleParserTool(input as any);
  },
  'newsletter-parser-tool': async (input: ToolInput) => {
    const { handleNewsletterParserTool } = await import('./newsletter-parser-tool');
    return handleNewsletterParserTool(input as any);
  },
};

/**
 * Get a tool handler by name
 */
export function getToolHandler(toolName: string): ToolHandler | undefined {
  return toolRegistry[toolName];
}

/**
 * Get all available tool names
 */
export function getAvailableTools(): string[] {
  return Object.keys(toolRegistry);
}

/**
 * Invoke a tool by name
 */
export async function invokeTool(toolName: string, input: ToolInput): Promise<ToolOutput> {
  const handler = getToolHandler(toolName);
  if (!handler) {
    return {
      success: false,
      error: `Tool "${toolName}" not found. Available tools: ${getAvailableTools().join(', ')}`,
    };
  }

  try {
    return await handler(input);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: `Tool invocation failed: ${errorMessage}`,
    };
  }
}
