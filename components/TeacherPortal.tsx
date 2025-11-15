import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Booking, Availability, Notification } from '../types';
import { getBookingsForUser, getAvailabilitiesForTeacher, deleteAvailability } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import TeacherAvailabilityModal from './TeacherAvailabilityModal';
import FeedbackModal from './FeedbackModal';
import ChatModal from './ChatModal';
import ChatList from './ChatList';
import Sidebar from './Sidebar';
import Calendar from './Calendar'; // Import Calendar
import { DeleteIcon, AddIcon, ChatIcon, CalendarIcon, ClockIcon, CourseIcon } from './icons';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

interface PortalProps {
  user: User;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  navigationRequest: Notification['link'] | null;
  onNavigationComplete: () => void;
}

type TeacherView = 'schedule' | 'availability' | 'completed' | 'chat';

const TeacherPortal: React.FC<PortalProps> = ({ user, isSidebarOpen, setIsSidebarOpen, navigationRequest, onNavigationComplete }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState<TeacherView>('schedule');
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  
  // Modal states
  const [isAvailabilityModalOpen, setIsAvailabilityModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [chatPartner, setChatPartner] = useState<Partial<User> | null>(null);

  useEffect(() => {
    if (navigationRequest) {
        if (navigationRequest.type === 'booking') {
            setActiveView('schedule');
            setIsSidebarOpen(false);
        } else if (navigationRequest.type === 'chat' && navigationRequest.payload) {
            const partner = {
                id: navigationRequest.payload.partnerId,
                name: navigationRequest.payload.partnerName,
                role: navigationRequest.payload.partnerRole
            };
            setChatPartner(partner);
            setIsChatModalOpen(true);
        }
        onNavigationComplete();
    }
  }, [navigationRequest, onNavigationComplete]);

  const fetchData = useCallback(async () => {
    const isDevMode = user.id.startsWith('dev-');
    if (isDevMode) {
        const mockTimestamp = (hours: number) => firebase.firestore.Timestamp.fromDate(new Date(new Date().getTime() + hours * 60 * 60 * 1000));
        const mockPastTimestamp = (hours: number) => firebase.firestore.Timestamp.fromDate(new Date(new Date().getTime() - hours * 60 * 60 * 1000));
        const mockBookings: Booking[] = [
            { id: 'b1', studentId: 'dev-student-1', studentName: '佐藤学生', teacherId: user.id, courseId: 'c1', courseTitle: '英会話初級', startTime: mockTimestamp(25), endTime: mockTimestamp(26), status: 'confirmed' },
            { id: 'b2', studentId: 'dev-student-2', studentName: '伊藤学生', teacherId: user.id, courseId: 'c2', courseTitle: 'ビジネス英語', startTime: mockTimestamp(48), endTime: mockTimestamp(49), status: 'confirmed' },
            { id: 'b3-past', studentId: 'dev-student-1', studentName: '佐藤学生', teacherId: user.id, courseId: 'c1', courseTitle: '英会話初級', startTime: mockPastTimestamp(24), endTime: mockPastTimestamp(23), status: 'completed', feedback: {rating: 4, comment: "発音がとても綺麗でした。"} },
        ];
        const mockAvailabilities: Availability[] = [
            { id: 'a1', teacherId: user.id, startTime: mockTimestamp(3), endTime: mockTimestamp(4), status: 'available' },
            { id: 'a2', teacherId: user.id, startTime: mockTimestamp(5), endTime: mockTimestamp(6), status: 'available' },
            { id: 'a3', teacherId: user.id, startTime: mockTimestamp(28), endTime: mockTimestamp(29), status: 'booked', studentId: 'dev-student-1' },
        ];
        setBookings(mockBookings);
        setAvailabilities(mockAvailabilities);
        setLoading(false);
        return;
    }

    setLoading(true);
    setError('');
    try {
      const [teacherBookings, teacherAvailabilities] = await Promise.all([
        getBookingsForUser(user.id, 'teacher'),
        getAvailabilitiesForTeacher(user.id, true) // Fetch all availabilities for calendar
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

  const slotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return availabilities
      .filter(a => a.startTime.toDate().toDateString() === selectedDate.toDateString())
      .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
  }, [selectedDate, availabilities]);

  const studentNameMap = useMemo(() => {
    const map = new Map<string, string>();
    bookings.forEach(b => {
      if (b.studentId && b.studentName) {
        map.set(b.studentId, b.studentName);
      }
    });
    return map;
  }, [bookings]);

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
                      <p className="text-sm text-gray-500 mt-1">{b.startTime.toDate().toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}</p>
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
          <div className="space-y-6">
             <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold text-gray-800">空き時間管理</h1>
              <button onClick={() => setIsAvailabilityModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105">
                <AddIcon /> <span>空き時間を登録</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
               <Calendar 
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  availabilityData={availabilities}
               />
               <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg h-full">
                  <h3 className="font-semibold text-xl text-gray-800 mb-4 border-b pb-3">
                      {selectedDate ? selectedDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : '日付を選択'}
                  </h3>
                   {slotsForSelectedDate.length > 0 ? (
                      <ul className="space-y-3 max-h-[450px] overflow-y-auto -mr-2 pr-2">
                          {slotsForSelectedDate.map(slot => (
                              <li key={slot.id} className="p-3 flex justify-between items-center bg-gray-50 rounded-lg">
                                  <p className="font-mono text-lg text-gray-900">{slot.startTime.toDate().toLocaleTimeString('ja-JP', {hour: '2-digit', minute:'2-digit'})}</p>
                                  {slot.status === 'available' ? (
                                      <div className="flex items-center gap-4">
                                          <span className="text-sm font-medium text-green-700 bg-green-100 px-2.5 py-1 rounded-full">空き</span>
                                          <button onClick={() => handleDeleteAvailability(slot.id)} className="text-red-500 hover:text-red-700 transition-colors"><DeleteIcon /></button>
                                      </div>
                                  ) : (
                                      <div className="text-right">
                                          <span className="text-sm font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full">予約済み</span>
                                          <p className="text-sm text-gray-600 mt-1">{studentNameMap.get(slot.studentId!) || '不明な学生'}</p>
                                      </div>
                                  )}
                              </li>
                          ))}
                      </ul>
                  ) : (
                      <div className="flex items-center justify-center h-full min-h-[200px]">
                          <p className="text-gray-500 text-center">{selectedDate ? 'この日の登録はありません。' : 'カレンダーから日付を選択してください。'}</p>
                      </div>
                  )}
              </div>
            </div>
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
                    <p className="text-sm text-gray-500 mb-2">{b.startTime.toDate().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</p>
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
