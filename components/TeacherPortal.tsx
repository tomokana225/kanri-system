import React, { useState, useEffect, useMemo } from 'react';
import { User, Booking, BookingStatus, UserRole } from '../types';
import { api } from '../services/api';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import Spinner from './Spinner';
import DashboardCard from './DashboardCard';
import { CalendarIcon, ClockIcon, UsersIcon, InboxIcon } from './icons';
import MessagingView from './MessagingView';

interface TeacherPortalProps {
  teacher: User;
}

const TeacherPortal: React.FC<TeacherPortalProps> = ({ teacher }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    setIsLoading(true);
    const q = query(
      collection(db, 'bookings'), 
      where("teacherId", "==", teacher.uid),
      orderBy("date", "desc"),
      orderBy("time", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teacherBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
      setBookings(teacherBookings);
      setIsLoading(false);
    }, (err) => {
      console.error("Failed to fetch bookings in real-time", err);
      setError('予約の読み込みに失敗しました。ページを更新してください。');
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener on unmount
  }, [teacher.uid]);

  const filteredBookings = useMemo(() => {
    if (!filterDate) return bookings;
    return bookings.filter(booking => booking.date === filterDate);
  }, [bookings, filterDate]);

  const today = new Date().toISOString().split('T')[0];
  const todaysBookings = bookings.filter(b => b.date === today && b.status === BookingStatus.CONFIRMED).length;
  const upcomingBookings = bookings.filter(b => b.date >= today && b.status === BookingStatus.CONFIRMED).length;
  const uniqueStudents = new Set(bookings.map(b => b.studentId)).size;

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  if (error) {
    return <div className="text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-gray-800">先生ダッシュボード</h2>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <DashboardCard icon={<CalendarIcon/>} title="本日の予約" value={todaysBookings.toString()} />
        <DashboardCard icon={<ClockIcon/>} title="今後の予約総数" value={upcomingBookings.toString()} />
        <DashboardCard icon={<UsersIcon/>} title="担当生徒数" value={uniqueStudents.toString()} />
      </div>

       <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button onClick={() => setActiveTab('dashboard')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'dashboard' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><CalendarIcon className="w-5 h-5" />予約一覧</button>
            <button onClick={() => setActiveTab('messages')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'messages' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><InboxIcon className="w-5 h-5" />メッセージ</button>
        </nav>
      </div>

      {activeTab === 'dashboard' && (
        <div className="p-6 bg-white rounded-xl shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800">今後の予約一覧</h3>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <label htmlFor="filterDate" className="text-sm font-medium text-gray-700">日付で絞り込み:</label>
                <input 
                    type="date" 
                    id="filterDate"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="block w-full px-3 py-1 text-sm border-gray-300 rounded-md shadow-sm focus:ring-brand-primary focus:border-brand-primary"
                />
                <button onClick={() => setFilterDate('')} className="text-sm text-brand-primary hover:underline">クリア</button>
            </div>
            </div>
        
            {filteredBookings.length > 0 ? (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">日付</th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">時間</th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">生徒名</th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">科目</th>
                    <th scope="col" className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">ステータス</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBookings.map(booking => (
                    <tr key={booking.id} className={`transition-colors duration-200 ${booking.status === BookingStatus.ABSENT ? 'bg-gray-100 text-gray-500' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">{new Date(booking.date).toLocaleDateString('ja-JP')}</td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">{booking.time}</td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">{booking.studentName}</td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">{booking.subject}</td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                         <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${booking.status === BookingStatus.ABSENT ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                            {booking.status}
                         </span>
                        </td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
            ) : (
            <p className="py-10 text-center text-gray-600">該当する予約はありません。</p>
            )}
        </div>
      )}
      {activeTab === 'messages' && (
        <MessagingView user={teacher} recipientRole={UserRole.STUDENT} />
      )}
    </div>
  );
};

export default TeacherPortal;
