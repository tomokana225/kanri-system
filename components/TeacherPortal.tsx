import React, { useState, useEffect, useCallback } from 'react';
import { User, Booking, Availability } from '../types';
import { getBookingsForUser, getAvailabilitiesForTeacher, deleteAvailability } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import TeacherAvailabilityModal from './TeacherAvailabilityModal';
import FeedbackModal from './FeedbackModal';
import ChatModal from './ChatModal';
import ChatList from './ChatList';
import Sidebar from './Sidebar';
import { DeleteIcon, AddIcon, ChatIcon, CalendarIcon, ClockIcon, CourseIcon } from './icons';

interface PortalProps {
  user: User;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

type TeacherView = 'schedule' | 'availability' | 'completed' | 'chat';

const TeacherPortal: React.FC<PortalProps> = ({ user, isSidebarOpen, setIsSidebarOpen }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState<TeacherView>('schedule');
  
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
      const [teacherBookings, teacherAvailabilities] = await Promise.all([
        getBookingsForUser(user.id, 'teacher'),
        getAvailabilitiesForTeacher(user.id)
      ]);
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
  
  const NavLink: React.FC<{ view: TeacherView; label: string; icon: React.ReactNode }> = ({ view, label, icon }) => (
    <button
      onClick={() => {
        setActiveView(view);
        setIsSidebarOpen(false);
      }}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium text-left rounded-lg transition-colors duration-200 ${
        activeView === view ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  );

  const renderContent = () => {
    if (loading) return <div className="flex justify-center items-center h-full"><Spinner /></div>;
    if (error) return <Alert message={error} type="error" />;

    switch(activeView) {
      case 'schedule':
        const upcomingBookings = bookings.filter(b => b.status === 'confirmed' && b.startTime.toDate() > new Date());
        const handleOpenChatFromBooking = (booking: Booking) => {
            setChatPartner({ id: booking.studentId, name: booking.studentName, role: 'student' });
            setIsChatModalOpen(true);
        };
        return (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">今後のスケジュール</h1>
            {upcomingBookings.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {upcomingBookings.map(b => (
                  <li key={b.id} className="py-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-blue-800">{b.courseTitle}</p>
                      <p className="text-sm text-gray-600">生徒: {b.studentName}</p>
                      <p className="text-sm text-gray-500 mt-1">{b.startTime.toDate().toLocaleString('ja-JP')}</p>
                    </div>
                    <button onClick={() => handleOpenChatFromBooking(b)} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700 transition-colors">
                        <ChatIcon />
                    </button>
                  </li>
                ))}
              </ul>
            ) : <p className="text-gray-500">今後の予約はありません。</p>}
          </div>
        );
      case 'availability':
        const availabilitiesByDate = availabilities
            .filter(a => a.status !== 'booked')
            .reduce((acc, curr) => {
            const date = curr.startTime.toDate().toLocaleDateString('ja-JP');
            if (!acc[date]) acc[date] = [];
            acc[date].push(curr);
            return acc;
            }, {} as Record<string, Availability[]>);
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
        return (
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold text-gray-800">空き時間管理</h1>
              <button onClick={() => setIsAvailabilityModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105">
                <AddIcon /> <span>空き時間を登録</span>
              </button>
            </div>
            {Object.keys(availabilitiesByDate).length > 0 ? (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {Object.entries(availabilitiesByDate).map(([date, slots]) => (
                  <div key={date}>
                    <h3 className="font-semibold text-gray-700 mb-2">{date}</h3>
                    <ul className="divide-y divide-gray-100 border rounded-lg">
                      {slots.map(a => (
                        <li key={a.id} className="px-4 py-3 flex justify-between items-center">
                          <p className="text-gray-800">{a.startTime.toDate().toLocaleTimeString('ja-JP', {hour: '2-digit', minute:'2-digit'})}</p>
                          <button onClick={() => handleDeleteAvailability(a.id)} className="text-red-500 hover:text-red-700 transition-colors"><DeleteIcon /></button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : <p className="text-gray-500">登録済みの空き時間はありません。</p>}
          </div>
        );
      case 'completed':
        const completedBookings = bookings.filter(b => b.status !== 'cancelled' && b.startTime.toDate() <= new Date());
        return (
          <div className="bg-white p-6 rounded-xl shadow-lg">
             <h1 className="text-3xl font-bold text-gray-800 mb-4">完了したクラス</h1>
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
        );
      case 'chat':
        const handleOpenChatFromList = (student: User) => {
            setChatPartner(student);
            setIsChatModalOpen(true);
        };
        return <ChatList currentUser={user} onSelectChat={handleOpenChatFromList} />;
      default:
        return null;
    }
  }

  return (
    <div className="flex w-full h-full">
      <Sidebar isOpen={isSidebarOpen} setOpen={setIsSidebarOpen}>
          <NavLink view="schedule" label="スケジュール" icon={<CalendarIcon />} />
          <NavLink view="availability" label="空き時間管理" icon={<ClockIcon />} />
          <NavLink view="completed" label="完了したクラス" icon={<CourseIcon />} />
          <NavLink view="chat" label="生徒とのチャット" icon={<ChatIcon />} />
      </Sidebar>

      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {renderContent()}
      </main>
      
      {isAvailabilityModalOpen && <TeacherAvailabilityModal user={user} onClose={() => setIsAvailabilityModalOpen(false)} onSaveSuccess={fetchData} />}
      {isFeedbackModalOpen && selectedBooking && <FeedbackModal booking={selectedBooking} userRole="teacher" onClose={() => setIsFeedbackModalOpen(false)} onFeedbackSubmit={fetchData} />}
      {isChatModalOpen && chatPartner && <ChatModal currentUser={user} otherUser={chatPartner} onClose={() => setIsChatModalOpen(false)} />}
    </div>
  );
};

export default TeacherPortal;