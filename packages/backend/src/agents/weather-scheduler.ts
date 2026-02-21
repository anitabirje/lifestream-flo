/**
 * Weather Data Refresh Scheduler
 * Schedules weather data updates every 6 hours and manages caching
 */

import { WeatherAgent, WeatherQuery } from './weather-agent';

/**
 * Scheduler configuration
 */
export interface WeatherSchedulerConfig {
  refreshInterval: number; // milliseconds (default: 6 hours)
  defaultLocation: string;
  forecastDays: number; // Number of days to fetch (default: 7)
}

/**
 * Weather refresh job
 */
interface WeatherRefreshJob {
  id: string;
  location: string;
  lastRun: Date;
  nextRun: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

/**
 * Weather Data Refresh Scheduler
 * Manages periodic weather data updates
 */
export class WeatherScheduler {
  private config: WeatherSchedulerConfig;
  private weatherAgent: WeatherAgent;
  private refreshTimer: NodeJS.Timeout | null = null;
  private jobs: Map<string, WeatherRefreshJob>;
  private isRunning: boolean = false;

  constructor(weatherAgent: WeatherAgent, config?: Partial<WeatherSchedulerConfig>) {
    this.weatherAgent = weatherAgent;
    this.config = {
      refreshInterval: config?.refreshInterval || 6 * 60 * 60 * 1000, // 6 hours
      defaultLocation: config?.defaultLocation || 'Sydney, Australia',
      forecastDays: config?.forecastDays || 7
    };
    this.jobs = new Map();
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('Weather scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Weather scheduler started with ${this.config.refreshInterval / 1000 / 60 / 60}h refresh interval`);

    // Run immediately on start
    this.runRefreshCycle();

    // Schedule periodic refresh
    this.refreshTimer = setInterval(() => {
      this.runRefreshCycle();
    }, this.config.refreshInterval);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
    this.isRunning = false;
    console.log('Weather scheduler stopped');
  }

  /**
   * Add a location to refresh schedule
   */
  addLocation(location: string): void {
    if (this.jobs.has(location)) {
      console.log(`Location ${location} is already scheduled`);
      return;
    }

    const now = new Date();
    const job: WeatherRefreshJob = {
      id: `weather-job-${location}-${Date.now()}`,
      location,
      lastRun: new Date(0), // Never run
      nextRun: now,
      status: 'pending'
    };

    this.jobs.set(location, job);
    console.log(`Added location ${location} to refresh schedule`);
  }

  /**
   * Remove a location from refresh schedule
   */
  removeLocation(location: string): boolean {
    const removed = this.jobs.delete(location);
    if (removed) {
      console.log(`Removed location ${location} from refresh schedule`);
    }
    return removed;
  }

  /**
   * Get all scheduled locations
   */
  getScheduledLocations(): string[] {
    return Array.from(this.jobs.keys());
  }

  /**
   * Get job status for a location
   */
  getJobStatus(location: string): WeatherRefreshJob | undefined {
    return this.jobs.get(location);
  }

  /**
   * Run a refresh cycle for all scheduled locations
   */
  private async runRefreshCycle(): Promise<void> {
    console.log(`Running weather refresh cycle at ${new Date().toISOString()}`);

    // If no locations scheduled, use default
    if (this.jobs.size === 0) {
      this.addLocation(this.config.defaultLocation);
    }

    const refreshPromises: Promise<void>[] = [];

    for (const [location, job] of this.jobs.entries()) {
      if (job.status === 'running') {
        console.log(`Skipping ${location} - already running`);
        continue;
      }

      refreshPromises.push(this.refreshLocation(location, job));
    }

    await Promise.allSettled(refreshPromises);
    console.log('Weather refresh cycle completed');
  }

  /**
   * Refresh weather data for a specific location
   */
  private async refreshLocation(location: string, job: WeatherRefreshJob): Promise<void> {
    job.status = 'running';
    const startTime = Date.now();

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + this.config.forecastDays - 1);

      const query: WeatherQuery = {
        location,
        startDate,
        endDate
      };

      // Fetch weather forecast through the agent
      const forecast = await this.weatherAgent.getWeatherForecast(query);

      job.status = 'completed';
      job.lastRun = new Date();
      job.nextRun = new Date(Date.now() + this.config.refreshInterval);

      const duration = Date.now() - startTime;
      console.log(`Refreshed weather for ${location} in ${duration}ms - ${forecast.forecast.length} days fetched`);
    } catch (error) {
      job.status = 'failed';
      console.error(`Failed to refresh weather for ${location}:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Force refresh for a specific location
   */
  async forceRefresh(location: string): Promise<void> {
    let job = this.jobs.get(location);

    if (!job) {
      // Create a temporary job
      this.addLocation(location);
      job = this.jobs.get(location)!;
    }

    await this.refreshLocation(location, job);
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get scheduler configuration
   */
  getConfig(): WeatherSchedulerConfig {
    return { ...this.config };
  }

  /**
   * Update scheduler configuration
   * Note: Requires restart to take effect
   */
  updateConfig(config: Partial<WeatherSchedulerConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    console.log('Scheduler configuration updated. Restart required for changes to take effect.');
  }
}
