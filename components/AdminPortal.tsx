
import React, { useState, useEffect, useCallback } from 'react';
import { User, Booking, UserRole } from '../types';
import { api } from '../services/api';
import Spinner from './Spinner';
import Alert from './Alert';
import { UsersIcon, CalendarIcon, ClockIcon } from './icons';

const AdminPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Schedule creation form state
  const [scheduleTeacherId, setScheduleTeacherId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleStartTime, setScheduleStartTime] = useState('');
  const [scheduleEndTime, setScheduleEndTime] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allUsers, allBookings] = await Promise.all([
        api.getUsers(),
        api.getBookings(),
      ]);
      setUsers(allUsers);
      setBookings(allBookings);
      const teacherUsers = allUsers.filter(u => u.role === UserRole.TEACHER);
      setTeachers(teacherUsers);
      if (teacherUsers.length > 0) {
        setScheduleTeacherId(teacherUsers[0].uid);
      }
    } catch (error) {
      setAlert({ type: 'error', message: 'データの読み込みに失敗しました。' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTeacherId || !scheduleDate || !scheduleStartTime || !scheduleEndTime) {
      setAlert({ type: 'error', message: 'すべてのフィールドを入力してください。' });
      return;
    }

    const start = parseInt(scheduleStartTime.split(':')[0]);
    const end = parseInt(scheduleEndTime.split(':')[0]);

    if (start >= end) {
      setAlert({ type: 'error', message: '開始時間は終了時間より前に設定してください。' });
      return;
    }
    
    try {
        const slotsToCreate = [];
        for (let hour = start; hour < end; hour++) {
            slotsToCreate.push({
                teacherId: scheduleTeacherId,
                date: scheduleDate,
                time: `${hour.toString().padStart(2, '0')}:00`,
            });
        }
        await api.createScheduleSlots(slotsToCreate);
        setAlert({ type: 'success', message: 'スケジュールが正常に追加されました。' });
        // Clear form
        setScheduleDate('');
        setScheduleStartTime('');
        setScheduleEndTime('');
    } catch (error) {
        setAlert({ type: 'error', message: 'スケジュールの作成に失敗しました。' });
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名前</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">役割</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => (
                  <tr key={user.uid}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 truncate max-w-xs">{user.uid}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'bookings':
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日付</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">時間</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生徒</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">先生</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.sort((a,b) => new Date(`${b.date}T${b.time}`).getTime() - new Date(`${a.date}T${a.time}`).getTime()).map(booking => (
                  <tr key={booking.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.time}</td>
                    <td className="px-6 py-4 whitespace-now-rap text-sm text-gray-500">{booking.studentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.teacherName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'schedule':
        return (
          <form onSubmit={handleCreateSchedule} className="space-y-4 max-w-lg">
            <div>
              <label htmlFor="teacher" className="block text-sm font-medium text-gray-700">先生</label>
              <select id="teacher" value={scheduleTeacherId} onChange={e => setScheduleTeacherId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md">
                {teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700">日付</label>
              <input type="date" id="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="start-time" className="block text-sm font-medium text-gray-700">開始時間</label>
                <input type="time" id="start-time" step="3600" value={scheduleStartTime} onChange={e => setScheduleStartTime(e.target.value)} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
              </div>
              <div>
                <label htmlFor="end-time" className="block text-sm font-medium text-gray-700">終了時間</label>
                <input type="time" id="end-time" step="3600" value={scheduleEndTime} onChange={e => setScheduleEndTime(e.target.value)} className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md" />
              </div>
            </div>
            <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark">
              スケジュール作成
            </button>
          </form>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
       {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}
      <h2 className="text-3xl font-bold text-gray-800">管理者ダッシュボード</h2>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button onClick={() => setActiveTab('users')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'users' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><UsersIcon className="w-5 h-5"/>ユーザー管理</button>
          <button onClick={() => setActiveTab('bookings')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'bookings' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><CalendarIcon className="w-5 h-5"/>全予約表示</button>
          <button onClick={() => setActiveTab('schedule')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'schedule' ? 'border-brand-primary text-brand-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}><ClockIcon className="w-5 h-5"/>スケジュール作成</button>
        </nav>
      </div>
      <div className="p-6 bg-white rounded-xl shadow-md">
        {renderContent()}
      </div>
    </div>
  );
};

export default AdminPortal;
