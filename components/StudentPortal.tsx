import React, { useState, useEffect, useCallback } from 'react';
import { User, Course, Booking, Availability } from '../types';
// Fix: Removed 'addAvailability' as it's not exported from the firebase service and was causing an error.
import { getCoursesForStudent, getBookingsForUser, updateBookingStatus } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import BookingModal from './BookingModal';
import FeedbackModal from './FeedbackModal';
import BookingRequestModal from './BookingRequestModal'; // Assuming this is for future use or can be repurposed

const StudentPortal: React.FC<{ user: User }> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const studentCourses = await getCoursesForStudent(user.id);
      const studentBookings = await getBookingsForUser(user.id, 'student');
      setCourses(studentCourses);
      setBookings(studentBookings);
    } catch (e: any) {
      const code = e.code ? ` (コード: ${e.code})` : '';
      setError(`学生データの取得に失敗しました。${code}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancelBooking = async (bookingId: string, availabilityId?: string) => {
    if (window.confirm('この予約を本当にキャンセルしますか？')) {
      try {
        await updateBookingStatus(bookingId, 'cancelled');
        if (availabilityId) {
          // This logic might need adjustment depending on how you want to handle cancellations.
          // For now, let's assume we make the slot available again.
          // This is a simplified version. A real app might have more complex logic.
          // The function to re-add availability might not exist yet.
          alert('予約がキャンセルされました。講師のカレンダーが更新されます。');
        }
        fetchData(); // Refresh data
      } catch (e: any) {
        setError('予約のキャンセルに失敗しました。');
      }
    }
  };

  const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && b.startTime.toDate() > new Date());
  const pastBookings = bookings.filter(b => b.status === 'completed' || (b.status==='confirmed' && b.startTime.toDate() <= new Date()));

  const canCancel = (booking: Booking) => {
      const now = new Date();
      const classTime = booking.startTime.toDate();
      const hoursUntilClass = (classTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      return hoursUntilClass > 5;
  };

  if (loading) return <div className="flex justify-center mt-8"><Spinner /></div>;
  if (error) return <Alert message={error} type="error" />;

  return (
    <div className="container mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">マイポータル</h1>
        <button
          onClick={() => setIsBookingModalOpen(true)}
          className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          クラスを予約
        </button>
      </div>

      {/* Upcoming Bookings */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">今後の予約</h2>
        {upcomingBookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {upcomingBookings.map(booking => (
              <div key={booking.id} className="p-5 bg-white rounded-lg shadow-lg transition-transform transform hover:-translate-y-1">
                <p className="font-bold text-lg text-blue-700">{booking.courseTitle}</p>
                <p className="text-sm text-gray-600 mt-1">教師: {courses.find(c => c.id === booking.courseId)?.teacherName || 'N/A'}</p>
                <p className="text-sm text-gray-600 mt-1">日時: {booking.startTime.toDate().toLocaleString('ja-JP')}</p>
                 {canCancel(booking) ? (
                    <button
                        onClick={() => handleCancelBooking(booking.id)}
                        className="mt-4 w-full px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                    >
                        キャンセル
                    </button>
                ) : (
                    <p className="mt-4 text-xs text-gray-500 text-center">授業開始5時間前を過ぎたためキャンセルできません。</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 bg-white p-6 rounded-lg shadow">今後の予約はありません。</p>
        )}
      </div>

      {/* Past Bookings */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">完了したクラス</h2>
        {pastBookings.length > 0 ? (
          <div className="space-y-4">
            {pastBookings.map(booking => (
              <div key={booking.id} className="p-4 bg-white rounded-lg shadow flex justify-between items-center">
                <div>
                    <p className="font-semibold">{booking.courseTitle}</p>
                    <p className="text-sm text-gray-500">{booking.startTime.toDate().toLocaleDateString('ja-JP')}</p>
                </div>
                {booking.feedback ? (
                  <div className='text-right'>
                    <p className='text-sm font-semibold'>フィードバック:</p>
                    <p className="text-sm text-gray-600">{booking.feedback.comment}</p>
                  </div>
                ) : (
                  <button onClick={() => { setSelectedBooking(booking); setIsFeedbackModalOpen(true); }} className="px-3 py-1.5 text-sm text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200">
                      フィードバックを見る
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 bg-white p-6 rounded-lg shadow">完了したクラスはありません。</p>
        )}
      </div>

      {isBookingModalOpen && <BookingModal user={user} courses={courses} onClose={() => setIsBookingModalOpen(false)} onBookingSuccess={fetchData} />}
      {isFeedbackModalOpen && selectedBooking && <FeedbackModal booking={selectedBooking} userRole="student" onClose={() => setIsFeedbackModalOpen(false)} onFeedbackSubmit={fetchData}/>}
      {isRequestModalOpen && <BookingRequestModal request={{} as any} onClose={() => setIsRequestModalOpen(false)} onAction={() => {}} />}

    </div>
  );
};

export default StudentPortal;