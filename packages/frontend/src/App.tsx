import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './services/auth-context';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Footer } from './components/Footer';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { FloDashboardPage } from './pages/FloDashboardPage';
import WeeklyCalendarGrid from './components/WeeklyCalendarGrid';
import EventDetailModal from './components/EventDetailModal';
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

const AppDashboard: React.FC = () => {
  const [selectedEvent, setSelectedEvent] = React.useState<Event | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

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
      <header className="app-header">
        <h1>Flo - Family Calendar</h1>
        <p>AI-powered family calendar with time tracking</p>
      </header>
      
      <main className="app-main">
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
      </main>

      <Footer />
    </div>
  );
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<FloDashboardPage />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
