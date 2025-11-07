import React, { useState, useEffect, useCallback } from 'react';
import { User, Course, Booking, Availability } from '../types';
import { 
  getAllUsers, 
  getAllCourses, 
  updateUser, 
  deleteUser, 
  createCourse, 
  updateCourse, 
  deleteCourse,
  getAllBookings,
  getAllAvailabilities,
  addAvailabilities,
  deleteAvailability
} from '../services/firebase';
import { generateCourseDetails } from '../services/geminiService';
import Spinner from './Spinner';
import Alert from './Alert';
import UserEditModal from './UserEditModal';
import CreateUserModal from './CreateUserModal';
import CourseEditModal from './CourseEditModal';
import AiCourseGenerateModal from './AiCourseGenerateModal';
import ScheduleCalendar from './ScheduleCalendar';
import BookingDetailModal from './BookingDetailModal';
import AdminAvailabilityModal from './AdminAvailabilityModal';
import { AddIcon, AiIcon, EditIcon, DeleteIcon, DashboardIcon, UserIcon, CourseIcon, CalendarIcon, ClockIcon } from './icons';

type ActiveView = 'dashboard' | 'users' | 'courses' | 'bookings' | 'availability';

const AdminPortal: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal states
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isCourseEditModalOpen, setIsCourseEditModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isBookingDetailModalOpen, setIsBookingDetailModalOpen] = useState(false);
  const [isAdminAvailabilityModalOpen, setIsAdminAvailabilityModalOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const userMap = new Map(users.filter(u => u && u.id && u.name && typeof u.name === 'string').map(u => [u.id, u.name]));

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [allUsers, allCourses, allBookings, allAvailabilities] = await Promise.all([
        getAllUsers(), 
        getAllCourses(),
        getAllBookings(),
        getAllAvailabilities()
      ]);
      setUsers(allUsers.filter(u => u && u.id));
      setCourses(allCourses.filter(c => c && c.id));
      setBookings(allBookings.filter(b => b && b.id));
      setAvailabilities(allAvailabilities.filter(a => a && a.id));
    } catch (e: any) {
      console.error("管理データの取得に失敗:", e);
      const code = e.code ? ` (コード: ${e.code})` : '';
      setError(`データの読み込みに失敗しました。${code}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // User Handlers
  const handleOpenUserEdit = (user: User) => {
    setSelectedUser(user);
    setIsUserEditModalOpen(true);
  };

  const handleSaveUser = async (uid: string, userData: Partial<Omit<User, 'id'>>) => {
    try {
      await updateUser(uid, userData);
      fetchData();
      setIsUserEditModalOpen(false);
    } catch (err) {
      console.error("ユーザー更新エラー:", err);
      throw err;
    }
  };
  
  const handleCreateUser = async (_newUser: Omit<User, 'id'>) => {
      try {
        alert("ユーザー作成機能は現在デモ用です。実際のAuthユーザーは作成されません。リストを更新します。");
        fetchData(); 
        setIsCreateUserModalOpen(false);
      } catch (err) {
        console.error("ユーザー作成エラー:", err);
        throw err;
      }
  };

  const handleDeleteUser = async (uid: string) => {
    if (window.confirm('このユーザーを本当に削除しますか？')) {
      try {
        await deleteUser(uid);
        fetchData();
      } catch (err: any) {
        setError(err.message || 'ユーザーの削除に失敗しました。');
      }
    }
  };
  
  // Course Handlers
  const handleOpenCourseEdit = (course: Course | null) => {
    setSelectedCourse(course);
    setIsCourseEditModalOpen(true);
  };

  const handleSaveCourse = async (courseData: Partial<Omit<Course, 'id'>>, courseId?: string) => {
     try {
      if (courseId) {
        await updateCourse(courseId, courseData);
      } else {
        await createCourse(courseData as Omit<Course, 'id'>);
      }
      fetchData();
      setIsCourseEditModalOpen(false);
    } catch (err) {
      console.error("コース保存エラー:", err);
      throw err;
    }
  };
  
  const handleDeleteCourse = async (courseId: string) => {
     if (window.confirm('このコースを本当に削除しますか？')) {
      try {
        await deleteCourse(courseId);
        fetchData();
      } catch (err: any) {
        setError(err.message || 'コースの削除に失敗しました。');
      }
    }
  };
  
  const handleAiGenerate = async (topic: string) => {
      try {
          const { title, description } = await generateCourseDetails(topic);
          setSelectedCourse({ title, description, id: '', teacherId: '', studentIds: [] });
          setIsAiModalOpen(false);
          setIsCourseEditModalOpen(true);
      } catch(err) {
          console.error("AIコース生成エラー:", err);
          throw err;
      }
  };

  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsBookingDetailModalOpen(true);
  };

  const handleAvailabilitySaveSuccess = () => {
    fetchData();
    setIsAdminAvailabilityModalOpen(false);
  };

  const handleDeleteAvailability = async (availabilityId: string) => {
    if (window.confirm('この空き時間を削除しますか？')) {
        try {
            await deleteAvailability(availabilityId);
            fetchData();
        } catch (e: any) {
            setError('空き時間の削除に失敗しました。');
        }
    }
};

  const renderContent = () => {
    if (loading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    if (error) return <Alert message={error} type="error" />;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (activeView) {
      case 'dashboard':
        const upcomingBookingsCount = bookings.filter(b => b.startTime.toDate() >= today).length;
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-lg shadow text-center">
              <h3 className="text-lg font-semibold text-gray-500">総ユーザー数</h3>
              <p className="text-4xl font-bold text-blue-600">{users.length}</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow text-center">
              <h3 className="text-lg font-semibold text-gray-500">総コース数</h3>
              <p className="text-4xl font-bold text-green-600">{courses.length}</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow text-center">
              <h3 className="text-lg font-semibold text-gray-500">今後の予約件数</h3>
              <p className="text-4xl font-bold text-indigo-600">{upcomingBookingsCount}</p>
            </div>
          </div>
        );
      case 'users':
        return (
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">ユーザー一覧</h2>
              <button onClick={() => setIsCreateUserModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <AddIcon /> <span>新規ユーザー作成</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">氏名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">メールアドレス</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">役割</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map(user => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{user.role}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button onClick={() => handleOpenUserEdit(user)} className="text-blue-600 hover:text-blue-900"><EditIcon /></button>
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900"><DeleteIcon /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'courses':
        return (
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">コース一覧</h2>
              <div className="flex gap-2">
                <button onClick={() => handleOpenCourseEdit(null)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                  <AddIcon /> <span>新規コース作成</span>
                </button>
                <button onClick={() => setIsAiModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                  <AiIcon /> <span>AIでコースを生成</span>
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                   <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">コース名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">担当教師</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">生徒数</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courses.map(course => (
                    <tr key={course.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{course.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{userMap.get(course.teacherId) || '割り当てなし'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{course.studentIds?.length || 0}</td>
                      <td className="px-6 py-4 text-right text-sm font-medium space-x-2">
                        <button onClick={() => handleOpenCourseEdit(course)} className="text-blue-600 hover:text-blue-900"><EditIcon /></button>
                        <button onClick={() => handleDeleteCourse(course.id)} className="text-red-600 hover:text-red-900"><DeleteIcon /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      case 'bookings':
        return <ScheduleCalendar bookings={bookings} users={users} onBookingClick={handleBookingClick} />;
      case 'availability':
        const teachers = users.filter(u => u.role === 'teacher');
        return (
          <div className="p-6 bg-white rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">教師の空き時間管理</h2>
              <button onClick={() => setIsAdminAvailabilityModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                <AddIcon /> <span>空き時間を追加</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">教師</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日時</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {availabilities.map(avail => (
                    <tr key={avail.id}>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{userMap.get(avail.teacherId) || '不明'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{avail.startTime.toDate().toLocaleString('ja-JP')}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteAvailability(avail.id)} className="text-red-600 hover:text-red-900"><DeleteIcon /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const NavLink: React.FC<{ view: ActiveView; label: string; icon: React.ReactNode }> = ({ view, label, icon }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex items-center w-full px-4 py-3 text-sm font-medium text-left rounded-lg transition-colors ${
        activeView === view ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'
      }`}
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-gray-50 p-4 border-r border-gray-200 flex flex-col">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 px-2">管理メニュー</h2>
        <nav className="space-y-2">
          <NavLink view="dashboard" label="ダッシュボード" icon={<DashboardIcon />} />
          <NavLink view="users" label="ユーザー管理" icon={<UserIcon />} />
          <NavLink view="courses" label="コース管理" icon={<CourseIcon />} />
          <NavLink view="bookings" label="予約管理" icon={<CalendarIcon />} />
          <NavLink view="availability" label="教師の空き時間" icon={<ClockIcon />} />
        </nav>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        {renderContent()}
      </main>

      {isUserEditModalOpen && selectedUser && <UserEditModal user={selectedUser} onClose={() => setIsUserEditModalOpen(false)} onSave={handleSaveUser} />}
      {isCreateUserModalOpen && <CreateUserModal onClose={() => setIsCreateUserModalOpen(false)} onCreate={handleCreateUser} />}
      {isCourseEditModalOpen && <CourseEditModal course={selectedCourse} users={users} onClose={() => setIsCourseEditModalOpen(false)} onSave={handleSaveCourse} />}
      {isAiModalOpen && <AiCourseGenerateModal onClose={() => setIsAiModalOpen(false)} onGenerate={handleAiGenerate} />}
      {isBookingDetailModalOpen && <BookingDetailModal booking={selectedBooking} onClose={() => setIsBookingDetailModalOpen(false)} userMap={userMap}/>}
      {isAdminAvailabilityModalOpen && <AdminAvailabilityModal teachers={users.filter(u=>u.role==='teacher')} onClose={() => setIsAdminAvailabilityModalOpen(false)} onSaveSuccess={handleAvailabilitySaveSuccess} />}
    </div>
  );
};

export default AdminPortal;