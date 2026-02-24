/**
 * Demo Data Setup Script for Flo Video Demonstration
 * 
 * This script populates the Flo application with realistic demo data
 * for the Johnson family to showcase all key features in the video.
 * 
 * Usage:
 *   ts-node demo-data-setup.ts
 * 
 * Or add to package.json:
 *   "demo:setup": "ts-node demo-data-setup.ts"
 */

import { v4 as uuidv4 } from 'uuid';

// Demo family configuration
const DEMO_FAMILY = {
  userId: 'demo-user-sarah-johnson',
  email: 'sarah@example.com',
  password: 'Demo123!', // For demo purposes only
  familyName: 'Johnson Family',
  members: [
    { id: 'member-sarah', name: 'Sarah Johnson', role: 'Mom', color: '#3B82F6' }, // Blue
    { id: 'member-tom', name: 'Tom Johnson', role: 'Dad', color: '#10B981' },     // Green
    { id: 'member-emma', name: 'Emma Johnson', role: 'Daughter', age: 12, color: '#8B5CF6' }, // Purple
    { id: 'member-jake', name: 'Jake Johnson', role: 'Son', age: 9, color: '#F59E0B' },       // Orange
  ],
};

// Activity categories with ideal vs actual time
const CATEGORIES = [
  { id: 'cat-work', name: 'Work', color: '#3B82F6', idealHours: 40, actualHours: 45 },
  { id: 'cat-family', name: 'Family Time', color: '#EC4899', idealHours: 10, actualHours: 6 },
  { id: 'cat-health', name: 'Health/Fitness', color: '#10B981', idealHours: 5, actualHours: 3 },
  { id: 'cat-relaxation', name: 'Relaxation', color: '#8B5CF6', idealHours: 5, actualHours: 2 },
  { id: 'cat-kids', name: "Kids' Activities", color: '#F59E0B', idealHours: 8, actualHours: 8 },
  { id: 'cat-upskilling', name: 'Learning/Upskilling', color: '#06B6D4', idealHours: 3, actualHours: 1 },
];

// Get current week's dates (Monday to Sunday)
function getWeekDates(): Date[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  monday.setHours(0, 0, 0, 0);
  
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    dates.push(date);
  }
  return dates;
}

