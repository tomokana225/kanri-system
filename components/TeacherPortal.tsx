import React, { useState, useEffect, useCallback } from 'react';
import { User, Booking, BookingRequest } from '../types';
import { getTeacherBookings, getBookingRequests, updateBookingStatus } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import TeacherAvailabilityModal from './TeacherAvailabilityModal';
import BookingRequestModal from './BookingRequestModal';
import { CalendarIcon, ClockIcon } from './icons';

interface TeacherPortalProps {
  user: User;
}

const TeacherPortal: React.FC<TeacherPortalProps> = ({ user }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<BookingRequest | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [teacherBookings, requests] = await Promise.all([
        getTeacherBookings(user.id),
        getBookingRequests(user.id)
      ]);
      setBookings(teacherBookings.filter(b => b.status === 'confirmed'));
      setBookingRequests(requests);
    } catch (e: any) {
      console.error("教師ポータルデータの取得に失敗:", e);
      setError('データの読み込みに失敗しました。');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const handleRequestAction = async (bookingId: string, action: 'confirm' | 'decline') => {
    try {
      const status = action === 'confirm' ? 'confirmed' : 'cancelled';
      await updateBookingStatus(bookingId, status);
      fetchData(); 
      setSelectedRequest(null);
    } catch (e) {
      setError('リクエストの処理に失敗しました。');
    }
  };

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
          <h2 className="text-2xl font-bold text-gray-800">教師ダッシュボード</h2>
          <button
            onClick={() => setIsAvailabilityModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            <ClockIcon /> 空き時間を登録
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2"><CalendarIcon />今後のスケジュール</h2>
        {upcomingBookings.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {upcomingBookings.map(booking => (
                <li key={booking.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-blue-600">{booking.courseTitle}</p>
                      <p className="text-sm text-gray-600">生徒: {booking.studentName}</p>
                      <p className="text-sm text-gray-600">{booking.startTime.toDate().toLocaleString('ja-JP')}</p>
                    </div>
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

      {isAvailabilityModalOpen && (
        <TeacherAvailabilityModal 
            user={user} 
            onClose={() => setIsAvailabilityModalOpen(false)} 
            onSaveSuccess={fetchData}
        />
      )}
      
      {selectedRequest && (
        <BookingRequestModal 
            request={selectedRequest}
            onClose={() => setSelectedRequest(null)}
            onAction={handleRequestAction}
        />
      )}
    </div>
  );
};

export default TeacherPortal;
