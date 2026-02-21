// Date utility functions for calendar operations

import { WeekRange } from '../types/calendar';

/**
 * Get the start of the week (Monday) for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get the end of the week (Sunday) for a given date
 */
export function getWeekEnd(date: Date): Date {
  const start = getWeekStart(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return end;
}

/**
 * Get the current week range (Monday-Sunday)
 */
export function getCurrentWeekRange(): WeekRange {
  const today = new Date();
  const start = getWeekStart(today);
  const end = getWeekEnd(today);
  
  const weekNumber = getWeekNumber(start);
  const year = start.getFullYear();
  
  return { start, end, weekNumber, year };
}

/**
 * Get week range for a specific date
 */
export function getWeekRangeForDate(date: Date): WeekRange {
  const start = getWeekStart(date);
  const end = getWeekEnd(date);
  
  const weekNumber = getWeekNumber(start);
  const year = start.getFullYear();
  
  return { start, end, weekNumber, year };
}

/**
 * Get the ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Get the next week range
 */
export function getNextWeekRange(weekRange: WeekRange): WeekRange {
  const nextStart = new Date(weekRange.start);
  nextStart.setDate(nextStart.getDate() + 7);
  return getWeekRangeForDate(nextStart);
}

/**
 * Get the previous week range
 */
export function getPreviousWeekRange(weekRange: WeekRange): WeekRange {
  const prevStart = new Date(weekRange.start);
  prevStart.setDate(prevStart.getDate() - 7);
  return getWeekRangeForDate(prevStart);
}

/**
 * Format date as YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date as readable string (e.g., "Monday, Jan 15")
 */
export function formatDateReadable(date: Date): string {
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Get day name from date
 */
export function getDayName(date: Date): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Check if a date is within a week range
 */
export function isDateInWeek(date: Date, weekRange: WeekRange): boolean {
  return date >= weekRange.start && date <= weekRange.end;
}

/**
 * Get all days in a week range
 */
export function getDaysInWeek(weekRange: WeekRange): Date[] {
  const days: Date[] = [];
  const current = new Date(weekRange.start);
  
  while (current <= weekRange.end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return days;
}

/**
 * Format time as HH:MM
 */
export function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Calculate duration in hours between two dates
 */
export function calculateDurationHours(startTime: Date, endTime: Date): number {
  const diffMs = endTime.getTime() - startTime.getTime();
  return diffMs / (1000 * 60 * 60);
}