// Helper to create event time
function createEventTime(date: Date, startHour: number, durationHours: number) {
  const start = new Date(date);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(startHour + durationHours, 0, 0, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

// Generate demo events for the week
function generateDemoEvents() {
  const weekDates = getWeekDates();
  const events: any[] = [];

  // Monday
  events.push({
    id: uuidv4(),
    title: 'Team Standup',
    ...createEventTime(weekDates[0], 9, 0.5),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-work',
    description: 'Daily team sync meeting',
  });
  events.push({
    id: uuidv4(),
    title: 'Client Presentation Prep',
    ...createEventTime(weekDates[0], 10, 2),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-work',
    description: 'Prepare slides for Thursday presentation',
  });
  events.push({
    id: uuidv4(),
    title: 'Morning Workout',
    ...createEventTime(weekDates[0], 6, 1),
    familyMemberId: 'member-tom',
    categoryId: 'cat-health',
    description: 'Gym session - chest and triceps',
  });
  events.push({
    id: uuidv4(),
    title: 'Emma Soccer Practice',
    ...createEventTime(weekDates[0], 16, 1.5),
    familyMemberId: 'member-emma',
    categoryId: 'cat-kids',
    description: 'Soccer practice at Lincoln Field',
    location: 'Lincoln Field',
  });
  events.push({
    id: uuidv4(),
    title: 'Family Dinner',
    ...createEventTime(weekDates[0], 18, 1),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-family',
    description: 'Dinner together at home',
  });

  // Tuesday - CONFLICT DAY
  events.push({
    id: uuidv4(),
    title: 'Project Review Meeting',
    ...createEventTime(weekDates[1], 9, 1),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-work',
    description: 'Q1 project review with stakeholders',
  });
  events.push({
    id: uuidv4(),
    title: 'Budget Planning Session',
    ...createEventTime(weekDates[1], 13, 2),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-work',
    description: 'Q2 budget planning',
  });
  // CONFLICT: Both Sarah and Tom busy at 3 PM
  events.push({
    id: uuidv4(),
    title: 'Executive Committee Meeting',
    ...createEventTime(weekDates[1], 15, 1.5),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-work',
    description: 'Monthly exec committee',
  });
  events.push({
    id: uuidv4(),
    title: 'Dentist Appointment',
    ...createEventTime(weekDates[1], 15, 1),
    familyMemberId: 'member-tom',
    categoryId: 'cat-health',
    description: 'Regular checkup - Dr. Smith',
    location: 'Downtown Dental',
  });
  events.push({
    id: uuidv4(),
    title: 'Jake Piano Lesson',
    ...createEventTime(weekDates[1], 16, 1),
    familyMemberId: 'member-jake',
    categoryId: 'cat-kids',
    description: 'Piano lesson with Mrs. Anderson',
    location: 'Anderson Music Studio',
  });

  // Wednesday
  events.push({
    id: uuidv4(),
    title: 'Morning Workout',
    ...createEventTime(weekDates[2], 6, 1),
    familyMemberId: 'member-tom',
    categoryId: 'cat-health',
    description: 'Gym session - back and biceps',
  });
  events.push({
    id: uuidv4(),
    title: 'Team Standup',
    ...createEventTime(weekDates[2], 9, 0.5),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-work',
    description: 'Daily team sync meeting',
  });
  events.push({
    id: uuidv4(),
    title: 'Code Review',
    ...createEventTime(weekDates[2], 11, 1.5),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-work',
    description: 'Review PRs from team',
  });
  events.push({
    id: uuidv4(),
    title: 'Emma Soccer Practice',
    ...createEventTime(weekDates[2], 16, 1.5),
    familyMemberId: 'member-emma',
    categoryId: 'cat-kids',
    description: 'Soccer practice at Lincoln Field',
    location: 'Lincoln Field',
  });
  events.push({
    id: uuidv4(),
    title: 'Date Night',
    ...createEventTime(weekDates[2], 19, 2),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-family',
    description: 'Dinner at Italian restaurant',
    location: 'Bella Vista Restaurant',
  });

  // Thursday
  events.push({
    id: uuidv4(),
    title: 'Team Standup',
    ...createEventTime(weekDates[3], 9, 0.5),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-work',
    description: 'Daily team sync meeting',
  });
  events.push({
    id: uuidv4(),
    title: 'Client Presentation',
    ...createEventTime(weekDates[3], 14, 2),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-work',
    description: 'Q2 roadmap presentation to client',
  });
  events.push({
    id: uuidv4(),
    title: 'Jake Piano Lesson',
    ...createEventTime(weekDates[3], 16, 1),
    familyMemberId: 'member-jake',
    categoryId: 'cat-kids',
    description: 'Piano lesson with Mrs. Anderson',
    location: 'Anderson Music Studio',
  });
  // SUGGESTED TIME SLOT (to be added via booking suggestion)
  // Workout Thursday 6 PM for health category

  // Friday
  events.push({
    id: uuidv4(),
    title: 'Morning Workout',
    ...createEventTime(weekDates[4], 6, 1),
    familyMemberId: 'member-tom',
    categoryId: 'cat-health',
    description: 'Gym session - legs',
  });
  events.push({
    id: uuidv4(),
    title: 'Team Standup',
    ...createEventTime(weekDates[4], 9, 0.5),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-work',
    description: 'Daily team sync meeting',
  });
  events.push({
    id: uuidv4(),
    title: 'Sprint Planning',
    ...createEventTime(weekDates[4], 10, 2),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-work',
    description: 'Plan next sprint with team',
  });
  events.push({
    id: uuidv4(),
    title: 'Emma Soccer Practice',
    ...createEventTime(weekDates[4], 16, 1.5),
    familyMemberId: 'member-emma',
    categoryId: 'cat-kids',
    description: 'Soccer practice at Lincoln Field',
    location: 'Lincoln Field',
  });
  events.push({
    id: uuidv4(),
    title: 'Movie Night',
    ...createEventTime(weekDates[4], 19, 2),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-family',
    description: 'Family movie night at home',
  });

  // Saturday
  events.push({
    id: uuidv4(),
    title: 'Emma Soccer Game',
    ...createEventTime(weekDates[5], 10, 2),
    familyMemberId: 'member-emma',
    categoryId: 'cat-kids',
    description: 'Soccer game vs. Riverside United',
    location: 'Central Sports Complex',
  });
  events.push({
    id: uuidv4(),
    title: 'Grocery Shopping',
    ...createEventTime(weekDates[5], 14, 1.5),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-family',
    description: 'Weekly grocery shopping',
    location: 'Whole Foods',
  });
  events.push({
    id: uuidv4(),
    title: 'Park Playdate',
    ...createEventTime(weekDates[5], 16, 2),
    familyMemberId: 'member-jake',
    categoryId: 'cat-kids',
    description: 'Playdate with friends at park',
    location: 'Riverside Park',
  });

  // Sunday
  events.push({
    id: uuidv4(),
    title: 'Family Brunch',
    ...createEventTime(weekDates[6], 10, 1.5),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-family',
    description: 'Sunday brunch together',
  });
  events.push({
    id: uuidv4(),
    title: 'Meal Prep',
    ...createEventTime(weekDates[6], 14, 2),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-family',
    description: 'Prepare meals for the week',
  });
  events.push({
    id: uuidv4(),
    title: 'Reading Time',
    ...createEventTime(weekDates[6], 19, 1),
    familyMemberId: 'member-sarah',
    categoryId: 'cat-relaxation',
    description: 'Personal reading time',
  });

  return events;
}

// Generate time booking suggestions
function generateBookingSuggestions() {
  const weekDates = getWeekDates();
  
  return [
    {
      id: uuidv4(),
      categoryId: 'cat-health',
      categoryName: 'Health/Fitness',
      message: 'You wanted 5 hours for health this week, but only have 3 scheduled. How about booking a workout?',
      suggestedSlots: [
        {
          ...createEventTime(weekDates[3], 18, 1), // Thursday 6 PM
          title: 'Evening Workout',
          familyMemberId: 'member-sarah',
        },
        {
          ...createEventTime(weekDates[5], 8, 1), // Saturday 8 AM
          title: 'Morning Yoga',
          familyMemberId: 'member-sarah',
        },
      ],
    },
    {
      id: uuidv4(),
      categoryId: 'cat-family',
      categoryName: 'Family Time',
      message: 'Family time is 4 hours below your target. Consider scheduling quality time together.',
      suggestedSlots: [
        {
          ...createEventTime(weekDates[6], 16, 2), // Sunday 4 PM
          title: 'Family Game Night',
          familyMemberId: 'member-sarah',
        },
      ],
    },
    {
      id: uuidv4(),
      categoryId: 'cat-relaxation',
      categoryName: 'Relaxation',
      message: 'You need more downtime. Only 2 hours scheduled vs. 5 hour goal.',
      suggestedSlots: [
        {
          ...createEventTime(weekDates[4], 20, 1.5), // Friday 8 PM
          title: 'Relaxation Time',
          familyMemberId: 'member-sarah',
        },
      ],
    },
  ];
}

// Generate threshold alerts
function generateThresholdAlerts() {
  return [
    {
      id: uuidv4(),
      type: 'exceeded',
      categoryId: 'cat-work',
      categoryName: 'Work',
      threshold: 40,
      actual: 45,
      message: 'Work time exceeded by 5 hours this week',
      severity: 'warning',
    },
    {
      id: uuidv4(),
      type: 'below',
      categoryId: 'cat-family',
      categoryName: 'Family Time',
      threshold: 10,
      actual: 6,
      message: 'Family time is 4 hours below target',
      severity: 'info',
    },
    {
      id: uuidv4(),
      type: 'below',
      categoryId: 'cat-health',
      categoryName: 'Health/Fitness',
      threshold: 5,
      actual: 3,
      message: 'Health/Fitness time is 2 hours below target',
      severity: 'info',
    },
  ];
}

// Generate conflict notifications
function generateConflicts() {
  const weekDates = getWeekDates();
  
  return [
    {
      id: uuidv4(),
      type: 'scheduling_conflict',
      message: 'Conflict detected: Sarah and Tom both busy Tuesday 3 PM',
      events: [
        {
          title: 'Executive Committee Meeting',
          familyMember: 'Sarah Johnson',
          time: createEventTime(weekDates[1], 15, 1.5),
        },
        {
          title: 'Dentist Appointment',
          familyMember: 'Tom Johnson',
          time: createEventTime(weekDates[1], 15, 1),
        },
      ],
      resolutionOptions: [
        'Reschedule dentist to Wednesday 3 PM',
        'Ask Tom to take Jake to piano lesson',
        'Move exec meeting to 4:30 PM',
      ],
    },
  ];
}

// Generate weather data
function generateWeatherData() {
  const weekDates = getWeekDates();
  const conditions = ['Sunny', 'Partly Cloudy', 'Cloudy', 'Rainy', 'Sunny', 'Sunny', 'Partly Cloudy'];
  const temps = [72, 68, 65, 58, 70, 75, 73];
  
  return weekDates.map((date, index) => ({
    date: date.toISOString().split('T')[0],
    condition: conditions[index],
    temperature: temps[index],
    icon: conditions[index].toLowerCase().replace(' ', '-'),
  }));
}

// Generate extracurricular activities
function generateExtracurricularActivities() {
  return [
    {
      id: uuidv4(),
      name: "Emma's Soccer Team",
      familyMemberId: 'member-emma',
      type: 'Sports',
      schedule: 'Monday, Wednesday, Friday 4:00 PM - 5:30 PM',
      location: 'Lincoln Field',
      coach: 'Coach Martinez',
      season: 'Spring 2024',
    },
    {
      id: uuidv4(),
      name: "Jake's Piano Lessons",
      familyMemberId: 'member-jake',
      type: 'Music',
      schedule: 'Tuesday, Thursday 4:00 PM - 5:00 PM',
      location: 'Anderson Music Studio',
      instructor: 'Mrs. Anderson',
    },
  ];
}

// Main setup function
export async function setupDemoData() {
  console.log('🎬 Setting up demo data for Flo video demonstration...\n');

  const demoData = {
    family: DEMO_FAMILY,
    categories: CATEGORIES,
    events: generateDemoEvents(),
    bookingSuggestions: generateBookingSuggestions(),
    thresholdAlerts: generateThresholdAlerts(),
    conflicts: generateConflicts(),
    weather: generateWeatherData(),
    extracurricular: generateExtracurricularActivities(),
  };

  console.log('✅ Demo data generated:');
  console.log(`   - Family: ${DEMO_FAMILY.familyName} (${DEMO_FAMILY.members.length} members)`);
  console.log(`   - Categories: ${CATEGORIES.length}`);
  console.log(`   - Events: ${demoData.events.length}`);
  console.log(`   - Booking Suggestions: ${demoData.bookingSuggestions.length}`);
  console.log(`   - Threshold Alerts: ${demoData.thresholdAlerts.length}`);
  console.log(`   - Conflicts: ${demoData.conflicts.length}`);
  console.log(`   - Weather Data: ${demoData.weather.length} days`);
  console.log(`   - Extracurricular: ${demoData.extracurricular.length} activities\n`);

  return demoData;
}

// Export demo data as JSON for manual import
export function exportDemoDataJSON() {
  const data = {
    family: DEMO_FAMILY,
    categories: CATEGORIES,
    events: generateDemoEvents(),
    bookingSuggestions: generateBookingSuggestions(),
    thresholdAlerts: generateThresholdAlerts(),
    conflicts: generateConflicts(),
    weather: generateWeatherData(),
    extracurricular: generateExtracurricularActivities(),
  };

  return JSON.stringify(data, null, 2);
}

// CLI execution
if (require.main === module) {
  setupDemoData()
    .then(() => {
      console.log('📝 To use this data:');
      console.log('   1. Import into your database');
      console.log('   2. Login with: sarah@example.com / Demo123!');
      console.log('   3. Follow the video script for recording\n');
      console.log('💾 Demo data JSON saved to: demo-data.json');
      
      const fs = require('fs');
      fs.writeFileSync('demo-data.json', exportDemoDataJSON());
    })
    .catch((error) => {
      console.error('❌ Error setting up demo data:', error);
      process.exit(1);
    });
}
