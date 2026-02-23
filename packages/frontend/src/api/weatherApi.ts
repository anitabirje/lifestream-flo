/**
 * Weather API Client
 * Frontend client for fetching weather data from backend
 */

import { WeatherData } from '../components/WeatherDisplay';

/**
 * Weather API configuration
 */
const API_BASE_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Weather forecast response
 */
export interface WeatherForecast {
  location: string;
  forecast: WeatherData[];
}

/**
 * Weather API client
 */
export class WeatherApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get weather forecast for a location
   */
  async getWeatherForecast(location: string, days: number = 7): Promise<WeatherForecast> {
    try {
      const response = await fetch(
        `${this.baseUrl}/weather/forecast?location=${encodeURIComponent(location)}&days=${days}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch weather forecast: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching weather forecast:', error);
      throw error;
    }
  }

  /**
   * Get weather for a specific date
   */
  async getWeatherForDate(location: string, date: Date): Promise<WeatherData> {
    try {
      const dateStr = this.formatDate(date);
      const response = await fetch(
        `${this.baseUrl}/weather/date?location=${encodeURIComponent(location)}&date=${dateStr}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch weather for date: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching weather for date:', error);
      throw error;
    }
  }

  /**
   * Get weather for an event
   */
  async getWeatherForEvent(eventId: string): Promise<WeatherData | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/weather/event/${eventId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (response.status === 404) {
        return null; // No weather data for event
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch weather for event: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching weather for event:', error);
      throw error;
    }
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
}

// Export singleton instance
export const weatherApi = new WeatherApiClient();
