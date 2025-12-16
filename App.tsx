import React, { useState, useEffect, useMemo } from 'react';
import { format, addDays, isSameDay, addMinutes, getDay, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Trash2, CheckCircle2 } from 'lucide-react';

import { Appointment, GeminiBookingSuggestion } from './types';
import { getAppointments, deleteAppointment } from './services/storageService';
import { WORKING_HOURS, MOCK_OWNER } from './constants';
import { Button } from './components/Button';
import { BookingModal, BookingModalProps } from './components/BookingModal';
import { AIScheduler } from './components/AIScheduler';

const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{date: Date, time: string, appointment?: Appointment} | null>(null);
  const [suggestionData, setSuggestionData] = useState<Partial<BookingModalProps>>({});

  // Simulating user role (toggle in UI for demo)
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'colleague'>('colleague');

  const refreshAppointments = () => {
    setAppointments(getAppointments());
  };

  useEffect(() => {
    refreshAppointments();
  }, []);

  // Calendar Grid Logic
  const startDate = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday start
  const weekDays = useMemo(() => {
    return Array.from({ length: 5 }).map((_, i) => addDays(startDate, i));
  }, [startDate]);

  const timeSlots = useMemo(() => {
    const slots = [];
    for (let i = WORKING_HOURS.start; i < WORKING_HOURS.end; i++) {
      slots.push(`${i.toString().padStart(2, '0')}:00`);
      slots.push(`${i.toString().padStart(2, '0')}:30`);
    }
    return slots;
  }, []);

  const handlePrevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const handleNextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const handleToday = () => setCurrentDate(new Date());

  const handleSlotClick = (date: Date, time: string, existingApt?: Appointment) => {
    // Cannot book past slots
    const [hours, minutes] = time.split(':').map(Number);
    const slotDateTime = new Date(date);
    slotDateTime.setHours(hours, minutes, 0, 0);
    
    if (slotDateTime < new Date()) return;

    if (existingApt) {
        // Clicking an existing appointment
        if (existingApt.type === 'availability') {
            // Both Owner (to edit) and Colleague (to book) can click 'availability'
            setSelectedSlot({ date, time, appointment: existingApt });
            setSuggestionData({});
            setIsModalOpen(true);
        } else {
             // It's a meeting. Only owner might want to see details (not implemented in modal yet) or delete
             // For now, allow Owner to click to edit/view, Colleague does nothing
             if (currentUserRole === 'owner') {
                 // Future: Open detail view
             }
        }
        return;
    }

    // Clicking an EMPTY slot
    if (currentUserRole === 'colleague') {
        alert("Only the owner can open new time slots. Please select a green 'Available' slot.");
        return; 
    }

    // Owner creating new availability
    setSelectedSlot({ date, time });
    setSuggestionData({}); // Clear AI suggestions
    setIsModalOpen(true);
  };

  const handleAISuggestion = (suggestion: GeminiBookingSuggestion) => {
    if (suggestion.date && suggestion.startTime) {
        const [year, month, day] = suggestion.date.split('-').map(Number);
        const suggestedDate = new Date(year, month - 1, day);
        
        // Check if there is an availability slot at this time if user is colleague
        const [hours, minutes] = suggestion.startTime.split(':').map(Number);
        const suggestedDateTime = new Date(suggestedDate);
        suggestedDateTime.setHours(hours, minutes, 0, 0);
        
        let targetApt: Appointment | undefined;

        if (currentUserRole === 'colleague') {
            targetApt = appointments.find(apt => 
                apt.type === 'availability' &&
                isSameDay(apt.start, suggestedDate) &&
                format(apt.start, 'HH:mm') === suggestion.startTime
            );

            if (!targetApt) {
                alert(`Sorry, there is no open slot available at ${suggestion.startTime} on ${suggestion.date}. Please ask the owner to open this time.`);
                return;
            }
        }

        // Navigate calendar to that week
        setCurrentDate(suggestedDate);

        // Pre-fill modal
        setSelectedSlot({ 
            date: suggestedDate, 
            time: suggestion.startTime, 
            appointment: targetApt // If colleague, this sets the booking context
        });

        setSuggestionData({
            initialDate: suggestedDate,
            initialTime: suggestion.startTime,
            initialTitle: suggestion.title,
            initialDuration: suggestion.durationMinutes
        });
        setIsModalOpen(true);
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to remove this slot/meeting?")) {
        deleteAppointment(id);
        refreshAppointments();
    }
  };

  // Helper to render a slot cell
  const renderSlot = (day: Date, time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const slotDateTime = new Date(day);
    slotDateTime.setHours(hours, minutes, 0, 0);

    const isPast = slotDateTime < new Date();

    // Find appointment starting at this time
    const appointment = appointments.find(apt => 
        isSameDay(apt.start, day) && format(apt.start, 'HH:mm') === time
    );

    // Check if this time is covered by a longer appointment starting earlier
    const isCovered = !appointment && appointments.some(apt => 
         isSameDay(apt.start, day) && 
         slotDateTime > apt.start && 
         slotDateTime < apt.end
    );

    if (appointment) {
        const durationMins = (appointment.end.getTime() - appointment.start.getTime()) / 60000;
        const rowSpan = Math.ceil(durationMins / 30);
        
        const isAvailability = appointment.type === 'availability';
        
        return (
            <div 
                key={`${day}-${time}`} 
                className={`row-span-${rowSpan} relative p-1 z-10 cursor-pointer transition-transform hover:scale-[1.02]`}
                style={{ gridRow: `span ${rowSpan}` }}
                onClick={(e) => {
                    e.stopPropagation();
                    handleSlotClick(day, time, appointment);
                }}
            >
                <div className={`
                    h-full w-full rounded-md p-2 text-xs border-l-4 shadow-sm overflow-hidden flex flex-col justify-between
                    ${isAvailability 
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900' 
                        : (currentUserRole === 'owner' ? 'bg-indigo-100 border-indigo-500 text-indigo-800' : 'bg-slate-200 border-slate-400 text-slate-600')
                    }
                `}>
                   <div>
                        <div className="font-bold truncate flex items-center gap-1">
                            {isAvailability && <CheckCircle2 size={12} className="text-emerald-600" />}
                            {appointment.title}
                        </div>
                        <div className="truncate opacity-75">{format(appointment.start, 'HH:mm')} - {format(appointment.end, 'HH:mm')}</div>
                        {currentUserRole === 'owner' && !isAvailability && (
                            <div className="mt-1 text-[10px] uppercase tracking-wide font-semibold opacity-60">
                                w/ {appointment.requesterName}
                            </div>
                        )}
                   </div>
                   {currentUserRole === 'owner' && (
                       <button 
                        onClick={(e) => handleDelete(appointment.id, e)}
                        className="self-end p-1 text-slate-400 hover:text-red-600 rounded-full hover:bg-white/50 transition-colors"
                       >
                           <Trash2 size={12} />
                       </button>
                   )}
                </div>
            </div>
        );
    }

    if (isCovered) {
        return null;
    }

    // Empty Slot Rendering
    return (
        <div 
            key={`${day}-${time}`}
            onClick={() => handleSlotClick(day, time)}
            className={`
                border-b border-slate-100 h-16 transition-colors duration-150 group relative
                ${isPast ? 'bg-slate-50 cursor-not-allowed' : (currentUserRole === 'owner' ? 'hover:bg-indigo-50 cursor-pointer bg-white' : 'bg-slate-50/50')}
            `}
        >
            {!isPast && currentUserRole === 'owner' && (
                <div className="hidden group-hover:flex absolute inset-0 items-center justify-center">
                    <span className="text-indigo-600 font-medium text-xs bg-white/80 px-2 py-1 rounded shadow-sm backdrop-blur-sm">
                        Open Slot
                    </span>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                    TS
                </div>
                <h1 className="text-xl font-bold text-slate-900 hidden sm:block">TimeSync AI</h1>
            </div>
            
            <div className="flex items-center gap-4">
                <div className="text-sm text-slate-500 hidden md:block">
                    Viewing: <span className="font-semibold text-slate-800">{MOCK_OWNER.name}</span>
                </div>
                <div className="h-6 w-px bg-slate-200 hidden md:block"></div>
                
                {/* Role Toggler for Demo */}
                <div className="flex bg-slate-100 rounded-lg p-1">
                    <button 
                        onClick={() => setCurrentUserRole('colleague')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${currentUserRole === 'colleague' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Guest View
                    </button>
                    <button 
                        onClick={() => setCurrentUserRole('owner')}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${currentUserRole === 'owner' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Owner View
                    </button>
                </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header Controls */}
        <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">
                        {format(currentDate, 'MMMM yyyy')}
                    </h2>
                    <p className="text-slate-500 flex items-center gap-2">
                        <CalendarIcon size={16} />
                        Week of {format(startDate, 'MMM do')}
                    </p>
                </div>
                
                <div className="flex items-center gap-2 bg-white rounded-lg shadow-sm border border-slate-200 p-1">
                    <Button variant="ghost" size="sm" onClick={handlePrevWeek}>
                        <ChevronLeft size={20} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleToday}>
                        Today
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleNextWeek}>
                        <ChevronRight size={20} />
                    </Button>
                </div>
            </div>

            {/* AI Scheduler */}
            <AIScheduler onSuggestion={handleAISuggestion} />
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-4 text-xs font-medium px-1">
            <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-500"></div>
                <span className="text-slate-600">Available</span>
            </div>
            <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-slate-200 border border-slate-400"></div>
                <span className="text-slate-600">Busy / Booked</span>
            </div>
             <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-white border border-slate-200"></div>
                <span className="text-slate-600">Empty</span>
            </div>
        </div>

        {/* Calendar Grid Container */}
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
            {/* Header Row (Days) */}
            <div className="grid grid-cols-1 md:grid-cols-6 border-b border-slate-200">
                {/* Time Label Column Header */}
                <div className="hidden md:flex items-end justify-center p-4 text-slate-400 bg-slate-50 border-r border-slate-100">
                    <Clock size={20} />
                </div>
                {/* Days Headers */}
                {weekDays.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                        <div key={day.toString()} className={`
                            p-4 text-center border-b md:border-b-0 border-slate-100 md:border-r last:border-r-0
                            ${isToday ? 'bg-indigo-50/50' : 'bg-white'}
                        `}>
                            <div className={`text-xs uppercase font-bold mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                                {format(day, 'EEE')}
                            </div>
                            <div className={`
                                text-xl font-bold inline-block w-8 h-8 leading-8 rounded-full
                                ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-900'}
                            `}>
                                {format(day, 'd')}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Scrollable Body */}
            <div className="overflow-y-auto max-h-[600px] relative">
               <div className="grid grid-cols-1 md:grid-cols-6">
                    {/* Time Labels Column */}
                    <div className="hidden md:block border-r border-slate-100 bg-slate-50">
                        {timeSlots.map(time => (
                            <div key={time} className="h-16 flex items-start justify-center pt-2 text-xs font-medium text-slate-400 border-b border-transparent">
                                {time}
                            </div>
                        ))}
                    </div>

                    {/* Days Columns */}
                    {weekDays.map(day => (
                        <div key={day.toString()} className="border-r border-slate-100 last:border-r-0 relative">
                             {/* Mobile Day Header (Sticky) */}
                             <div className="md:hidden sticky top-0 z-20 bg-slate-100 p-2 font-bold border-b border-slate-200">
                                {format(day, 'EEEE, MMM do')}
                             </div>

                             <div className="grid grid-rows-[repeat(28,minmax(0,1fr))]">
                                {timeSlots.map(time => renderSlot(day, time))}
                             </div>
                        </div>
                    ))}
               </div>
            </div>
        </div>
      </main>

      {/* Modals */}
      <BookingModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSuccess={refreshAppointments}
        initialDate={selectedSlot?.date || suggestionData.initialDate}
        initialTime={selectedSlot?.time || suggestionData.initialTime}
        initialTitle={suggestionData.initialTitle}
        initialDuration={suggestionData.initialDuration}
        currentUserRole={currentUserRole}
        existingAppointment={selectedSlot?.appointment}
      />
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
              <p>&copy; {new Date().getFullYear()} TimeSync AI. All rights reserved.</p>
              <p className="mt-1 text-xs">Simulated backend using LocalStorage.</p>
          </div>
      </footer>
    </div>
  );
};

export default App;