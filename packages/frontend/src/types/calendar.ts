// Calendar types and interfaces

export interface Event {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  category?: string;
  familyMemberId: string;
  familyMemberName: string;
  source: 'google' | 'outlook' | 'kids_school' | 'kids_connect' | 'extracurricular' | 'internal';
  color?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  email: string;
  color: string;
}

export interface WeekRange {
  start: Date;
  end: Date;
  weekNumber: number;
  year: number;
}

export interface DayEvents {
  date: Date;
  dayName: string;
  events: Event[];
}
