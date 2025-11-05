
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserRole, Booking, ScheduleSlot, BookingStatus } from '../types';
import { api } from '../services/api';
import Calendar from './Calendar';
import Spinner from './Spinner';
import BookingModal from './BookingModal';
import Alert from './Alert';
import DashboardCard from './DashboardCard';
import { CalendarIcon, ClockIcon, InboxIcon } from './icons';
import MessagingView from './MessagingView';

interface StudentPortalProps {
  student: User;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ student }) => {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [alert, setAlert] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [activeTab, setActiveTab] = useState('booking');

  const fetchInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedTeachers, fetchedBookings] = await Promise.all([
        api.getUsersByRole(UserRole.TEACHER),
        api.getBookings(student.uid, undefined)
      ]);
      setTeachers(fetchedTeachers);
      setMyBookings(fetchedBookings);
      if (fetchedTeachers.length > 0) {
        setSelectedTeacherId(fetchedTeachers[0].uid);
      }
    } catch (err) {
      setError('データの読み込みに失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }, [student.uid]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    const fetchSchedule = async () => {
      if (!selectedTeacherId) return;
      try {
        const teacherSchedule = await api.getScheduleForTeacher(selectedTeacherId);
        setSchedule(teacherSchedule);
      } catch (err) {
        setError('スケジュールデータの読み込みに失敗しました。');
      }
    };
    fetchSchedule();
  }, [selectedTeacherId]);
  
  const upcomingBookings = useMemo(() => {
      return myBookings
        .filter(b => new Date(b.date) >= new Date() && b.status === BookingStatus.CONFIRMED)
        .sort((a,b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
  }, [myBookings]);

  const handleBookingSuccess = () => {
    setAlert({type: 'success', message: '予約が正常に完了しました。'});
    fetchInitialData(); // Re-fetch all data
    setSelectedDate(null);
  };
  
  const handleCancelBooking = async (bookingId: string) => {
      if (window.confirm('この予約を本当にキャンセルしますか？')) {
          try {
              const canceledBooking = await api.cancelBooking(bookingId);
              await api.sendNotification({
                  userId: canceledBooking.teacherId,
                  title: '予約キャンセルのお知らせ',
                  message: `<strong>${student.name}</strong>さんが <strong>${new Date(canceledBooking.date).toLocaleDateString()} ${canceledBooking.time}</strong> の予約をキャンセルしました。`
              });
              setAlert({type: 'success', message: '予約をキャンセルしました。'});
              fetchInitialData();
          } catch {
              setAlert({type: 'error', message: '予約のキャンセルに失敗しました。'});
          }
      }
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  if (error) return <p className="text-red-500 text-center">{error}</p>;

  return (
    <div className="space-y-6">
      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
      <h2 className="text-3xl font-bold text-gray-800">生徒ポータル</h2>

       <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard icon={<ClockIcon/>} title="今後の予約" value={upcomingBookings.length.toString()} />
        <DashboardCard icon={<CalendarIcon/>} title="完了した予約" value={myBookings.filter(b => b.status === BookingStatus.COMPLETED).length.toString()} />
      </div>
      
       <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button onClick={() => setActiveTab('booking')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'booking' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><CalendarIcon className="w-5 h-5" />予約</button>
            <button onClick={() => setActiveTab('messages')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'messages' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><InboxIcon className="w-5 h-5" />メッセージ</button>
        </nav>
      </div>

      {activeTab === 'booking' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 p-6 bg-white rounded-xl shadow-md">
          <div className="flex items-center mb-4">
            <label htmlFor="teacher-select" className="mr-2 text-sm font-medium text-gray-700">先生を選択:</label>
            <select
              id="teacher-select"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="block w-full max-w-xs px-3 py-2 text-sm bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
            >
              {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
            </select>
          </div>
          {selectedTeacherId ? (
            <Calendar
              schedule={schedule}
              bookings={myBookings.filter(b => b.teacherId === selectedTeacherId)}
              onDateSelect={setSelectedDate}
              studentId={student.uid}
            />
          ) : (
            <p>先生を選択してください。</p>
          )}
        </div>

        <div className="p-6 bg-white rounded-xl shadow-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">今後の予約</h3>
            <div className="space-y-4 max-h-96 overflow-y-auto">
                {upcomingBookings.length > 0 ? upcomingBookings.map(booking => (
                    <div key={booking.id} className="p-3 border rounded-lg bg-gray-50">
                        <p className="font-bold">{booking.subject}</p>
                        <p className="text-sm text-gray-600">{booking.teacherName}先生</p>
                        <p className="text-sm text-gray-600">{new Date(booking.date).toLocaleDateString('ja-JP', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} - {booking.time}</p>
                        <button onClick={() => handleCancelBooking(booking.id)} className="mt-2 text-xs text-red-600 hover:underline">キャンセル</button>
                    </div>
                )) : (
                    <p className="text-sm text-center text-gray-500">今後の予約はありません。</p>
                )}
            </div>
        </div>
      </div>
      )}
      
      {activeTab === 'messages' && (
          <MessagingView user={student} recipientRole={UserRole.TEACHER} />
      )}

      {selectedDate && selectedTeacherId && (
        <BookingModal
          student={student}
          teacher={teachers.find(t => t.uid === selectedTeacherId)!}
          date={selectedDate}
          schedule={schedule}
          onClose={() => setSelectedDate(null)}
          onBookingSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
};

export default StudentPortal;
