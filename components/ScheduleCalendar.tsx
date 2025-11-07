import React from 'react';
import { Booking, User } from '../types';

// Fix: Add props interface to accept data from AdminPortal
interface ScheduleCalendarProps {
  bookings: Booking[];
  users: User[];
  onBookingClick: (booking: Booking) => void;
}

const ScheduleCalendar: React.FC<ScheduleCalendarProps> = ({ bookings, users, onBookingClick }) => {
  const userMap = new Map(users.map(u => [u.id, u.name]));
  
  const sortedBookings = [...bookings].sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">予約スケジュール</h2>
      {sortedBookings.length > 0 ? (
        <div className="space-y-4">
          {sortedBookings.map(booking => (
            <div 
              key={booking.id} 
              onClick={() => onBookingClick(booking)}
              className="p-4 border rounded-lg cursor-pointer hover:bg-gray-50 hover:shadow transition-all"
            >
              <p className="font-bold text-blue-700">{booking.courseTitle}</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2 text-sm">
                <div>
                  <p className="text-gray-500">生徒</p>
                  <p className="font-medium text-gray-800">{booking.studentName || userMap.get(booking.studentId) || '不明'}</p>
                </div>
                <div>
                  <p className="text-gray-500">教師</p>
                  <p className="font-medium text-gray-800">{userMap.get(booking.teacherId) || '不明'}</p>
                </div>
                 <div>
                  <p className="text-gray-500">日時</p>
                  <p className="font-medium text-gray-800">{booking.startTime.toDate().toLocaleString('ja-JP')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">今後の予約はありません。</p>
      )}
    </div>
  );
};

export default ScheduleCalendar;