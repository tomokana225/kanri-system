import React, { useState, useEffect, useCallback } from 'react';
import { User, Course, Booking } from '../types';
import { getCoursesForStudent, getBookingsForUser, updateBookingStatus } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import BookingModal from './BookingModal';
import FeedbackModal from './FeedbackModal';
import ChatModal from './ChatModal';
import ChatList from './ChatList';
import Sidebar from './Sidebar';
import { ChatIcon, CalendarIcon, ClockIcon, AddIcon } from './icons';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

interface PortalProps {
  user: User;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

type StudentView = 'bookings' | 'chat';

const StudentPortal: React.FC<PortalProps> = ({ user, isSidebarOpen, setIsSidebarOpen }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState<StudentView>('bookings');

  // Modal states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [chatPartner, setChatPartner] = useState<Partial<User> | null>(null);

  const fetchData = useCallback(async () => {
    const isDevMode = user.id.startsWith('dev-');
    if (isDevMode) {
      const mockTimestamp = (hours: number) => firebase.firestore.Timestamp.fromDate(new Date(new Date().getTime() + hours * 60 * 60 * 1000));
      const mockPastTimestamp = (hours: number) => firebase.firestore.Timestamp.fromDate(new Date(new Date().getTime() - hours * 60 * 60 * 1000));
      
      const mockCourses: Course[] = [
        { id: 'c1', title: '英会話初級', description: '日常会話の基礎を学びます。', teacherId: 'dev-teacher-id', teacherName: '田中先生', studentIds: [user.id] },
        { id: 'c2', title: 'ビジネス英語', description: '会議やメールで使える表現を学びます。', teacherId: 'dev-teacher-id-2', teacherName: '鈴木先生', studentIds: [user.id] }
      ];
      const mockBookings: Booking[] = [
        { id: 'b1', studentId: user.id, studentName: user.name, teacherId: 'dev-teacher-id', courseId: 'c1', courseTitle: '英会話初級', startTime: mockTimestamp(25), endTime: mockTimestamp(26), status: 'confirmed' },
        { id: 'b2', studentId: user.id, studentName: user.name, teacherId: 'dev-teacher-id-2', courseId: 'c2', courseTitle: 'ビジネス英語', startTime: mockTimestamp(48), endTime: mockTimestamp(49), status: 'confirmed' },
        { id: 'b3', studentId: user.id, studentName: user.name, teacherId: 'dev-teacher-id', courseId: 'c1', courseTitle: '英会話初級', startTime: mockPastTimestamp(24), endTime: mockPastTimestamp(23), status: 'completed', feedback: { rating: 5, comment: 'とても分かりやすかったです。'} },
        { id: 'b4', studentId: user.id, studentName: user.name, teacherId: 'dev-teacher-id-2', courseId: 'c2', courseTitle: 'ビジネス英語', startTime: mockPastTimestamp(72), endTime: mockPastTimestamp(71), status: 'cancelled' },
      ];
      setCourses(mockCourses);
      setBookings(mockBookings);
      setLoading(false);
      return;
    }

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
  }, [user.id, user.name]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCancelBooking = async (bookingId: string) => {
    if (window.confirm('この予約を本当にキャンセルしますか？')) {
      try {
        await updateBookingStatus(bookingId, 'cancelled');
        alert('予約がキャンセルされました。');
        fetchData(); // Refresh data
      } catch (e: any) {
        setError('予約のキャンセルに失敗しました。');
      }
    }
  };
  
  const handleOpenChatFromList = (teacher: User) => {
    setChatPartner(teacher);
    setIsChatModalOpen(true);
  };
  
  const NavLink: React.FC<{ view: StudentView; label: string; icon: React.ReactNode }> = ({ view, label, icon }) => (
    <button
      onClick={() => {
        setActiveView(view);
        setIsSidebarOpen(false); // Close sidebar on mobile after selection
      }}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium text-left rounded-lg transition-colors duration-200 ${
        activeView === view ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  );

  const renderBookings = () => {
    const upcomingBookings = bookings.filter(b => (b.status === 'confirmed' || b.status === 'pending') && b.startTime.toDate() > new Date());
    const pastBookings = bookings.filter(b => b.status === 'completed' || b.status === 'cancelled' || (b.status === 'confirmed' && b.startTime.toDate() <= new Date()));

    const canCancel = (booking: Booking) => {
      if (booking.status === 'cancelled') return false;
      if (!booking.cancellationDeadline) {
        const now = new Date();
        const classTime = booking.startTime.toDate();
        const hoursUntilClass = (classTime.getTime() - now.getTime()) / (1000 * 60 * 60);
        return hoursUntilClass > 24;
      }
      return booking.cancellationDeadline.toDate() > new Date();
    };
    
    const handleOpenChatFromBooking = (booking: Booking) => {
      const course = courses.find(c => c.id === booking.courseId);
      if (course) {
          setChatPartner({ id: course.teacherId, name: course.teacherName || '不明な教師', role: 'teacher' });
          setIsChatModalOpen(true);
      } else {
          setError('このコースの教師情報が見つかりませんでした。');
      }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">予約管理</h1>
            </div>
            {error && <Alert message={error} type="error" />}

            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">今後の予約</h2>
                {upcomingBookings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {upcomingBookings.map(booking => (
                    <div key={booking.id} className="bg-white rounded-xl shadow-lg overflow-hidden transition-transform transform hover:-translate-y-1">
                        <div className="p-5">
                        <p className="font-bold text-lg text-blue-800">{booking.courseTitle}</p>
                        <p className="text-sm text-gray-600 mt-2">教師: {courses.find(c => c.id === booking.courseId)?.teacherName || 'N/A'}</p>
                        <div className="flex items-center text-sm text-gray-600 mt-2">
                            <CalendarIcon className="w-4 h-4 mr-2" />
                            <span>{booking.startTime.toDate().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</span>
                        </div>
                        <div className="flex items-center text-sm text-gray-600 mt-1">
                            <ClockIcon className="w-4 h-4 mr-2" />
                            <span>{booking.startTime.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        </div>
                        <div className="p-4 bg-gray-50 flex gap-2">
                            <button onClick={() => handleOpenChatFromBooking(booking)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-gray-500 rounded-md hover:bg-gray-600 transition-colors">
                            <ChatIcon /> <span>チャット</span>
                            </button>
                            {canCancel(booking) ? (
                            <button
                                onClick={() => handleCancelBooking(booking.id)}
                                className="flex-1 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
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
                <p className="text-gray-500 bg-white p-6 rounded-lg shadow-sm">今後の予約はありません。</p>
                )}
            </div>

            <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">予約履歴</h2>
                {pastBookings.length > 0 ? (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                    <ul className="divide-y divide-gray-200">
                    {pastBookings.map(booking => (
                    <li key={booking.id} className="p-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div>
                            <p className={`font-semibold ${booking.status === 'cancelled' ? 'text-gray-400 line-through' : ''}`}>{booking.courseTitle}</p>
                            <p className="text-sm text-gray-500">{booking.startTime.toDate().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</p>
                        </div>
                        <div className="flex items-center gap-4">
                        {booking.status !== 'cancelled' && (
                            <>
                            <button onClick={() => handleOpenChatFromBooking(booking)} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
                                <ChatIcon /> <span>チャット履歴</span>
                            </button>
                            {booking.feedback ? (
                            <button onClick={() => { setSelectedBooking(booking); setIsFeedbackModalOpen(true); }} className="px-3 py-1.5 text-sm text-green-700 bg-green-100 rounded-md hover:bg-green-200">
                                フィードバックあり
                            </button>
                            ) : (
                            <button onClick={() => { setSelectedBooking(booking); setIsFeedbackModalOpen(true); }} className="px-3 py-1.5 text-sm text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200">
                                フィードバックを見る
                            </button>
                            )}
                            </>
                        )}
                        </div>
                    </li>
                    ))}
                    </ul>
                </div>
                ) : (
                <p className="text-gray-500 bg-white p-6 rounded-lg shadow-sm">完了したクラスはありません。</p>
                )}
            </div>
        </div>
    );
  }

  return (
    <div className="flex w-full h-full">
      <Sidebar isOpen={isSidebarOpen} setOpen={setIsSidebarOpen}>
          <div className="space-y-2">
            <NavLink view="bookings" label="予約管理" icon={<CalendarIcon />} />
            <NavLink view="chat" label="教師とのチャット" icon={<ChatIcon />} />
          </div>
          <div className="mt-auto pt-4 border-t border-gray-200">
             <button
                onClick={() => {
                    setIsBookingModalOpen(true);
                    setIsSidebarOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
                >
                <AddIcon />
                <span>クラスを予約</span>
            </button>
          </div>
      </Sidebar>
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center h-full"><Spinner /></div>
        ) : activeView === 'bookings' ? (
          renderBookings()
        ) : (
          <ChatList currentUser={user} onSelectChat={handleOpenChatFromList} />
        )}
      </main>

      {isBookingModalOpen && <BookingModal user={user} courses={courses} onClose={() => setIsBookingModalOpen(false)} onBookingSuccess={fetchData} />}
      {isFeedbackModalOpen && selectedBooking && <FeedbackModal booking={selectedBooking} userRole="student" onClose={() => setIsFeedbackModalOpen(false)} onFeedbackSubmit={fetchData}/>}
      {isChatModalOpen && chatPartner && <ChatModal currentUser={user} otherUser={chatPartner} onClose={() => setIsChatModalOpen(false)} />}
    </div>
  );
};

export default StudentPortal;