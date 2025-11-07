import React, { useState, useMemo } from 'react';

interface CalendarProps {
  onDateSelect: (date: Date) => void;
  selectedDate: Date | null;
  availableDates?: Date[]; // Optional: Array of available dates
}

const Calendar: React.FC<CalendarProps> = ({ onDateSelect, selectedDate, availableDates }) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const availableDateStrings = useMemo(() => {
    return availableDates?.map(d => d.toDateString());
  }, [availableDates]);

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
    const isToday = new Date().toDateString() === dayDate.toDateString();
    const isSelected = selectedDate?.toDateString() === dayDate.toDateString();
    const isPast = dayDate < new Date(new Date().toDateString());
    
    // An available date is one that is not in the past and is in the availableDates array (if provided)
    const isAvailable = !isPast && (availableDates === undefined || (availableDateStrings && availableDateStrings.includes(dayDate.toDateString())));

    days.push(
      <div key={i} className="p-1 flex justify-center items-center">
        <button
          onClick={() => isAvailable && onDateSelect(dayDate)}
          disabled={!isAvailable}
          className={`
            w-10 h-10 flex items-center justify-center rounded-full transition-colors font-semibold
            ${!isAvailable ? 'text-gray-300 cursor-not-allowed' : ''}
            ${isAvailable ? 'hover:bg-blue-100 text-blue-600' : ''}
            ${isToday && isAvailable ? 'ring-2 ring-blue-400' : ''}
            ${isSelected ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
             ${!isSelected && !isAvailable ? 'bg-gray-100' : ''}
          `}
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
    <div className="bg-white p-4 rounded-lg shadow">
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
    </div>
  );
};

export default Calendar;