import React, { useState, useEffect, useCallback } from 'react';
import { User, Course, Booking } from '../types';
// Fix: Removed 'addAvailability' as it's not exported from the firebase service and was causing an error.
import { getCoursesForStudent, getBookingsForUser, updateBookingStatus } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import BookingModal from './BookingModal';
import FeedbackModal from './FeedbackModal';
import ChatModal from './ChatModal';
import { ChatIcon } from './icons';

const StudentPortal: React.FC<{ user: User }> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [chatPartner, setChatPartner] = useState<Partial<User> | null>(null);

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

  const handleCancelBooking = async (bookingId: string) => {
    if (window.confirm('この予約を本当にキャンセルしますか？')) {
      try {
        await updateBookingStatus(bookingId, 'cancelled');
        // A more complex implementation would restore the availability slot here.
        alert('予約がキャンセルされました。');
        fetchData(); // Refresh data
      } catch (e: any) {
        setError('予約のキャンセルに失敗しました。');
      }
    }
  };

  const handleOpenChat = (booking: Booking) => {
    const course = courses.find(c => c.id === booking.courseId);
    if (course) {
        setChatPartner({ id: course.teacherId, name: course.teacherName || '不明な教師', role: 'teacher' });
        setIsChatModalOpen(true);
    } else {
        setError('このコースの教師情報が見つかりませんでした。');
    }
  };

  const upcomingBookings = bookings.filter(b => (b.status === 'confirmed' || b.status === 'pending') && b.startTime.toDate() > new Date());
  const pastBookings = bookings.filter(b => b.status === 'completed' || (b.status === 'confirmed' && b.startTime.toDate() <= new Date()));

  const canCancel = (booking: Booking) => {
      if (!booking.cancellationDeadline) {
        // Fallback for old data without the deadline
        const now = new Date();
        const classTime = booking.startTime.toDate();
        const hoursUntilClass = (classTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntilClass > 24; // Fallback to 24 hours
      }
      return booking.cancellationDeadline.toDate() > new Date();
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
              <div key={booking.id} className="p-5 bg-white rounded-lg shadow-lg flex flex-col justify-between transition-transform transform hover:-translate-y-1">
                <div>
                  <p className="font-bold text-lg text-blue-700">{booking.courseTitle}</p>
                  <p className="text-sm text-gray-600 mt-1">教師: {courses.find(c => c.id === booking.courseId)?.teacherName || 'N/A'}</p>
                  <p className="text-sm text-gray-600 mt-1">日時: {booking.startTime.toDate().toLocaleString('ja-JP')}</p>
                  {booking.cancellationDeadline && <p className="text-xs text-gray-500 mt-1">キャンセル期限: {booking.cancellationDeadline.toDate().toLocaleString('ja-JP')}</p>}
                </div>
                <div className="mt-4 flex gap-2">
                    <button onClick={() => handleOpenChat(booking)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-500 rounded-md hover:bg-gray-600">
                      <ChatIcon /> <span>チャット</span>
                    </button>
                    {canCancel(booking) ? (
                      <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
                      >
                          キャンセル
                      </button>
                  ) : (
                      <button className="flex-1 px-3 py-2 text-sm font-medium text-white bg-gray-400 rounded-md cursor-not-allowed" disabled title="キャンセル期限を過ぎています">
                          キャンセル不可
                      </button>
                  )}
                </div>
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
                 <div className="flex items-center gap-4">
                  <button onClick={() => handleOpenChat(booking)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                      <ChatIcon /> <span>チャット履歴</span>
                  </button>
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
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 bg-white p-6 rounded-lg shadow">完了したクラスはありません。</p>
        )}
      </div>

      {isBookingModalOpen && <BookingModal user={user} courses={courses} onClose={() => setIsBookingModalOpen(false)} onBookingSuccess={fetchData} />}
      {isFeedbackModalOpen && selectedBooking && <FeedbackModal booking={selectedBooking} userRole="student" onClose={() => setIsFeedbackModalOpen(false)} onFeedbackSubmit={fetchData}/>}
      {isChatModalOpen && chatPartner && <ChatModal currentUser={user} otherUser={chatPartner} onClose={() => setIsChatModalOpen(false)} />}
    </div>
  );
};

export default StudentPortal;
