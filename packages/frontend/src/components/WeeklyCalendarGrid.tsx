import React, { useState, useMemo } from 'react';
import { Event, WeekRange, FamilyMember } from '../types/calendar';
import {
  getCurrentWeekRange,
  getNextWeekRange,
  getPreviousWeekRange,
  getDaysInWeek,
  formatDateReadable,
  getDayName,
  formatTime,
} from '../utils/dateUtils';
import './WeeklyCalendarGrid.css';

interface WeeklyCalendarGridProps {
  events: Event[];
  familyMembers: FamilyMember[];
  onEventClick?: (event: Event) => void;
}

interface EventPosition {
  event: Event;
  dayIndex: number;
  startHour: number;
  duration: number;
}

const HOURS_PER_DAY = 24;
const HOUR_HEIGHT = 60; // pixels

export const WeeklyCalendarGrid: React.FC<WeeklyCalendarGridProps> = ({
  events,
  familyMembers,
  onEventClick,
}) => {
  const [weekRange, setWeekRange] = useState<WeekRange>(getCurrentWeekRange());

  const days = useMemo(() => getDaysInWeek(weekRange), [weekRange]);

  const eventsByDay = useMemo(() => {
    const grouped: Record<string, Event[]> = {};
    
    days.forEach((day) => {
      const dayKey = day.toISOString().split('T')[0];
      grouped[dayKey] = [];
    });

    events.forEach((event) => {
      const eventDate = new Date(event.startTime);
      const dayKey = eventDate.toISOString().split('T')[0];
      
      if (grouped[dayKey]) {
        grouped[dayKey].push(event);
      }
    });

    return grouped;
  }, [events, days]);

  const eventPositions = useMemo(() => {
    const positions: EventPosition[] = [];

    days.forEach((day, dayIndex) => {
      const dayKey = day.toISOString().split('T')[0];
      const dayEvents = eventsByDay[dayKey] || [];

      dayEvents.forEach((event) => {
        const startTime = new Date(event.startTime);
        const endTime = new Date(event.endTime);
        
        const startHour = startTime.getHours() + startTime.getMinutes() / 60;
        const endHour = endTime.getHours() + endTime.getMinutes() / 60;
        const duration = Math.max(endHour - startHour, 0.5); // Minimum 30 minutes

        positions.push({
          event,
          dayIndex,
          startHour,
          duration,
        });
      });
    });

    return positions;
  }, [days, eventsByDay]);

  const getMemberColor = (memberId: string): string => {
    const member = familyMembers.find((m) => m.id === memberId);
    return member?.color || '#3b82f6';
  };

  const handlePreviousWeek = () => {
    setWeekRange(getPreviousWeekRange(weekRange));
  };

  const handleNextWeek = () => {
    setWeekRange(getNextWeekRange(weekRange));
  };

  const handleToday = () => {
    setWeekRange(getCurrentWeekRange());
  };

  return (
    <div className="weekly-calendar-grid">
      <div className="calendar-header">
        <div className="week-navigation">
          <button onClick={handlePreviousWeek} className="nav-button">
            ← Previous
          </button>
          <button onClick={handleToday} className="nav-button">
            Today
          </button>
          <button onClick={handleNextWeek} className="nav-button">
            Next →
          </button>
        </div>
        <div className="week-info">
          <h2>
            Week {weekRange.weekNumber} of {weekRange.year}
          </h2>
          <p>
            {formatDateReadable(weekRange.start)} - {formatDateReadable(weekRange.end)}
          </p>
        </div>
      </div>

      <div className="calendar-container">
        <div className="time-column">
          <div className="time-header"></div>
          {Array.from({ length: HOURS_PER_DAY }).map((_, hour) => (
            <div
              key={`time-${hour}`}
              className="time-slot"
              style={{ height: `${HOUR_HEIGHT}px` }}
            >
              <span className="time-label">{String(hour).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        <div className="days-container">
          <div className="days-header">
            {days.map((day, index) => (
              <div key={`day-header-${index}`} className="day-header">
                <div className="day-name">{getDayName(day)}</div>
                <div className="day-date">{day.getDate()}</div>
              </div>
            ))}
          </div>

          <div className="days-grid">
            {days.map((_, dayIndex) => (
              <div
                key={`day-${dayIndex}`}
                className="day-column"
                style={{
                  height: `${HOURS_PER_DAY * HOUR_HEIGHT}px`,
                }}
              >
                {Array.from({ length: HOURS_PER_DAY }).map((_, hour) => (
                  <div
                    key={`hour-${dayIndex}-${hour}`}
                    className="hour-slot"
                    style={{ height: `${HOUR_HEIGHT}px` }}
                  />
                ))}

                {eventPositions
                  .filter((pos) => pos.dayIndex === dayIndex)
                  .map((pos, index) => (
                    <div
                      key={`event-${dayIndex}-${index}`}
                      className="event-block"
                      style={{
                        top: `${pos.startHour * HOUR_HEIGHT}px`,
                        height: `${pos.duration * HOUR_HEIGHT}px`,
                        backgroundColor: getMemberColor(pos.event.familyMemberId),
                      }}
                      onClick={() => onEventClick?.(pos.event)}
                    >
                      <div className="event-content">
                        <div className="event-title">{pos.event.title}</div>
                        <div className="event-time">
                          {formatTime(new Date(pos.event.startTime))} -{' '}
                          {formatTime(new Date(pos.event.endTime))}
                        </div>
                        <div className="event-member">{pos.event.familyMemberName}</div>
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyCalendarGrid;
