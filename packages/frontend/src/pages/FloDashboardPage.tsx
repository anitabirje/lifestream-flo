import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './FloDashboardPage.css';

export const FloDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    // Animate bars on load
    const bars = document.querySelectorAll('.bar');
    bars.forEach((bar, index) => {
      const targetHeight = bar.getAttribute('data-height');
      if (targetHeight) {
        setTimeout(() => {
          (bar as HTMLElement).style.height = targetHeight + 'px';
        }, index * 150);
      }
    });
  }, []);

  const handleEventClick = (title: string, time: string, member: string) => {
    alert(`Event Details:\n\n${title}\n${time}\n${member}`);
  };

  const handleWeekNav = (action: string) => {
    alert('Week navigation: ' + action);
  };

  const handleHomeClick = () => {
    navigate('/');
  };

  return (
    <div className="flo-dashboard-container">
      {/* Header */}
      <div className="flo-header">
        <div className="header-left">
         
          <div>
            <h1 onClick={handleHomeClick}> 🌸 <span className="nav-link-gradient-text" onClick={handleHomeClick}>Flo</span> Family Calendar</h1>
            <p style={{ opacity: 0.9, marginTop: '5px' }}>Your family's time, beautifully organized</p>
          </div>
        </div>
        <div className="header-info">
          <div className="date">Week of Feb 23 - Mar 1, 2026</div>
          <div className="weather">☀️ 72°F • Sunny • Seattle, WA</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Dashboard Grid */}
        <div className="dashboard-grid">
          {/* Activity Highlights */}
          <div className="activity-highlights">
            <h2>📊 Activity Category Highlights</h2>
            <div className="category-cards">
              <div className="category-card work">
                <h3>Work</h3>
                <div className="hours">32.5h</div>
                <div className="comparison">Target: 40h/week</div>
                <span className="status warning">Under Target</span>
              </div>
              <div className="category-card family">
                <h3>Family Time</h3>
                <div className="hours">18h</div>
                <div className="comparison">Target: 15h/week</div>
                <span className="status good">On Track</span>
              </div>
              <div className="category-card health">
                <h3>Health & Fitness</h3>
                <div className="hours">6h</div>
                <div className="comparison">Target: 7h/week</div>
                <span className="status good">Nearly There</span>
              </div>
              <div className="category-card upskilling">
                <h3>Upskilling</h3>
                <div className="hours">2h</div>
                <div className="comparison">Target: 5h/week</div>
                <span className="status alert">Needs Attention</span>
              </div>
              <div className="category-card relaxation">
                <h3>Relaxation</h3>
                <div className="hours">12h</div>
                <div className="comparison">Target: 10h/week</div>
                <span className="status good">Perfect</span>
              </div>
            </div>
          </div>

          {/* Time Tracking Chart */}
          <div className="time-tracking">
            <h2>📈 Weekly Time Distribution</h2>
            <div className="chart-container">
              <div className="bar-wrapper">
                <div className="bar work" data-height="162.5" style={{ height: '0px' }}>
                  <div className="bar-value">32.5h</div>
                </div>
                <div className="bar-label">Work</div>
              </div>
              <div className="bar-wrapper">
                <div className="bar family" data-height="90" style={{ height: '0px' }}>
                  <div className="bar-value">18h</div>
                </div>
                <div className="bar-label">Family</div>
              </div>
              <div className="bar-wrapper">
                <div className="bar health" data-height="30" style={{ height: '0px' }}>
                  <div className="bar-value">6h</div>
                </div>
                <div className="bar-label">Health</div>
              </div>
              <div className="bar-wrapper">
                <div className="bar upskilling" data-height="10" style={{ height: '0px' }}>
                  <div className="bar-value">2h</div>
                </div>
                <div className="bar-label">Upskill</div>
              </div>
              <div className="bar-wrapper">
                <div className="bar relaxation" data-height="60" style={{ height: '0px' }}>
                  <div className="bar-value">12h</div>
                </div>
                <div className="bar-label">Relax</div>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Section */}
        <div className="calendar-section">
          <div className="calendar-header">
            <h2>📅 Consolidated Family Calendar</h2>
            <div className="week-nav">
              <button onClick={() => handleWeekNav('← Previous')}>← Previous</button>
              <button onClick={() => handleWeekNav('Today')}>Today</button>
              <button onClick={() => handleWeekNav('Next →')}>Next →</button>
            </div>
          </div>

          <div className="calendar-grid">
            {/* Header Row */}
            <div className="time-label">Time</div>
            <div className="calendar-header-cell">Mon<br />Feb 23</div>
            <div className="calendar-header-cell">Tue<br />Feb 24</div>
            <div className="calendar-header-cell">Wed<br />Feb 25</div>
            <div className="calendar-header-cell">Thu<br />Feb 26</div>
            <div className="calendar-header-cell">Fri<br />Feb 27</div>
            <div className="calendar-header-cell">Sat<br />Feb 28</div>
            <div className="calendar-header-cell">Sun<br />Mar 1</div>

            {/* Morning (6 AM - 12 PM) */}
            <div className="time-label">Morning<br />6-12</div>
            <div className="calendar-cell">
              <div className="event work" onClick={() => handleEventClick('Team Standup', '9:00 - 9:30 AM', '👤 Sarah')}>
                <div className="event-title">Team Standup</div>
                <div className="event-time">9:00 - 9:30 AM</div>
                <div className="event-member">👤 Sarah</div>
              </div>
              <div className="event health" onClick={() => handleEventClick('Gym Session', '6:30 - 7:30 AM', '👤 John')}>
                <div className="event-title">Gym Session</div>
                <div className="event-time">6:30 - 7:30 AM</div>
                <div className="event-member">👤 John</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event work" onClick={() => handleEventClick('Client Meeting', '10:00 - 11:00 AM', '👤 Sarah')}>
                <div className="event-title">Client Meeting</div>
                <div className="event-time">10:00 - 11:00 AM</div>
                <div className="event-member">👤 Sarah</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event work" onClick={() => handleEventClick('Design Review', '9:00 - 10:30 AM', '👤 Sarah')}>
                <div className="event-title">Design Review</div>
                <div className="event-time">9:00 - 10:30 AM</div>
                <div className="event-member">👤 Sarah</div>
              </div>
              <div className="event health" onClick={() => handleEventClick('Yoga Class', '7:00 - 8:00 AM', '👤 Sarah')}>
                <div className="event-title">Yoga Class</div>
                <div className="event-time">7:00 - 8:00 AM</div>
                <div className="event-member">👤 Sarah</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event work" onClick={() => handleEventClick('Sprint Planning', '10:00 AM - 12:00 PM', '👤 Sarah')}>
                <div className="event-title">Sprint Planning</div>
                <div className="event-time">10:00 AM - 12:00 PM</div>
                <div className="event-member">👤 Sarah</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event work" onClick={() => handleEventClick('1-on-1 with Manager', '11:00 - 11:30 AM', '👤 Sarah')}>
                <div className="event-title">1-on-1 with Manager</div>
                <div className="event-time">11:00 - 11:30 AM</div>
                <div className="event-member">👤 Sarah</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event family" onClick={() => handleEventClick('Farmers Market', '9:00 - 11:00 AM', '👥 Family')}>
                <div className="event-title">Farmers Market</div>
                <div className="event-time">9:00 - 11:00 AM</div>
                <div className="event-member">👥 Family</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event family" onClick={() => handleEventClick('Brunch with Parents', '10:00 AM - 12:00 PM', '👥 Family')}>
                <div className="event-title">Brunch with Parents</div>
                <div className="event-time">10:00 AM - 12:00 PM</div>
                <div className="event-member">👥 Family</div>
              </div>
            </div>

            {/* Afternoon (12 PM - 6 PM) */}
            <div className="time-label">Afternoon<br />12-6</div>
            <div className="calendar-cell">
              <div className="event work" onClick={() => handleEventClick('Code Review', '2:00 - 3:00 PM', '👤 Sarah')}>
                <div className="event-title">Code Review</div>
                <div className="event-time">2:00 - 3:00 PM</div>
                <div className="event-member">👤 Sarah</div>
              </div>
              <div className="event family" onClick={() => handleEventClick("Emma's Soccer", '4:00 - 5:30 PM', '👤 Emma')}>
                <div className="event-title">Emma's Soccer</div>
                <div className="event-time">4:00 - 5:30 PM</div>
                <div className="event-member">👤 Emma</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event upskilling" onClick={() => handleEventClick('AWS Course', '1:00 - 2:00 PM', '👤 John')}>
                <div className="event-title">AWS Course</div>
                <div className="event-time">1:00 - 2:00 PM</div>
                <div className="event-member">👤 John</div>
              </div>
              <div className="event family" onClick={() => handleEventClick('Pick up Kids', '3:30 PM', '👤 Sarah')}>
                <div className="event-title">Pick up Kids</div>
                <div className="event-time">3:30 PM</div>
                <div className="event-member">👤 Sarah</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event work" onClick={() => handleEventClick('Product Demo', '3:00 - 4:00 PM', '👤 Sarah')}>
                <div className="event-title">Product Demo</div>
                <div className="event-time">3:00 - 4:00 PM</div>
                <div className="event-member">👤 Sarah</div>
              </div>
              <div className="event family" onClick={() => handleEventClick('Piano Lesson', '4:30 - 5:30 PM', '👤 Emma')}>
                <div className="event-title">Piano Lesson</div>
                <div className="event-time">4:30 - 5:30 PM</div>
                <div className="event-member">👤 Emma</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event work" onClick={() => handleEventClick('Team Retrospective', '2:00 - 3:00 PM', '👤 Sarah')}>
                <div className="event-title">Team Retrospective</div>
                <div className="event-time">2:00 - 3:00 PM</div>
                <div className="event-member">👤 Sarah</div>
              </div>
              <div className="event health" onClick={() => handleEventClick('Dentist Appt', '4:00 - 5:00 PM', '👤 Emma')}>
                <div className="event-title">Dentist Appt</div>
                <div className="event-time">4:00 - 5:00 PM</div>
                <div className="event-member">👤 Emma</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event relaxation" onClick={() => handleEventClick('Book Club', '2:00 - 4:00 PM', '👤 Sarah')}>
                <div className="event-title">Book Club</div>
                <div className="event-time">2:00 - 4:00 PM</div>
                <div className="event-member">👤 Sarah</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event family" onClick={() => handleEventClick('Birthday Party', '2:00 - 5:00 PM', '👤 Emma')}>
                <div className="event-title">Birthday Party</div>
                <div className="event-time">2:00 - 5:00 PM</div>
                <div className="event-member">👤 Emma</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event family" onClick={() => handleEventClick('Family Movie', '3:00 - 5:00 PM', '👥 Family')}>
                <div className="event-title">Family Movie</div>
                <div className="event-time">3:00 - 5:00 PM</div>
                <div className="event-member">👥 Family</div>
              </div>
            </div>

            {/* Evening (6 PM - 10 PM) */}
            <div className="time-label">Evening<br />6-10</div>
            <div className="calendar-cell">
              <div className="event family" onClick={() => handleEventClick('Family Dinner', '6:30 - 7:30 PM', '👥 Family')}>
                <div className="event-title">Family Dinner</div>
                <div className="event-time">6:30 - 7:30 PM</div>
                <div className="event-member">👥 Family</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event family" onClick={() => handleEventClick('Homework Help', '7:00 - 8:00 PM', '👤 John')}>
                <div className="event-title">Homework Help</div>
                <div className="event-time">7:00 - 8:00 PM</div>
                <div className="event-member">👤 John</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event family" onClick={() => handleEventClick('Game Night', '7:00 - 9:00 PM', '👥 Family')}>
                <div className="event-title">Game Night</div>
                <div className="event-time">7:00 - 9:00 PM</div>
                <div className="event-member">👥 Family</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event relaxation" onClick={() => handleEventClick('Meditation', '8:00 - 8:30 PM', '👤 Sarah')}>
                <div className="event-title">Meditation</div>
                <div className="event-time">8:00 - 8:30 PM</div>
                <div className="event-member">👤 Sarah</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event family" onClick={() => handleEventClick('Date Night', '7:00 - 10:00 PM', '👤 Sarah & John')}>
                <div className="event-title">Date Night</div>
                <div className="event-time">7:00 - 10:00 PM</div>
                <div className="event-member">👤 Sarah & John</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event family" onClick={() => handleEventClick('BBQ Dinner', '6:00 - 8:00 PM', '👥 Family')}>
                <div className="event-title">BBQ Dinner</div>
                <div className="event-time">6:00 - 8:00 PM</div>
                <div className="event-member">👥 Family</div>
              </div>
            </div>
            <div className="calendar-cell">
              <div className="event relaxation" onClick={() => handleEventClick('Netflix & Chill', '8:00 - 10:00 PM', '👥 Family')}>
                <div className="event-title">Netflix & Chill</div>
                <div className="event-time">8:00 - 10:00 PM</div>
                <div className="event-member">👥 Family</div>
              </div>
            </div>
          </div>

          {/* Family Members Legend */}
          <div className="family-legend">
            <div className="family-member">
              <span className="member-dot" style={{ background: '#3b82f6' }}></span>
              <span>Sarah (Mom)</span>
            </div>
            <div className="family-member">
              <span className="member-dot" style={{ background: '#10b981' }}></span>
              <span>John (Dad)</span>
            </div>
            <div className="family-member">
              <span className="member-dot" style={{ background: '#f59e0b' }}></span>
              <span>Emma (Daughter, 10)</span>
            </div>
            <div className="family-member">
              <span className="member-dot" style={{ background: '#8b5cf6' }}></span>
              <span>Family Events</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
