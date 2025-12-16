export interface Appointment {
  id: string;
  title: string;
  start: Date;
  end: Date;
  requesterName: string;
  description?: string;
  type: 'meeting' | 'block' | 'personal' | 'availability';
}

export interface User {
  id: string;
  name: string;
  role: 'owner' | 'colleague';
}

export interface TimeSlot {
  time: string; // HH:mm
  available: boolean;
  appointment?: Appointment;
}

export interface DayColumn {
  date: Date;
  slots: TimeSlot[];
}

export interface GeminiBookingSuggestion {
  date?: string; // YYYY-MM-DD
  startTime?: string; // HH:mm
  durationMinutes?: number;
  title?: string;
  reasoning?: string;
}
