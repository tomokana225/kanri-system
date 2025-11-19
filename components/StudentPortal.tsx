import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, Course, Booking, Notification } from '../types';
import { getCoursesForStudent, getBookingsForUser, cancelBooking } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import BookingModal from './BookingModal';
import FeedbackModal from './FeedbackModal';
import ChatModal from './ChatModal';
import ChatList from './ChatList';
import Sidebar from './Sidebar';
import Calendar from './Calendar';
import { ChatIcon, CalendarIcon, ClockIcon, AddIcon, CheckIcon } from './icons';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

interface PortalProps {
  user: User;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
  navigationRequest: Notification['link'] | null;
  onNavigationComplete: () => void;
}

type StudentView = 'bookings' | 'chat';

const StudentPortal: React.FC<PortalProps> = ({ user, isSidebarOpen, setIsSidebarOpen, navigationRequest, onNavigationComplete }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState<StudentView>('bookings');
  
  // Calendar state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Modal states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [chatPartner, setChatPartner] = useState<Partial<User> | null>(null);

  useEffect(() => {
    if (navigationRequest) {
        if (navigationRequest.type === 'booking') {
            setActiveView('bookings');
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
      
      const mockCourses: Course[] = [
        { id: 'c1', title: '英会話初級', description: '日常会話の基礎を学びます。', teacherId: 'dev-teacher-id', teacherName: '田中先生', studentIds: [user.id] },
        { id: 'c2', title: 'ビジネス英語', description: '会議やメールで使える表現を学びます。', teacherId: 'dev-teacher-id-2', teacherName: '鈴木先生', studentIds: [user.id] }
      ];
      const mockBookings: Booking[] = [
        { id: 'b1', studentId: user.id, studentName: user.name, teacherId: 'dev-teacher-id', courseId: 'c1', courseTitle: '英会話初級', startTime: mockTimestamp(25), endTime: mockTimestamp(26), status: 'confirmed' },
        { id: 'b2', studentId: user.id, studentName: user.name, teacherId: 'dev-teacher-id-2', courseId: 'c2', courseTitle: 'ビジネス英語', startTime: mockTimestamp(48), endTime: mockTimestamp(49), status: 'confirmed' },
        { id: 'b3', studentId: user.id, studentName: user.name, teacherId: 'dev-teacher-id', courseId: 'c1', courseTitle: '英会話初級', startTime: mockPastTimestamp(24), endTime: mockPastTimestamp(23), status: 'completed', feedback: { rating: 5, comment: 'とても分かりやすかったです。'} },
        { id: 'b4', studentId: user.id, studentName: user.name, teacherId: 'dev-teacher-id-2', courseId: 'c2', courseTitle: 'ビジネス英語', startTime: mockPastTimestamp(72), endTime: mockPastTimestamp(71), status: 'cancelled' },
        // Add one for today for demo
        { id: 'b5', studentId: user.id, studentName: user.name, teacherId: 'dev-teacher-id', courseId: 'c1', courseTitle: '英会話初級 (今日)', startTime: firebase.firestore.Timestamp.fromDate(new Date(new Date().setHours(15,0,0,0))), endTime: firebase.firestore.Timestamp.fromDate(new Date(new Date().setHours(16,0,0,0))), status: 'confirmed' },
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
        // Use cancelBooking instead of updateBookingStatus to trigger notifications
        await cancelBooking(bookingId, user.id, user.name);
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

  const markedDates = useMemo(() => {
      return bookings.map(b => b.startTime.toDate());
  }, [bookings]);

  const filteredBookings = useMemo(() => {
      return bookings.filter(b => b.startTime.toDate().toDateString() === selectedDate.toDateString())
                     .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
  }, [bookings, selectedDate]);


  const renderBookings = () => {
    const canCancel = (booking: Booking) => {
      if (booking.status === 'cancelled' || booking.status === 'completed') return false;
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
      // Even if course is not found (deleted?), we can try to chat with teacherId from booking
      const teacherId = course ? course.teacherId : booking.teacherId;
      const teacherName = course ? course.teacherName : '担当教師';
      
      if (teacherId) {
          setChatPartner({ id: teacherId, name: teacherName || '不明な教師', role: 'teacher' });
          setIsChatModalOpen(true);
      } else {
          setError('教師情報が見つかりませんでした。');
      }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">マイポータル</h1>
                <button
                    onClick={() => setIsBookingModalOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-transform transform hover:scale-105"
                >
                    <AddIcon />
                    <span className="hidden sm:inline">クラスを予約</span>
                </button>
            </div>
            {error && <Alert message={error} type="error" />}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar Section */}
                <div className="lg:col-span-1">
                    <div className="sticky top-4">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <CalendarIcon className="text-blue-500" />
                            カレンダー
                        </h2>
                        <Calendar 
                            onDateSelect={setSelectedDate} 
                            selectedDate={selectedDate} 
                            markedDates={markedDates}
                            enablePastDates={true}
                        />
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800">
                            <p>• 青いドットがある日は予約が入っています。</p>
                            <p>• 日付をタップして詳細を確認できます。</p>
                        </div>
                    </div>
                </div>

                {/* Booking List Section */}
                <div className="lg:col-span-2">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        {selectedDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })} の予定
                    </h2>
                    
                    {filteredBookings.length > 0 ? (
                        <div className="space-y-4">
                            {filteredBookings.map(booking => (
                                <div key={booking.id} className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all hover:shadow-md ${booking.status === 'cancelled' ? 'opacity-75' : ''}`}>
                                    <div className="p-5">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className={`font-bold text-lg ${booking.status === 'cancelled' ? 'text-gray-500 line-through' : 'text-blue-800'}`}>
                                                    {booking.courseTitle}
                                                </h3>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    教師: {courses.find(c => c.id === booking.courseId)?.teacherName || '担当教師'}
                                                </p>
                                            </div>
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full 
                                                ${booking.status === 'confirmed' ? 'bg-green-100 text-green-800' : 
                                                  booking.status === 'completed' ? 'bg-gray-100 text-gray-800' : 
                                                  booking.status === 'cancelled' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {booking.status === 'confirmed' ? '予約済み' : 
                                                 booking.status === 'completed' ? '完了' : 
                                                 booking.status === 'cancelled' ? 'キャンセル' : booking.status}
                                            </span>
                                        </div>
                                        
                                        <div className="flex items-center text-gray-700 mt-3 font-medium">
                                            <ClockIcon className="w-5 h-5 mr-2 text-gray-400" />
                                            <span>
                                                {booking.startTime.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - {booking.endTime.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="px-5 py-3 bg-gray-50 border-t flex flex-wrap gap-3">
                                        {/* Actions */}
                                        <button 
                                            onClick={() => handleOpenChatFromBooking(booking)} 
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                        >
                                            <ChatIcon className="w-4 h-4" /> チャット
                                        </button>
                                        
                                        {booking.status === 'completed' && (
                                            <button 
                                                onClick={() => { setSelectedBooking(booking); setIsFeedbackModalOpen(true); }} 
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                                            >
                                                {booking.feedback ? 'フィードバック確認' : 'フィードバック送信'}
                                            </button>
                                        )}

                                        {canCancel(booking) && (
                                            <button
                                                onClick={() => handleCancelBooking(booking.id)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                                            >
                                                キャンセル
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                            <p className="text-gray-500">この日の予約はありません。</p>
                            <button 
                                onClick={() => setIsBookingModalOpen(true)}
                                className="mt-4 text-blue-600 font-medium hover:underline"
                            >
                                新しいクラスを予約する
                            </button>
                        </div>
                    )}
                </div>
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
      {isFeedbackModalOpen && selectedBooking && <FeedbackModal booking={selectedBooking} userRole="student" currentUser={user} onClose={() => setIsFeedbackModalOpen(false)} onFeedbackSubmit={fetchData}/>}
      {isChatModalOpen && chatPartner && <ChatModal currentUser={user} otherUser={chatPartner} onClose={() => setIsChatModalOpen(false)} />}
    </div>
  );
};

export default StudentPortal;
