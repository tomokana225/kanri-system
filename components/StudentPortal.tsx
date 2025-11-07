import React, { useState, useEffect, useCallback } from 'react';
import { User, Course, Booking } from '../types';
import { getStudentBookings, getAllCourses } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import BookingModal from './BookingModal';
import { CalendarIcon, CourseIcon, AddIcon } from './icons';

interface StudentPortalProps {
  user: User;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ user }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [studentBookings, allCourses] = await Promise.all([
        getStudentBookings(user.id),
        getAllCourses()
      ]);
      setBookings(studentBookings);
      setCourses(allCourses);
    } catch (e: any) {
      console.error("学生ポータルデータの取得に失敗:", e);
      setError('データの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }
  if (error) {
    return <Alert message={error} type="error" />;
  }

  const upcomingBookings = bookings
    .filter(b => b.startTime.toDate() > new Date())
    .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());

  return (
    <div className="space-y-8">
      <div>
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">ダッシュボード</h2>
            <button
                onClick={() => setIsBookingModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
                <AddIcon /> 新しい予約をする
            </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-white rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2"><CourseIcon />受講可能なコース</h3>
              <p className="text-3xl font-bold text-green-600">{courses.length}</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2"><CalendarIcon />今後の予約</h3>
              <p className="text-3xl font-bold text-indigo-600">{upcomingBookings.length}</p>
            </div>
        </div>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">今後の予約一覧</h2>
        {upcomingBookings.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {upcomingBookings.map(booking => (
                <li key={booking.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-600">{booking.courseTitle}</p>
                      <p className="text-sm text-gray-600">{booking.startTime.toDate().toLocaleString('ja-JP')}</p>
                    </div>
                    <span className="px-2 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-full">{booking.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="text-center p-8 bg-white rounded-lg shadow">
            <p className="text-gray-500">今後の予約はありません。</p>
          </div>
        )}
      </div>

      {isBookingModalOpen && (
        <BookingModal 
            user={user} 
            onClose={() => setIsBookingModalOpen(false)} 
            onBookingSuccess={fetchData} 
        />
      )}
    </div>
  );
};

export default StudentPortal;
