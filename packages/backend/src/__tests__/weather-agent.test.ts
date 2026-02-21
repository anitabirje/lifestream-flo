/**
 * Property-based tests for weather agent
 * Property 51: Weather Data Retrieval
 * Property 52: Weather-Event Association
 * Validates: Requirements 1a.1-1a.9
 * 
 * Feature: flo-family-calendar
 */

import * as fc from 'fast-check';
import { 
  WeatherAgent, 
  WeatherData, 
  WeatherQuery,
  WeatherEventAssociator,
  CalendarEvent,
  WeatherReminderGenerator,
  ReminderType
} from '../agents';

describe('Property 51: Weather Data Retrieval', () => {
  /**
   * **Validates: Requirements 1a.1, 1a.2, 1a.3, 1a.4**
   * 
   * Property: Weather agent should retrieve complete weather data for any valid location and date range
   */
  it('should retrieve weather data with all required fields for any location and date range', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 50 }), // location
        fc.integer({ min: 1, max: 7 }), // number of days
        async (location, days) => {
          const agent = new WeatherAgent();
          
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + days - 1);
          
          const query: WeatherQuery = {
            location,
            startDate,
            endDate
          };
          
          const forecast = await agent.getWeatherForecast(query);
          
          // Verify forecast structure
          expect(forecast).toBeDefined();
          expect(forecast.location).toBe(location);
          expect(forecast.forecast).toBeDefined();
          expect(Array.isArray(forecast.forecast)).toBe(true);
          expect(forecast.forecast.length).toBe(days);
          
          // Verify each day has complete weather data
          for (const weatherData of forecast.forecast) {
            // Requirement 1a.1: Weather forecast
            expect(weatherData.temperature).toBeDefined();
            expect(typeof weatherData.temperature).toBe('number');
            expect(weatherData.temperatureUnit).toMatch(/^[CF]$/);
            expect(weatherData.conditions).toBeDefined();
            expect(typeof weatherData.conditions).toBe('string');
            
            // Requirement 1a.2: AQI data
            expect(weatherData.aqi).toBeDefined();
            expect(typeof weatherData.aqi).toBe('number');
            expect(weatherData.aqi).toBeGreaterThanOrEqual(0);
            expect(weatherData.aqi).toBeLessThanOrEqual(500);
            
            // Requirement 1a.3: UV rating
            expect(weatherData.uvIndex).toBeDefined();
            expect(typeof weatherData.uvIndex).toBe('number');
            expect(weatherData.uvIndex).toBeGreaterThanOrEqual(0);
            expect(weatherData.uvIndex).toBeLessThanOrEqual(15);
            
            // Requirement 1a.4: Precipitation probability
            expect(weatherData.precipitationChance).toBeDefined();
            expect(typeof weatherData.precipitationChance).toBe('number');
            expect(weatherData.precipitationChance).toBeGreaterThanOrEqual(0);
            expect(weatherData.precipitationChance).toBeLessThanOrEqual(100);
            
            // Verify metadata
            expect(weatherData.date).toBeDefined();
            expect(weatherData.location).toBe(location);
            expect(weatherData.retrievedAt).toBeInstanceOf(Date);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * **Validates: Requirement 1a.5**
   * 
   * Property: Weather data should be cached and only refreshed when older than 6 hours
   */
  it('should cache weather data and respect 6-hour refresh interval', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 50 }),
        async (location) => {
          const agent = new WeatherAgent();
          const date = new Date();
          
          // First fetch
          const weatherData1 = await agent.getWeatherForDate(location, date);
          expect(weatherData1).toBeDefined();
          
          // Second fetch immediately - should use cache
          const weatherData2 = await agent.getWeatherForDate(location, date);
          expect(weatherData2).toBeDefined();
          expect(weatherData2?.retrievedAt).toEqual(weatherData1?.retrievedAt);
          
          // Test needsRefresh method
          const recentDate = new Date();
          expect(agent.needsRefresh(recentDate)).toBe(false);
          
          const oldDate = new Date(Date.now() - 7 * 60 * 60 * 1000); // 7 hours ago
          expect(agent.needsRefresh(oldDate)).toBe(true);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * **Validates: Requirements 1a.1-1a.4**
   * 
   * Property: Weather agent should handle task execution correctly
   */
  it('should execute weather fetch tasks and return valid results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 50 }),
        fc.integer({ min: 1, max: 7 }),
        async (location, days) => {
          const agent = new WeatherAgent();
          
          const startDate = new Date();
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + days - 1);
          
          const task = {
            id: `task-${Date.now()}`,
            type: 'fetch_weather' as const,
            priority: 'medium' as const,
            payload: {
              location,
              startDate,
              endDate
            },
            createdAt: new Date(),
            retryCount: 0,
            maxRetries: 3
          };
          
          const result = await agent.execute(task);
          
          // Verify result structure
          expect(result.taskId).toBe(task.id);
          expect(result.agentId).toBe(agent.id);
          expect(result.status).toBe('success');
          expect(result.data).toBeDefined();
          expect(result.executionTime).toBeGreaterThan(0);
          expect(result.completedAt).toBeInstanceOf(Date);
          
          // Verify forecast data
          const forecast = result.data;
          expect(forecast.location).toBe(location);
          expect(forecast.forecast.length).toBe(days);
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property: Weather agent health check should return true when operational
   */
  it('should pass health checks when operational', async () => {
    const agent = new WeatherAgent();
    const isHealthy = await agent.healthCheck();
    expect(isHealthy).toBe(true);
    expect(agent.status).not.toBe('offline');
  });
});

describe('Property 52: Weather-Event Association', () => {
  /**
   * **Validates: Requirement 1a.6**
   * 
   * Property: Weather data should be correctly associated with calendar events by date, time, and location
   */
  it('should associate weather data with events based on date and location', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.string({ minLength: 5, maxLength: 20 }),
            title: fc.string({ minLength: 5, maxLength: 50 }),
            location: fc.option(fc.string({ minLength: 3, maxLength: 30 }), { nil: undefined }),
            daysFromNow: fc.integer({ min: 0, max: 6 })
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (eventConfigs) => {
          const agent = new WeatherAgent();
          const associator = new WeatherEventAssociator(agent, 'Sydney, Australia');
          
          // Create events
          const events: CalendarEvent[] = eventConfigs.map(config => {
            const startTime = new Date();
            startTime.setDate(startTime.getDate() + config.daysFromNow);
            const endTime = new Date(startTime);
            endTime.setHours(endTime.getHours() + 2);
            
            return {
              id: config.id,
              title: config.title,
              startTime,
              endTime,
              location: config.location,
              familyMemberId: 'member-1'
            };
          });
          
          // Associate weather with events
          const results = await associator.associateWeatherWithEvents(events);
          
          // Verify all events got associations
          expect(results.length).toBe(events.length);
          
          for (const result of results) {
            expect(result.eventId).toBeDefined();
            expect(result.success).toBe(true);
            expect(result.weatherData).toBeDefined();
            
            if (result.weatherData) {
              // Verify weather data completeness
              expect(result.weatherData.temperature).toBeDefined();
              expect(result.weatherData.aqi).toBeDefined();
              expect(result.weatherData.uvIndex).toBeDefined();
              expect(result.weatherData.precipitationChance).toBeDefined();
            }
          }
          
          // Verify associations are stored
          expect(associator.getAssociationsCount()).toBe(events.length);
          
          // Verify each event can retrieve its weather
          for (const event of events) {
            const association = associator.getWeatherForEvent(event.id);
            expect(association).toBeDefined();
            expect(association?.eventId).toBe(event.id);
            expect(association?.weatherData).toBeDefined();
          }
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * **Validates: Requirement 1a.6**
   * 
   * Property: Events on the same date and location should share weather data (efficiency)
   */
  it('should efficiently batch weather fetches for events on same date/location', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 2, max: 5 }), // number of events on same day
        fc.string({ minLength: 3, maxLength: 30 }), // location
        async (eventCount, location) => {
          const agent = new WeatherAgent();
          const associator = new WeatherEventAssociator(agent, location);
          
          // Create multiple events on same date and location
          const startTime = new Date();
          startTime.setHours(10, 0, 0, 0);
          
          const events: CalendarEvent[] = [];
          for (let i = 0; i < eventCount; i++) {
            const eventStartTime = new Date(startTime);
            eventStartTime.setHours(10 + i * 2);
            const eventEndTime = new Date(eventStartTime);
            eventEndTime.setHours(eventEndTime.getHours() + 1);
            
            events.push({
              id: `event-${i}`,
              title: `Event ${i}`,
              startTime: eventStartTime,
              endTime: eventEndTime,
              location,
              familyMemberId: 'member-1'
            });
          }
          
          // Associate weather
          const results = await associator.associateWeatherWithEvents(events);
          
          // All should succeed
          expect(results.every(r => r.success)).toBe(true);
          
          // All should have same weather data (same date/location)
          const firstWeather = results[0].weatherData;
          for (let i = 1; i < results.length; i++) {
            expect(results[i].weatherData?.date).toBe(firstWeather?.date);
            expect(results[i].weatherData?.location).toBe(firstWeather?.location);
          }
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * **Validates: Requirements 1a.7, 1a.8**
   * 
   * Property: Contextual reminders should be generated for outdoor events with appropriate weather conditions
   */
  it('should generate umbrella reminders for rainy outdoor events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 50, max: 100 }), // precipitation chance
        async (precipChance) => {
          const agent = new WeatherAgent();
          const associator = new WeatherEventAssociator(agent);
          const reminderGenerator = new WeatherReminderGenerator();
          
          // Create outdoor event
          const event: CalendarEvent = {
            id: 'outdoor-event-1',
            title: 'Soccer practice at the park',
            startTime: new Date(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            location: 'Local Park',
            familyMemberId: 'member-1'
          };
          
          // Create weather data with high precipitation
          const weatherData: WeatherData = {
            date: new Date().toISOString().split('T')[0],
            location: 'Local Park',
            temperature: 20,
            temperatureUnit: 'C',
            aqi: 50,
            uvIndex: 5,
            precipitationChance: precipChance,
            conditions: 'Rainy',
            retrievedAt: new Date()
          };
          
          const association = {
            eventId: event.id,
            weatherData,
            associatedAt: new Date(),
            ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60
          };
          
          // Generate reminders
          const reminders = reminderGenerator.generateReminders(event, association);
          
          // Should generate umbrella reminder for outdoor event with rain
          const umbrellaReminder = reminders.find(r => r.type === 'umbrella');
          expect(umbrellaReminder).toBeDefined();
          expect(umbrellaReminder?.message).toContain('umbrella');
          expect(umbrellaReminder?.message).toContain(precipChance.toString());
          expect(umbrellaReminder?.priority).toMatch(/^(medium|high)$/);
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * **Validates: Requirements 1a.7, 1a.8**
   * 
   * Property: Sunscreen reminders should be generated for outdoor events with high UV
   */
  it('should generate sunscreen reminders for high UV outdoor events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 6, max: 12 }), // UV index
        async (uvIndex) => {
          const agent = new WeatherAgent();
          const reminderGenerator = new WeatherReminderGenerator();
          
          // Create outdoor event
          const event: CalendarEvent = {
            id: 'outdoor-event-2',
            title: 'Beach volleyball game',
            startTime: new Date(),
            endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
            location: 'Beach',
            familyMemberId: 'member-1'
          };
          
          // Create weather data with high UV
          const weatherData: WeatherData = {
            date: new Date().toISOString().split('T')[0],
            location: 'Beach',
            temperature: 28,
            temperatureUnit: 'C',
            aqi: 40,
            uvIndex,
            precipitationChance: 10,
            conditions: 'Sunny',
            retrievedAt: new Date()
          };
          
          const association = {
            eventId: event.id,
            weatherData,
            associatedAt: new Date(),
            ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60
          };
          
          // Generate reminders
          const reminders = reminderGenerator.generateReminders(event, association);
          
          // Should generate sunscreen reminder for outdoor event with high UV
          const sunscreenReminder = reminders.find(r => r.type === 'sunscreen');
          expect(sunscreenReminder).toBeDefined();
          expect(sunscreenReminder?.message).toContain('sunscreen');
          expect(sunscreenReminder?.message).toContain(uvIndex.toString());
          expect(sunscreenReminder?.priority).toMatch(/^(medium|high)$/);
        }
      ),
      { numRuns: 15 }
    );
  });

  /**
   * Property: Indoor events should not generate weather reminders
   */
  it('should not generate reminders for indoor events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 50, max: 100 }), // precipitation
        fc.integer({ min: 6, max: 12 }), // UV index
        async (precipChance, uvIndex) => {
          const agent = new WeatherAgent();
          const reminderGenerator = new WeatherReminderGenerator();
          
          // Create indoor event (no outdoor keywords)
          const event: CalendarEvent = {
            id: 'indoor-event-1',
            title: 'Team meeting in conference room',
            startTime: new Date(),
            endTime: new Date(Date.now() + 1 * 60 * 60 * 1000),
            location: 'Office Building',
            familyMemberId: 'member-1'
          };
          
          // Create weather data with high precipitation and UV
          const weatherData: WeatherData = {
            date: new Date().toISOString().split('T')[0],
            location: 'Office Building',
            temperature: 25,
            temperatureUnit: 'C',
            aqi: 50,
            uvIndex,
            precipitationChance: precipChance,
            conditions: 'Rainy',
            retrievedAt: new Date()
          };
          
          const association = {
            eventId: event.id,
            weatherData,
            associatedAt: new Date(),
            ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60
          };
          
          // Generate reminders
          const reminders = reminderGenerator.generateReminders(event, association);
          
          // Should not generate any reminders for indoor event
          expect(reminders.length).toBe(0);
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Association TTL should be set to 90 days
   */
  it('should set TTL to 90 days for weather-event associations', async () => {
    const agent = new WeatherAgent();
    const associator = new WeatherEventAssociator(agent);
    
    const event: CalendarEvent = {
      id: 'event-ttl-test',
      title: 'Test Event',
      startTime: new Date(),
      endTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      location: 'Test Location',
      familyMemberId: 'member-1'
    };
    
    const result = await associator.associateWeatherWithEvent(event);
    expect(result.success).toBe(true);
    
    const association = associator.getWeatherForEvent(event.id);
    expect(association).toBeDefined();
    
    if (association) {
      const now = Math.floor(Date.now() / 1000);
      const ninetyDaysFromNow = now + (90 * 24 * 60 * 60);
      
      // TTL should be approximately 90 days from now (within 1 hour tolerance)
      expect(association.ttl).toBeGreaterThanOrEqual(ninetyDaysFromNow - 3600);
      expect(association.ttl).toBeLessThanOrEqual(ninetyDaysFromNow + 3600);
    }
  });
});
