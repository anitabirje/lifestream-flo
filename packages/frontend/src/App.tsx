import React, { useState } from 'react';
import WeeklyCalendarGrid from './components/WeeklyCalendarGrid';
import EventDetailModal from './components/EventDetailModal';
import { TimeTrackingDashboard } from './components/TimeTrackingDashboard';
import { Navigation } from './components/Navigation';
import { Event, FamilyMember } from './types/calendar';
import './App.css';

// Mock data for demonstration
const MOCK_FAMILY_MEMBERS: FamilyMember[] = [
  { id: '1', name: 'Alice', email: 'alice@example.com', color: '#3b82f6' },
  { id: '2', name: 'Bob', email: 'bob@example.com', color: '#ef4444' },
  { id: '3', name: 'Charlie', email: 'charlie@example.com', color: '#10b981' },
];

const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    title: 'Team Meeting',
    description: 'Weekly sync with the team',
    startTime: new Date(new Date().setHours(9, 0, 0, 0)),
    endTime: new Date(new Date().setHours(10, 0, 0, 0)),
    location: 'Conference Room A',
    category: 'Work',
    familyMemberId: '1',
    familyMemberName: 'Alice',
    source: 'google',
  },
  {
    id: '2',
    title: 'Lunch with Sarah',
    description: 'Catch up over lunch',
    startTime: new Date(new Date().setHours(12, 0, 0, 0)),
    endTime: new Date(new Date().setHours(13, 0, 0, 0)),
    location: 'Downtown Cafe',
    category: 'Family Time',
    familyMemberId: '2',
    familyMemberName: 'Bob',
    source: 'internal',
  },
  {
    id: '3',
    title: 'Gym Session',
    description: 'Cardio and weights',
    startTime: new Date(new Date().setHours(17, 0, 0, 0)),
    endTime: new Date(new Date().setHours(18, 30, 0, 0)),
    location: 'Fitness Center',
    category: 'Health/Fitness',
    familyMemberId: '3',
    familyMemberName: 'Charlie',
    source: 'internal',
  },
];

function App() {
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<'calendar' | 'dashboard'>('calendar');

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  return (
    <div className="app">
      <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />
      
      <header className="app-header">
        <h1>Flo - Family Calendar</h1>
        <p>AI-powered family calendar with time tracking</p>
      </header>
      
      <main className="app-main">
        {currentPage === 'calendar' ? (
          <>
            <WeeklyCalendarGrid
              events={MOCK_EVENTS}
              familyMembers={MOCK_FAMILY_MEMBERS}
              onEventClick={handleEventClick}
            />
            <EventDetailModal
              event={selectedEvent}
              isOpen={isModalOpen}
              onClose={handleCloseModal}
            />
          </>
        ) : (
          <TimeTrackingDashboard />
        )}
      </main>
    </div>
  );
}

export default App;
