/**
 * Calendar Cache Service
 * Manages offline caching of calendar data for the current week
 */

export interface CachedEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  familyMemberId: string;
  category: string;
  description?: string;
  location?: string;
}

export interface WeekData {
  weekStart: string; // ISO date string
  weekEnd: string; // ISO date string
  events: CachedEvent[];
  cachedAt: string; // ISO timestamp
}

const CURRENT_WEEK_KEY = 'flo_current_week';
const MAX_CACHE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export class CalendarCacheService {
  /**
   * Get the start and end dates for the current week (Monday-Sunday)
   */
  private getCurrentWeekRange(): { start: Date; end: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to Monday
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { start: weekStart, end: weekEnd };
  }

  /**
   * Cache the current week's calendar data
   */
  async cacheCurrentWeek(events: CachedEvent[]): Promise<void> {
    const { start, end } = this.getCurrentWeekRange();
    
    const weekData: WeekData = {
      weekStart: start.toISOString(),
      weekEnd: end.toISOString(),
      events,
      cachedAt: new Date().toISOString(),
    };
    
    try {
      localStorage.setItem(CURRENT_WEEK_KEY, JSON.stringify(weekData));
    } catch (error) {
      console.error('Failed to cache calendar data:', error);
    }
  }

  /**
   * Get cached calendar data for the current week
   */
  async getCachedCurrentWeek(): Promise<WeekData | null> {
    try {
      const cached = localStorage.getItem(CURRENT_WEEK_KEY);
      if (!cached) {
        return null;
      }
      
      const weekData: WeekData = JSON.parse(cached);
      
      // Check if cache is still valid
      const cachedAt = new Date(weekData.cachedAt);
      const now = new Date();
      const age = now.getTime() - cachedAt.getTime();
      
      if (age > MAX_CACHE_AGE_MS) {
        // Cache expired
        this.clearCache();
        return null;
      }
      
      // Check if we're still in the same week
      const { start, end } = this.getCurrentWeekRange();
      const cachedStart = new Date(weekData.weekStart);
      const cachedEnd = new Date(weekData.weekEnd);
      
      if (
        start.getTime() !== cachedStart.getTime() ||
        end.getTime() !== cachedEnd.getTime()
      ) {
        // Week has changed
        this.clearCache();
        return null;
      }
      
      return weekData;
    } catch (error) {
      console.error('Failed to retrieve cached calendar data:', error);
      return null;
    }
  }

  /**
   * Clear all cached calendar data
   */
  clearCache(): void {
    try {
      localStorage.removeItem(CURRENT_WEEK_KEY);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Check if we have valid cached data
   */
  async hasCachedData(): Promise<boolean> {
    const cached = await this.getCachedCurrentWeek();
    return cached !== null;
  }
}

export const calendarCache = new CalendarCacheService();
