import React, { useState, useEffect } from 'react';
import { X, Clock, Calendar as CalendarIcon, User, Unlock, CalendarCheck } from 'lucide-react';
import { Button } from './Button';
import { Appointment } from '../types';
import { saveAppointment, checkAvailability, deleteAppointment } from '../services/storageService';

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialDate?: Date;
  initialTime?: string; // HH:mm
  initialDuration?: number;
  initialTitle?: string;
  currentUserRole: 'owner' | 'colleague';
  existingAppointment?: Appointment | null; // Passed if clicking an existing slot (e.g., to book an available one)
}

export const BookingModal: React.FC<BookingModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  initialDate,
  initialTime,
  initialDuration = 30,
  initialTitle = '',
  currentUserRole,
  existingAppointment
}) => {
  const [title, setTitle] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [duration, setDuration] = useState(30);
  const [error, setError] = useState('');

  const isBookingOpenSlot = existingAppointment?.type === 'availability';

  // Sync state when props change
  useEffect(() => {
    if (isOpen) {
      if (initialDate) {
        setDate(initialDate.toISOString().split('T')[0]);
      }
      if (initialTime) setTime(initialTime);
      
      if (existingAppointment) {
        // If booking an open slot, inherit its properties
        setDuration((existingAppointment.end.getTime() - existingAppointment.start.getTime()) / 60000);
        
        if (currentUserRole === 'colleague' && isBookingOpenSlot) {
            setTitle(''); // Colleague sets their meeting title
            setName('');
        } else {
            setTitle(existingAppointment.title);
            setName(existingAppointment.requesterName);
        }
      } else {
        // New slot
        setTitle(initialTitle || (currentUserRole === 'owner' ? 'Open for Booking' : ''));
        setName(currentUserRole === 'owner' ? 'Me' : '');
        if (initialDuration) setDuration(initialDuration);
      }
      
      setError('');
    }
  }, [isOpen, initialDate, initialTime, initialTitle, initialDuration, existingAppointment, currentUserRole]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!date || !time || !title || !name) {
      setError("All fields are required.");
      return;
    }

    const startDateTime = new Date(`${date}T${time}`);
    const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

    if (startDateTime < new Date()) {
        setError("Cannot book in the past.");
        return;
    }

    // Check availability, excluding the current ID if we are updating/booking an existing slot
    const isAvailable = checkAvailability(startDateTime, endDateTime, existingAppointment?.id);

    if (!isAvailable) {
      setError("This time slot overlaps with an existing appointment.");
      return;
    }

    // Determine type
    let type: Appointment['type'] = 'meeting';
    if (currentUserRole === 'owner' && !existingAppointment) {
        // Owner creating new slot -> Availability
        type = 'availability';
    } else if (currentUserRole === 'colleague' && isBookingOpenSlot) {
        // Colleague booking available slot -> Meeting
        type = 'meeting';
    }

    const appointment: Appointment = {
      id: existingAppointment ? existingAppointment.id : crypto.randomUUID(),
      title,
      start: startDateTime,
      end: endDateTime,
      requesterName: name,
      type: type
    };

    saveAppointment(appointment);
    onSuccess();
    onClose();
  };

  const isOwnerCreating = currentUserRole === 'owner' && !existingAppointment;
  const isColleagueBooking = currentUserRole === 'colleague' && isBookingOpenSlot;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            {isOwnerCreating ? (
                <Unlock className="text-emerald-600" size={24} />
            ) : (
                <CalendarCheck className="text-indigo-600" size={24} />
            )}
            <h2 className="text-xl font-bold text-slate-800">
                {isOwnerCreating ? 'Open Time Slot' : 'Book Appointment'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
                {isOwnerCreating ? 'Label (e.g., Open Slot)' : 'Meeting Purpose'}
            </label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder={isOwnerCreating ? "Open for Booking" : "Project Sync"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
                {isOwnerCreating ? 'Owner Name' : 'Your Name'}
            </label>
            <div className="relative">
                <User size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                readOnly={isOwnerCreating} // Owner name is fixed usually
                className={`w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${isOwnerCreating ? 'bg-slate-50' : ''}`}
                placeholder="John Doe"
                />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <div className="relative">
                <CalendarIcon size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isColleagueBooking} // Locked if booking an existing slot
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
              <div className="relative">
                <Clock size={18} className="absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="time" 
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={isColleagueBooking} // Locked if booking an existing slot
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
            <select 
              value={duration} 
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={isColleagueBooking} // Locked if booking an existing slot
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
            >
              <option value={30}>30 Minutes</option>
              <option value={45}>45 Minutes</option>
              <option value={60}>1 Hour</option>
              <option value={90}>1.5 Hours</option>
              <option value={120}>2 Hours</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button 
                type="submit" 
                className={isOwnerCreating ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'}
            >
                {isOwnerCreating ? 'Open Slot' : 'Confirm Booking'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};