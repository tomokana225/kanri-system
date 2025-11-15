import React, { useState, useMemo } from 'react';
import { Availability } from '../types';

interface CalendarProps {
  onDateSelect: (date: Date) => void;
  selectedDate: Date | null;
  availableDates?: Date[]; // For student booking
  availabilityData?: Availability[]; // For teacher portal view
}

const Calendar: React.FC<CalendarProps> = ({ onDateSelect, selectedDate, availableDates, availabilityData }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const availableDateStrings = useMemo(() => {
    return availableDates?.map(d => d.toDateString());
  }, [availableDates]);
  
  const availabilityStatusMap = useMemo(() => {
    if (!availabilityData) return new Map();
    const map = new Map<string, 'has-available' | 'fully-booked'>();
    availabilityData.forEach(avail => {
        const dateStr = avail.startTime.toDate().toDateString();
        const currentStatus = map.get(dateStr);
        if (avail.status === 'available') {
            map.set(dateStr, 'has-available');
        } else if (avail.status === 'booked' && currentStatus !== 'has-available') {
            map.set(dateStr, 'fully-booked');
        }
    });
    return map;
  }, [availabilityData]);


  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = startOfMonth.getDay(); // 0 = Sunday, 1 = Monday, ...
  const daysInMonth = endOfMonth.getDate();

  const days = [];
  for (let i = 0; i < startDay; i++) {
    days.push(<div key={`empty-${i}`} className="p-2"></div>);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    const dayDateString = dayDate.toDateString();
    const isToday = new Date().toDateString() === dayDateString;
    const isSelected = selectedDate?.toDateString() === dayDateString;
    const isPast = dayDate < new Date(new Date().toDateString());
    
    // Student booking mode
    const isAvailableForStudent = !isPast && (availableDates === undefined || (availableDateStrings && availableDateStrings.includes(dayDateString)));
    
    // Teacher view mode
    const teacherStatus = availabilityData ? availabilityStatusMap.get(dayDateString) : undefined;
    
    const isClickable = availabilityData ? !isPast : isAvailableForStudent;

    let dayClasses = `w-10 h-10 flex items-center justify-center rounded-full transition-colors font-semibold `;
    if (!isClickable) {
        dayClasses += 'text-gray-300 cursor-not-allowed bg-gray-50';
    } else {
        if (teacherStatus === 'has-available') {
            dayClasses += 'bg-green-50 text-green-800 hover:bg-green-100 border border-green-200';
        } else if (teacherStatus === 'fully-booked') {
            dayClasses += 'bg-gray-100 text-gray-500 hover:bg-gray-200';
        } else { // Default clickable style
            dayClasses += 'hover:bg-blue-100 text-blue-600';
        }
    }
     if (isToday && isClickable) dayClasses += ' ring-2 ring-blue-400';
     if (isSelected) dayClasses += ' !bg-blue-500 !text-white !border-blue-500';

    days.push(
      <div key={i} className="p-1 flex justify-center items-center">
        <button
          onClick={() => isClickable && onDateSelect(dayDate)}
          disabled={!isClickable}
          className={dayClasses}
        >
          {i}
        </button>
      </div>
    );
  }

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
  };

  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100">&lt;</button>
        <h3 className="text-lg font-semibold">
          {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
        </h3>
        <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100">&gt;</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm text-gray-500">
        {daysOfWeek.map(day => <div key={day} className="font-medium">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 mt-2">
        {days}
      </div>
       {availabilityData && (
          <div className="flex items-center space-x-4 mt-4 pt-3 border-t text-xs">
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-green-100 border border-green-200 mr-2"></span>空きあり</div>
              <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-gray-100 border mr-2"></span>予約済み</div>
          </div>
        )}
    </div>
  );
};

export default Calendar;
