/**
 * Weather Tool Lambda Function
 * Provides weather data capabilities to Bedrock Agents
 * Validates: Requirements 3.2, 3.6
 */

import { ToolInput, ToolOutput } from '../types';
import { getLogger } from '../logger';

const logger = getLogger();

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  timestamp: string;
}

export interface WeatherForecast {
  date: string;
  highTemp: number;
  lowTemp: number;
  condition: string;
  precipitation: number;
}

export interface WeatherToolInput extends ToolInput {
  location: string;
  units?: 'celsius' | 'fahrenheit';
  includeForecast?: boolean;
  forecastDays?: number;
}

/**
 * Fetch current weather conditions
 * Fetch weather forecasts
 * Return structured weather data
 */
export async function handleWeatherTool(input: WeatherToolInput): Promise<ToolOutput> {
  const executionId = (input as any).executionId || 'unknown';

  try {
    logger.info('Weather tool invoked', {
      executionId,
      location: input.location,
      units: input.units || 'fahrenheit',
    });

    // Validate required inputs
    if (!input.location) {
      return {
        success: false,
        error: 'location is required',
      };
    }

    const units = input.units || 'fahrenheit';
    if (!['celsius', 'fahrenheit'].includes(units)) {
      return {
        success: false,
        error: 'units must be either "celsius" or "fahrenheit"',
      };
    }

    // TODO: Implement actual weather API call (e.g., OpenWeatherMap, WeatherAPI)
    // For now, return mock data structure
    const currentWeather: WeatherData = {
      location: input.location,
      temperature: units === 'celsius' ? 22 : 72,
      condition: 'Partly Cloudy',
      humidity: 65,
      windSpeed: 12,
      feelsLike: units === 'celsius' ? 20 : 68,
      timestamp: new Date().toISOString(),
    };

    const result: Record<string, unknown> = {
      current: currentWeather,
    };

    // Add forecast if requested
    if (input.includeForecast) {
      const forecastDays = input.forecastDays || 5;
      const forecast: WeatherForecast[] = [];

      for (let i = 1; i <= forecastDays; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);

        forecast.push({
          date: date.toISOString().split('T')[0],
          highTemp: units === 'celsius' ? 24 : 75,
          lowTemp: units === 'celsius' ? 18 : 64,
          condition: i % 2 === 0 ? 'Sunny' : 'Cloudy',
          precipitation: i % 3 === 0 ? 20 : 0,
        });
      }

      result.forecast = forecast;
    }

    logger.info('Weather query completed', {
      executionId,
      location: input.location,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Weather tool error', errorObj, {
      executionId,
      errorMessage,
    });

    return {
      success: false,
      error: `Weather query failed: ${errorMessage}`,
    };
  }
}

/**
 * Lambda handler for Weather Tool
 */
export async function handler(event: any): Promise<ToolOutput> {
  try {
    const input: WeatherToolInput = {
      location: event.location,
      units: event.units || 'fahrenheit',
      includeForecast: event.includeForecast || false,
      forecastDays: event.forecastDays || 5,
      executionId: event.executionId,
    };

    return await handleWeatherTool(input);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.error('Weather tool handler error', errorObj);

    return {
      success: false,
      error: `Weather tool handler failed: ${errorMessage}`,
    };
  }
}
