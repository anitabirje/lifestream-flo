/**
 * Weather API Service
 * Integrates with external weather data provider to retrieve forecasts, AQI, UV, and precipitation
 */

import { WeatherData } from './types';

/**
 * Weather API configuration
 */
export interface WeatherAPIConfig {
  apiKey: string;
  baseUrl: string;
  timeout: number; // milliseconds
}

/**
 * External weather API response structure
 */
interface WeatherAPIResponse {
  dt: number; // Unix timestamp
  temp: {
    day: number;
    min: number;
    max: number;
  };
  weather: Array<{
    main: string;
    description: string;
  }>;
  pop: number; // Probability of precipitation (0-1)
  uvi: number; // UV index
}

/**
 * Air Quality API response structure
 */
interface AirQualityAPIResponse {
  list: Array<{
    main: {
      aqi: number;
    };
    dt: number;
  }>;
}

/**
 * Weather API Service
 * Handles communication with external weather data provider
 */
export class WeatherAPIService {
  private config: WeatherAPIConfig;

  constructor(config: WeatherAPIConfig) {
    this.config = config;
  }

  /**
   * Fetch 7-day weather forecast for a location
   */
  async get7DayForecast(location: string): Promise<WeatherData[]> {
    try {
      const coordinates = await this.geocodeLocation(location);
      const forecastData = await this.fetchForecastData(coordinates.lat, coordinates.lon);
      const aqiData = await this.fetchAirQualityData(coordinates.lat, coordinates.lon);

      return this.transformForecastData(forecastData, aqiData, location);
    } catch (error) {
      throw new Error(`Failed to fetch weather forecast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch weather data for a specific date
   */
  async getWeatherForDate(location: string, date: Date): Promise<WeatherData> {
    const forecast = await this.get7DayForecast(location);
    const dateStr = this.formatDate(date);

    const weatherData = forecast.find(data => data.date === dateStr);
    if (!weatherData) {
      throw new Error(`No weather data available for ${dateStr}`);
    }

    return weatherData;
  }

  /**
   * Geocode location string to coordinates
   */
  private async geocodeLocation(location: string): Promise<{ lat: number; lon: number }> {
    // Placeholder implementation
    // In production, this would call a geocoding API
    // For now, return mock coordinates (Sydney, Australia)
    return {
      lat: -33.8688,
      lon: 151.2093
    };
  }

  /**
   * Fetch forecast data from weather API
   */
  private async fetchForecastData(lat: number, lon: number): Promise<WeatherAPIResponse[]> {
    // Placeholder implementation
    // In production, this would make an HTTP request to the weather API
    // Example: OpenWeatherMap One Call API
    // const url = `${this.config.baseUrl}/data/2.5/onecall?lat=${lat}&lon=${lon}&exclude=current,minutely,hourly,alerts&appid=${this.config.apiKey}&units=metric`;
    
    // Return mock data for 7 days
    const mockData: WeatherAPIResponse[] = [];
    const now = Date.now();
    
    for (let i = 0; i < 7; i++) {
      mockData.push({
        dt: now + (i * 24 * 60 * 60 * 1000),
        temp: {
          day: 20 + Math.random() * 10,
          min: 15 + Math.random() * 5,
          max: 25 + Math.random() * 5
        },
        weather: [{
          main: i % 3 === 0 ? 'Rain' : 'Clear',
          description: i % 3 === 0 ? 'light rain' : 'clear sky'
        }],
        pop: i % 3 === 0 ? 0.7 : 0.2,
        uvi: 3 + Math.random() * 7
      });
    }

    return mockData;
  }

  /**
   * Fetch air quality data from API
   */
  private async fetchAirQualityData(lat: number, lon: number): Promise<AirQualityAPIResponse> {
    // Placeholder implementation
    // In production, this would make an HTTP request to the air quality API
    // Example: OpenWeatherMap Air Pollution API
    // const url = `${this.config.baseUrl}/data/2.5/air_pollution/forecast?lat=${lat}&lon=${lon}&appid=${this.config.apiKey}`;
    
    // Return mock AQI data
    const mockData: AirQualityAPIResponse = {
      list: []
    };

    const now = Date.now();
    for (let i = 0; i < 7; i++) {
      mockData.list.push({
        main: {
          aqi: Math.floor(1 + Math.random() * 5) // AQI 1-5 scale
        },
        dt: now + (i * 24 * 60 * 60 * 1000)
      });
    }

    return mockData;
  }

  /**
   * Transform API response data to internal WeatherData format
   */
  private transformForecastData(
    forecastData: WeatherAPIResponse[],
    aqiData: AirQualityAPIResponse,
    location: string
  ): WeatherData[] {
    return forecastData.map((day, index) => {
      const date = new Date(day.dt);
      const aqiEntry = aqiData.list[index];

      return {
        date: this.formatDate(date),
        location,
        temperature: Math.round(day.temp.day),
        temperatureUnit: 'C',
        aqi: this.convertAQIToIndex(aqiEntry?.main.aqi || 1),
        uvIndex: Math.round(day.uvi),
        precipitationChance: Math.round(day.pop * 100),
        conditions: this.capitalizeConditions(day.weather[0].description),
        retrievedAt: new Date()
      };
    });
  }

  /**
   * Convert API AQI scale (1-5) to standard AQI index (0-500)
   */
  private convertAQIToIndex(apiAqi: number): number {
    // OpenWeatherMap uses 1-5 scale, convert to 0-500 scale
    const aqiRanges = [
      { min: 0, max: 50 },    // 1 - Good
      { min: 51, max: 100 },  // 2 - Fair
      { min: 101, max: 150 }, // 3 - Moderate
      { min: 151, max: 200 }, // 4 - Poor
      { min: 201, max: 300 }  // 5 - Very Poor
    ];

    const range = aqiRanges[apiAqi - 1] || aqiRanges[0];
    return Math.floor((range.min + range.max) / 2);
  }

  /**
   * Capitalize weather conditions
   */
  private capitalizeConditions(conditions: string): string {
    return conditions
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
