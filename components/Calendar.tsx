import React, { useState, useMemo } from 'react';
import { ScheduleSlot, Booking } from '../types';

interface CalendarProps {
  schedule: ScheduleSlot[];
  bookings: Booking[];
  onDateSelect: (date: string) => void;
  studentId: string;
}

const Calendar: React.FC<CalendarProps> = ({ schedule, bookings, onDateSelect }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const daysInMonth = endOfMonth.getDate();
  const startDay = startOfMonth.getDay();

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const slotsByDate = useMemo(() => {
    return schedule.reduce((acc, slot) => {
        if (!acc[slot.date]) acc[slot.date] = [];
        acc[slot.date].push(slot);
        return acc;
      }, {} as { [key:string]: ScheduleSlot[] });
  }, [schedule]);

  const myBookingsByDate = useMemo(() => {
    return bookings.reduce((acc, booking) => {
        acc[booking.date] = true;
        return acc;
    }, {} as { [key:string]: boolean });
  }, [bookings]);

  const renderDays = () => {
    const days = [];
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="border rounded-lg"></div>);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const dateString = dayDate.toISOString().split('T')[0];
      const slotsForDay = slotsByDate[dateString] || [];
      const hasAvailableSlots = slotsForDay.some(s => s.isAvailable);
      const hasBookedSlots = slotsForDay.some(s => !s.isAvailable);
      const isMyBookingDay = !!myBookingsByDate[dateString];
      const isToday = new Date().toDateString() === dayDate.toDateString();
      const isClickable = hasAvailableSlots || hasBookedSlots;
      const isPast = dayDate < new Date() && !isToday;

      let dayClasses = "p-2 text-center border rounded-lg transition-all duration-200 aspect-square flex items-center justify-center text-sm font-medium";
      
      if (isPast) {
        dayClasses += " bg-gray-50 text-gray-400";
      } else if(isMyBookingDay) {
        dayClasses += " bg-brand-light border-brand-secondary text-brand-dark cursor-pointer hover:shadow-md";
      } else if (hasAvailableSlots) {
        dayClasses += " cursor-pointer bg-green-200/50 text-green-900 font-bold hover:bg-green-200 hover:shadow-md";
      } else if (hasBookedSlots) {
        dayClasses += " cursor-pointer bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md";
      } else {
        dayClasses += " bg-gray-50 text-gray-400";
      }
      
      if (isToday) {
          dayClasses += " ring-2 ring-brand-primary";
      }

      days.push(
        <div key={i} className={dayClasses} onClick={() => isClickable && !isPast && onDateSelect(dateString)}>
          <span>{i}</span>
        </div>
      );
    }
    return days;
  };

  return (
    <div>
        <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">&lt;</button>
            <h3 className="text-2xl font-bold text-gray-800 text-center">{currentDate.toLocaleString('ja-JP', { month: 'long', year: 'numeric' })}</h3>
            <button onClick={nextMonth} className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">&gt;</button>
        </div>
        <div className="grid grid-cols-7 gap-2 mb-4 text-sm text-center text-gray-500">
            <div>日</div><div>月</div><div>火</div><div>水</div><div>木</div><div>金</div><div>土</div>
        </div>
        <div className="grid grid-cols-7 gap-2">
            {renderDays()}
        </div>
        
        <div className="flex flex-wrap gap-4 mt-4 text-xs">
            <div className="flex items-center"><span className="w-3 h-3 mr-1 bg-green-200/50 border rounded"></span>予約可能</div>
            <div className="flex items-center"><span className="w-3 h-3 mr-1 bg-brand-light border rounded"></span>あなたの予約</div>
            <div className="flex items-center"><span className="w-3 h-3 mr-1 bg-gray-100 border rounded"></span>満席</div>
        </div>
    </div>
  );
};

export default Calendar;
