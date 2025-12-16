import { Appointment } from '../types';
import { LOCAL_STORAGE_KEY } from '../constants';

// Helper to handle Date serialization/deserialization
const serialize = (appointments: Appointment[]) => {
  return JSON.stringify(appointments);
};

const deserialize = (json: string): Appointment[] => {
  const data = JSON.parse(json);
  return data.map((apt: any) => ({
    ...apt,
    start: new Date(apt.start),
    end: new Date(apt.end),
  }));
};

export const getAppointments = (): Appointment[] => {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) return [];
  try {
    return deserialize(stored);
  } catch (e) {
    console.error("Failed to parse appointments", e);
    return [];
  }
};

export const saveAppointment = (appointment: Appointment): Appointment[] => {
  const current = getAppointments();
  // Check if updating existing
  const index = current.findIndex(a => a.id === appointment.id);
  
  let updated;
  if (index >= 0) {
    updated = [...current];
    updated[index] = appointment;
  } else {
    updated = [...current, appointment];
  }
  
  localStorage.setItem(LOCAL_STORAGE_KEY, serialize(updated));
  return updated;
};

export const deleteAppointment = (id: string): Appointment[] => {
  const current = getAppointments();
  const updated = current.filter(a => a.id !== id);
  localStorage.setItem(LOCAL_STORAGE_KEY, serialize(updated));
  return updated;
};

export const checkAvailability = (start: Date, end: Date, excludeId?: string): boolean => {
  const current = getAppointments();
  return !current.some(apt => {
    if (excludeId && apt.id === excludeId) return false;
    
    // Ignore 'availability' slots when checking for collision, 
    // because we can book OVER an availability slot (it's technically free time)
    // However, if we are creating a NEW availability slot, we shouldn't overlap with existing meetings.
    
    // Simplification: logic is handled in the UI flow mostly. 
    // But strictly:
    // 1. Meeting overlaps Meeting -> False
    // 2. Meeting overlaps Availability -> True (We consume it)
    // 3. Availability overlaps Meeting -> False
    
    // For now, let's keep the raw overlap check. 
    // In App.tsx or Modal, we will decide if we are "consuming" the slot (replacing it) or "colliding" with it.
    
    const aptStart = apt.start.getTime();
    const aptEnd = apt.end.getTime();
    const checkStart = start.getTime();
    const checkEnd = end.getTime();

    return (checkStart < aptEnd && checkEnd > aptStart);
  });
};
