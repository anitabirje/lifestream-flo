/**
 * Mobile Calendar View Component
 * Optimized calendar view for mobile devices with touch-friendly interactions
 * Requirements: 2.1, 2.2, 2.3
 */

import React, { useState } from 'react';
import './MobileCalendarView.css';

export interface MobileEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  familyMemberId: string;
  familyMemberName: string;
  category?: string;
  color?: string;
}

export interface MobileCalendarViewProps {
  events: MobileEvent[];
  onEventClick?: (event: MobileEvent) => void;
  onDateChange?: (date: Date) => void;
  loading?: boolean;
}

/**
 * Mobile Calendar View Component
 * Displays calendar in mobile-optimized format with day/week/month views
 */
export const MobileCalendarView: React.FC<MobileCalendarViewProps> = ({
  events,
  onEventClick,
  onDateChange,
  loading = false,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
  const [selectedEvent, setSelectedEvent] = useState<MobileEvent | null>(null);

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
    onDateChange?.(date);
  };

  const handlePreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    handleDateChange(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    handleDateChange(newDate);
  };

  const handleToday = () => {
    handleDateChange(new Date());
  };

  const handleEventClick = (event: MobileEvent) => {
    setSelectedEvent(event);
    onEventClick?.(event);
  };

  const getEventsForDate = (date: Date): MobileEvent[] => {
    return events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const getDayOfWeek = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const dayEvents = getEventsForDate(currentDate);

  if (loading) {
    return (
      <div className="mobile-calendar-container">
        <div className="mobile-loading">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="mobile-calendar-container">
      {/* Header */}
      <div className="mobile-calendar-header">
        <h1>Calendar</h1>
        <div className="view-mode-selector">
          <button
            className={`view-mode-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            Day
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Week
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="mobile-date-navigation">
        <button className="nav-btn" onClick={handlePreviousDay} aria-label="Previous day">
          ←
        </button>
        <div className="current-date">
          <div className="date-display">{formatDate(currentDate)}</div>
          <div className="day-of-week">{getDayOfWeek(currentDate)}</div>
        </div>
        <button className="nav-btn" onClick={handleNextDay} aria-label="Next day">
          →
        </button>
      </div>

      {/* Today Button */}
      <div className="today-button-container">
        <button className="today-btn" onClick={handleToday}>
          Today
        </button>
      </div>

      {/* Events List */}
      <div className="mobile-events-list">
        {dayEvents.length === 0 ? (
          <div className="no-events">
            <p>No events scheduled for this day</p>
          </div>
        ) : (
          dayEvents.map((event) => (
            <div
              key={event.id}
              className={`mobile-event-card ${selectedEvent?.id === event.id ? 'selected' : ''}`}
              onClick={() => handleEventClick(event)}
              style={{ borderLeftColor: event.color || '#3B82F6' }}
            >
              <div className="event-time">
                <span className="time-start">{formatTime(event.startTime)}</span>
                <span className="time-separator">-</span>
                <span className="time-end">{formatTime(event.endTime)}</span>
              </div>
              <div className="event-details">
                <h3 className="event-title">{event.title}</h3>
                <p className="event-member">{event.familyMemberName}</p>
                {event.category && <span className="event-category">{event.category}</span>}
              </div>
              <div className="event-indicator">›</div>
            </div>
          ))
        )}
      </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="mobile-event-modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="mobile-event-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedEvent.title}</h2>
              <button className="close-btn" onClick={() => setSelectedEvent(null)}>
                ✕
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-section">
                <label>Time</label>
                <p>
                  {formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}
                </p>
              </div>
              <div className="modal-section">
                <label>Family Member</label>
                <p>{selectedEvent.familyMemberName}</p>
              </div>
              {selectedEvent.category && (
                <div className="modal-section">
                  <label>Category</label>
                  <p>{selectedEvent.category}</p>
                </div>
              )}
              <div className="modal-actions">
                <button className="modal-btn primary">Edit</button>
                <button className="modal-btn secondary">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileCalendarView;
