/**
 * Weather Agent
 * AI agent responsible for retrieving environmental data including weather forecasts,
 * AQI, UV ratings, and precipitation probability
 */

import { IAgent, AgentTask, AgentResult, AgentStatus } from './types';
import { WeatherAPIService, WeatherAPIConfig } from './weather-api-service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Weather data structure for a specific date
 */
export interface WeatherData {
  date: string; // YYYY-MM-DD format
  location: string;
  temperature: number;
  temperatureUnit: 'C' | 'F';
  aqi: number; // Air Quality Index
  uvIndex: number; // UV rating
  precipitationChance: number; // 0-100 percentage
  conditions: string; // e.g., "Sunny", "Rainy", "Cloudy"
  retrievedAt: Date;
}

/**
 * 7-day weather forecast
 */
export interface WeatherForecast {
  location: string;
  forecast: WeatherData[];
}

/**
 * Weather query parameters
 */
export interface WeatherQuery {
  location: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Weather agent interface extending base IAgent
 */
export interface IWeatherAgent extends IAgent {
  /**
   * Retrieve weather forecast for a location and date range
   */
  getWeatherForecast(query: WeatherQuery): Promise<WeatherForecast>;

  /**
   * Retrieve weather data for a specific date
   */
  getWeatherForDate(location: string, date: Date): Promise<WeatherData | null>;

  /**
   * Check if weather data needs refresh (older than 6 hours)
   */
  needsRefresh(lastUpdate: Date): boolean;
}

/**
 * Base Weather Agent implementation
 */
export class WeatherAgent implements IWeatherAgent {
  public readonly id: string;
  public readonly type: 'weather' = 'weather';
  public readonly capabilities: string[];
  public status: AgentStatus;

  private weatherCache: Map<string, WeatherData>;
  private cacheExpiry: number = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  private weatherAPIService: WeatherAPIService;

  constructor(id?: string, apiConfig?: WeatherAPIConfig) {
    this.id = id || `weather-agent-${uuidv4()}`;
    this.capabilities = [
      'fetch_weather',
      'fetch_aqi',
      'fetch_uv',
      'fetch_precipitation'
    ];
    this.status = 'idle';
    this.weatherCache = new Map();
    
    // Initialize weather API service with config or defaults
    const defaultConfig: WeatherAPIConfig = {
      apiKey: process.env.WEATHER_API_KEY || '',
      baseUrl: process.env.WEATHER_API_URL || 'https://api.openweathermap.org',
      timeout: 10000
    };
    this.weatherAPIService = new WeatherAPIService(apiConfig || defaultConfig);
  }

  /**
   * Execute a weather-related task
   */
  async execute(task: AgentTask): Promise<AgentResult> {
    const startTime = Date.now();
    this.status = 'busy';

    try {
      if (task.type !== 'fetch_weather') {
        throw new Error(`Unsupported task type: ${task.type}`);
      }

      const query = task.payload as WeatherQuery;
      const forecast = await this.getWeatherForecast(query);

      this.status = 'idle';
      const executionTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms
      return {
        taskId: task.id,
        agentId: this.id,
        status: 'success',
        data: forecast,
        executionTime,
        completedAt: new Date()
      };
    } catch (error) {
      this.status = 'failed';
      const executionTime = Math.max(1, Date.now() - startTime); // Ensure at least 1ms
      return {
        taskId: task.id,
        agentId: this.id,
        status: 'failed',
        data: null,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        executionTime,
        completedAt: new Date()
      };
    }
  }

  /**
   * Health check for the weather agent
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - verify agent is responsive
      return this.status !== 'offline';
    } catch {
      this.status = 'offline';
      return false;
    }
  }

  /**
   * Retrieve weather forecast for a location and date range
   */
  async getWeatherForecast(query: WeatherQuery): Promise<WeatherForecast> {
    const forecast: WeatherData[] = [];
    const currentDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    while (currentDate <= endDate) {
      const dateStr = this.formatDate(currentDate);
      const cacheKey = `${query.location}:${dateStr}`;

      // Check cache first
      let weatherData = this.weatherCache.get(cacheKey);

      if (!weatherData || this.needsRefresh(weatherData.retrievedAt)) {
        // Fetch fresh data (to be implemented with actual API)
        weatherData = await this.fetchWeatherData(query.location, currentDate);
        this.weatherCache.set(cacheKey, weatherData);
      }

      forecast.push(weatherData);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return {
      location: query.location,
      forecast
    };
  }

  /**
   * Retrieve weather data for a specific date
   */
  async getWeatherForDate(location: string, date: Date): Promise<WeatherData | null> {
    const dateStr = this.formatDate(date);
    const cacheKey = `${location}:${dateStr}`;

    // Check cache first
    let weatherData = this.weatherCache.get(cacheKey);

    if (!weatherData || this.needsRefresh(weatherData.retrievedAt)) {
      weatherData = await this.fetchWeatherData(location, date);
      this.weatherCache.set(cacheKey, weatherData);
    }

    return weatherData;
  }

  /**
   * Check if weather data needs refresh (older than 6 hours)
   */
  needsRefresh(lastUpdate: Date): boolean {
    const now = Date.now();
    const lastUpdateTime = lastUpdate.getTime();
    return (now - lastUpdateTime) > this.cacheExpiry;
  }

  /**
   * Fetch weather data from external API
   * Uses WeatherAPIService to retrieve data from weather provider
   */
  private async fetchWeatherData(location: string, date: Date): Promise<WeatherData> {
    try {
      return await this.weatherAPIService.getWeatherForDate(location, date);
    } catch (error) {
      // If API call fails, return fallback data
      console.error(`Failed to fetch weather data: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {
        date: this.formatDate(date),
        location,
        temperature: 20,
        temperatureUnit: 'C',
        aqi: 50,
        uvIndex: 5,
        precipitationChance: 30,
        conditions: 'Unknown',
        retrievedAt: new Date()
      };
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

  /**
   * Clear the weather cache
   */
  clearCache(): void {
    this.weatherCache.clear();
  }
}
