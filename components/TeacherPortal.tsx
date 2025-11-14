import React, { useState, useEffect, useCallback } from 'react';
import { User, Course, Booking, Availability } from '../types';
import { getCoursesForTeacher, getBookingsForUser, getAvailabilitiesForTeacher, deleteAvailability } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import TeacherAvailabilityModal from './TeacherAvailabilityModal';
import FeedbackModal from './FeedbackModal';
import ChatModal from './ChatModal';
import { DeleteIcon, AddIcon, ChatIcon } from './icons';

interface TeacherPortalProps {
  user: User;
}

const TeacherPortal: React.FC<TeacherPortalProps> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modal states
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [chatPartner, setChatPartner] = useState<Partial<User> | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [teacherCourses, teacherBookings, teacherAvailabilities] = await Promise.all([
        getCoursesForTeacher(user.id),
        getBookingsForUser(user.id, 'teacher'),
        getAvailabilitiesForTeacher(user.id)
      ]);
      setCourses(teacherCourses);
      setBookings(teacherBookings);
      setAvailabilities(teacherAvailabilities);
    } catch (e: any) {
      const code = e.code ? ` (コード: ${e.code})` : '';
      setError(`ダッシュボードデータの読み込みに失敗しました。${code}`);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteAvailability = async (id: string) => {
    if (window.confirm('この空き時間を削除しますか？')) {
      try {
        await deleteAvailability(id);
        fetchData();
      } catch(e) {
        setError('削除に失敗しました。');
      }
    }
  };

  const handleOpenChat = (booking: Booking) => {
    setChatPartner({ id: booking.studentId, name: booking.studentName, role: 'student' });
    setIsChatModalOpen(true);
  };

  const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && b.startTime.toDate() > new Date());
  const completedBookings = bookings.filter(b => b.status !== 'cancelled' && b.startTime.toDate() <= new Date());
  const availableSlots = availabilities.filter(a => a.status !== 'booked');

  if (loading) return <div className="flex justify-center mt-8"><Spinner /></div>;
  if (error) return <Alert message={error} type="error" />;

  return (
    <div className="container mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-gray-800">教師ダッシュボード</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Schedule and Availability */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">今後のスケジュール</h2>
            <div className="bg-white p-4 rounded-lg shadow">
              {upcomingBookings.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {upcomingBookings.map(b => (
                    <li key={b.id} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{b.courseTitle}</p>
                        <p className="text-sm text-gray-600">生徒: {b.studentName}</p>
                        <p className="text-sm text-gray-500">{b.startTime.toDate().toLocaleString('ja-JP')}</p>
                      </div>
                      <button onClick={() => handleOpenChat(b)} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700">
                          <ChatIcon />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-500">今後の予約はありません。</p>}
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-800">空き時間管理</h2>
              <button onClick={() => setIsAvailabilityModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <AddIcon /> <span>空き時間を登録</span>
              </button>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              {availableSlots.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {availableSlots.map(a => (
                    <li key={a.id} className="py-3 flex justify-between items-center">
                      <p className="text-gray-700">{a.startTime.toDate().toLocaleString('ja-JP')}</p>
                      <button onClick={() => handleDeleteAvailability(a.id)} className="text-red-500 hover:text-red-700"><DeleteIcon /></button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-500">登録済みの空き時間はありません。</p>}
            </div>
          </div>
        </div>
        
        {/* Right Column: Courses and Completed Classes */}
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">担当コース</h2>
            <div className="bg-white p-4 rounded-lg shadow">
              {courses.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {courses.map(c => (
                    <li key={c.id} className="py-3">
                      <p className="font-semibold text-gray-800">{c.title}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-500">担当コースはありません。</p>}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">完了したクラス</h2>
            <div className="bg-white p-4 rounded-lg shadow">
               {completedBookings.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                  {completedBookings.map(b => (
                    <li key={b.id} className="py-3">
                      <p className="font-semibold">{b.courseTitle} ({b.studentName})</p>
                      <p className="text-sm text-gray-500 mb-2">{b.startTime.toDate().toLocaleDateString('ja-JP')}</p>
                      <button onClick={() => {setSelectedBooking(b); setIsFeedbackModalOpen(true);}} className="text-sm text-blue-600 hover:underline">
                        {b.feedback ? 'フィードバックを編集' : 'フィードバックを記入'}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-gray-500">完了したクラスはありません。</p>}
            </div>
          </div>
        </div>
      </div>
      
      {isAvailabilityModalOpen && <TeacherAvailabilityModal user={user} onClose={() => setIsAvailabilityModalOpen(false)} onSaveSuccess={fetchData} />}
      {isFeedbackModalOpen && selectedBooking && <FeedbackModal booking={selectedBooking} userRole="teacher" onClose={() => setIsFeedbackModalOpen(false)} onFeedbackSubmit={fetchData} />}
      {isChatModalOpen && chatPartner && <ChatModal currentUser={user} otherUser={chatPartner} onClose={() => setIsChatModalOpen(false)} />}
    </div>
  );
};

export default TeacherPortal;
