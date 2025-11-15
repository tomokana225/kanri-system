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
  deleteAvailability
} from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import UserEditModal from './UserEditModal';
import CreateUserModal from './CreateUserModal';
import CourseEditModal from './CourseEditModal';
import ScheduleCalendar from './ScheduleCalendar';
import BookingDetailModal from './BookingDetailModal';
import AdminAvailabilityModal from './AdminAvailabilityModal';
import AdminManualBookingModal from './AdminManualBookingModal';
import Sidebar from './Sidebar';
import { AddIcon, EditIcon, DeleteIcon, DashboardIcon, UserIcon, CourseIcon, CalendarIcon, ClockIcon, ChevronDownIcon, ListIcon } from './icons';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

interface PortalProps {
  user: User;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

type ActiveView = 'dashboard' | 'users' | 'courses' | 'bookings' | 'availability' | 'history';

const AccordionItem: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border rounded-md">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-4 text-left font-semibold bg-gray-50 hover:bg-gray-100"
      >
        <span>{title}</span>
        <ChevronDownIcon className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      <div className={`accordion-content ${isOpen ? 'open' : ''}`}>
        <div className="p-4 border-t">{children}</div>
      </div>
    </div>
  );
};


const AdminPortal: React.FC<PortalProps> = ({ user, isSidebarOpen, setIsSidebarOpen }) => {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pagination state for history
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modal states
  const [isUserEditModalOpen, setIsUserEditModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [isCourseEditModalOpen, setIsCourseEditModalOpen] = useState(false);
  const [isBookingDetailModalOpen, setIsBookingDetailModalOpen] = useState(false);
  const [isAdminAvailabilityModalOpen, setIsAdminAvailabilityModalOpen] = useState(false);
  const [isManualBookingModalOpen, setIsManualBookingModalOpen] = useState(false); 
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const userMap = new Map(users.filter(u => u && u.id && u.name && typeof u.name === 'string').map(u => [u.id, u.name]));

  const fetchData = useCallback(async () => {
    const isDevMode = user.id.startsWith('dev-');
    if (isDevMode) {
        const mockTimestamp = (hours: number) => firebase.firestore.Timestamp.fromDate(new Date(new Date().getTime() + hours * 60 * 60 * 1000));
        const mockPastTimestamp = (hours: number) => firebase.firestore.Timestamp.fromDate(new Date(new Date().getTime() - hours * 60 * 60 * 1000));
        const mockUsers: User[] = [
            { id: 'dev-admin-id', name: '開発用管理者', email: 'admin@example.com', role: 'admin' },
            { id: 'dev-teacher-1', name: '田中先生', email: 'teacher1@example.com', role: 'teacher' },
            { id: 'dev-teacher-2', name: '鈴木先生', email: 'teacher2@example.com', role: 'teacher' },
            { id: 'dev-student-1', name: '佐藤学生', email: 'student1@example.com', role: 'student' },
            { id: 'dev-student-2', name: '伊藤学生', email: 'student2@example.com', role: 'student' },
        ];
        const mockCourses: Course[] = [
            { id: 'c1', title: '英会話初級', description: '...', teacherId: 'dev-teacher-1', studentIds: ['dev-student-1'], teacherName: '田中先生' },
            { id: 'c2', title: 'ビジネス英語', description: '...', teacherId: 'dev-teacher-2', studentIds: ['dev-student-1', 'dev-student-2'], teacherName: '鈴木先生' },
        ];
        const mockBookings: Booking[] = [
            { id: 'b1', studentId: 'dev-student-1', studentName: '佐藤学生', teacherId: 'dev-teacher-1', courseId: 'c1', courseTitle: '英会話初級', startTime: mockTimestamp(25), endTime: mockTimestamp(26), status: 'confirmed' },
            { id: 'b2-past', studentId: 'dev-student-2', studentName: '伊藤学生', teacherId: 'dev-teacher-2', courseId: 'c2', courseTitle: 'ビジネス英語', startTime: mockPastTimestamp(24), endTime: mockPastTimestamp(23), status: 'completed' },
            { id: 'b3-past-cancelled', studentId: 'dev-student-1', studentName: '佐藤学生', teacherId: 'dev-teacher-1', courseId: 'c1', courseTitle: '英会話初級', startTime: mockPastTimestamp(48), endTime: mockPastTimestamp(47), status: 'cancelled' },
        ];
        const mockAvailabilities: Availability[] = [
             { id: 'a1', teacherId: 'dev-teacher-1', startTime: mockTimestamp(3), endTime: mockTimestamp(4), status: 'available' },
             { id: 'a2', teacherId: 'dev-teacher-2', startTime: mockTimestamp(5), endTime: mockTimestamp(6), status: 'available' },
        ];
        setUsers(mockUsers);
        setCourses(mockCourses);
        setBookings(mockBookings);
        setAvailabilities(mockAvailabilities);
        setLoading(false);
        return;
    }
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
  }, [user.id]);

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
  
  const handleBookingClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setIsBookingDetailModalOpen(true);
  };
  
  const handleSaveSuccess = () => {
    fetchData();
    setIsAdminAvailabilityModalOpen(false);
    setIsManualBookingModalOpen(false);
  };

  const handleDeleteAvailability = async (availabilityId: string) => {
    if (window.confirm('この空き時間スロットを削除しますか？')) {
        try {
            await deleteAvailability(availabilityId);
            fetchData();
        } catch (e: any) {
            setError('空き時間の削除に失敗しました。');
        }
    }
};

  const NavLink: React.FC<{ view: ActiveView; label: string; icon: React.ReactNode }> = ({ view, label, icon }) => (
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

  const renderContent = () => {
    if (loading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    if (error) return <Alert message={error} type="error" />;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (activeView) {
      case 'dashboard':
        const upcomingBookingsCount = bookings.filter(b => b.startTime.toDate() >= today).length;
        return (
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">ダッシュボード</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-6 bg-white rounded-xl shadow-md text-center flex flex-col items-center justify-center">
                <UserIcon className="w-10 h-10 text-blue-500 mb-2"/>
                <h3 className="text-lg font-semibold text-gray-500">総ユーザー数</h3>
                <p className="text-4xl font-bold text-blue-600">{users.length}</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-md text-center flex flex-col items-center justify-center">
                <CourseIcon className="w-10 h-10 text-green-500 mb-2"/>
                <h3 className="text-lg font-semibold text-gray-500">総コース数</h3>
                <p className="text-4xl font-bold text-green-600">{courses.length}</p>
              </div>
              <div className="p-6 bg-white rounded-xl shadow-md text-center flex flex-col items-center justify-center">
                <CalendarIcon className="w-10 h-10 text-indigo-500 mb-2"/>
                <h3 className="text-lg font-semibold text-gray-500">今後の予約件数</h3>
                <p className="text-4xl font-bold text-indigo-600">{upcomingBookingsCount}</p>
              </div>
            </div>
          </div>
        );
      case 'users':
        return (
          <div className="p-6 bg-white rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold text-gray-800">ユーザー管理</h1>
              <button onClick={() => setIsCreateUserModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105">
                <AddIcon /> <span>新規ユーザー作成</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">氏名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メールアドレス</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">役割</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user, index) => (
                    <tr key={user.id} className={index % 2 === 0 ? undefined : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
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
          <div className="p-6 bg-white rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold text-gray-800">コース管理</h1>
              <button onClick={() => handleOpenCourseEdit(null)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105">
                <AddIcon /> <span>新規コース作成</span>
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                 <thead className="bg-gray-50">
                   <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">コース名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当教師</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生徒数</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courses.map((course, index) => (
                    <tr key={course.id} className={index % 2 === 0 ? undefined : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{course.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{userMap.get(course.teacherId) || '割り当てなし'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.studentIds?.length || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
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
        return (
            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold text-gray-800">予約カレンダー</h1>
                    <button onClick={() => setIsManualBookingModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105">
                        <AddIcon /> <span>手動で予約を追加</span>
                    </button>
                </div>
                <ScheduleCalendar bookings={bookings} users={users} onBookingClick={handleBookingClick} />
            </div>
        );
      case 'availability':
        const teachers = users.filter(u => u.role === 'teacher');
        const availabilitiesByTeacher = availabilities.reduce((acc, avail) => {
            const teacherId = avail.teacherId;
            if (!acc[teacherId]) acc[teacherId] = [];
            acc[teacherId].push(avail);
            return acc;
        }, {} as Record<string, Availability[]>);

        return (
            <div className="p-6 bg-white rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold text-gray-800">空き時間管理</h1>
                    <button onClick={() => setIsAdminAvailabilityModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105">
                        <AddIcon /> <span>空き時間を追加</span>
                    </button>
                </div>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                    {teachers.map(teacher => (
                        <AccordionItem key={teacher.id} title={teacher.name}>
                            {(availabilitiesByTeacher[teacher.id] && availabilitiesByTeacher[teacher.id].length > 0) ? (
                                <ul className="divide-y divide-gray-100">
                                    {availabilitiesByTeacher[teacher.id]
                                    .filter(a => a.status === 'available' && a.startTime.toDate() > new Date())
                                    .sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis())
                                    .map(avail => (
                                        <li key={avail.id} className="py-2 flex justify-between items-center">
                                            <span>{avail.startTime.toDate().toLocaleString('ja-JP')}</span>
                                            <button onClick={() => handleDeleteAvailability(avail.id)} className="text-red-500 hover:text-red-700"><DeleteIcon /></button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-500">登録されている空き時間はありません。</p>
                            )}
                        </AccordionItem>
                    ))}
                </div>
            </div>
        );
      case 'history':
        const sortedBookings = bookings.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
        const paginatedBookings = sortedBookings.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
        const totalPages = Math.ceil(sortedBookings.length / ITEMS_PER_PAGE);

        return (
            <div className="p-6 bg-white rounded-xl shadow-md">
                <h1 className="text-3xl font-bold text-gray-800 mb-4">全予約履歴</h1>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">コース</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">生徒</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">教師</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">日時</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ステータス</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedBookings.map(booking => (
                                <tr key={booking.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{booking.courseTitle}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{userMap.get(booking.studentId) || booking.studentName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{userMap.get(booking.teacherId)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.startTime.toDate().toLocaleString('ja-JP')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-md disabled:opacity-50">
                            前へ
                        </button>
                        <span>ページ {currentPage} / {totalPages}</span>
                        <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 text-sm text-gray-700 bg-white border rounded-md disabled:opacity-50">
                            次へ
                        </button>
                    </div>
                )}
            </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex w-full h-full">
        <Sidebar isOpen={isSidebarOpen} setOpen={setIsSidebarOpen}>
            <div className="space-y-2">
                <NavLink view="dashboard" label="ダッシュボード" icon={<DashboardIcon />} />
                <NavLink view="users" label="ユーザー管理" icon={<UserIcon />} />
                <NavLink view="courses" label="コース管理" icon={<CourseIcon />} />
                <NavLink view="bookings" label="予約カレンダー" icon={<CalendarIcon />} />
                <NavLink view="availability" label="空き時間管理" icon={<ClockIcon />} />
                <NavLink view="history" label="予約履歴" icon={<ListIcon />} />
            </div>
        </Sidebar>
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {renderContent()}
        </main>

        {isUserEditModalOpen && selectedUser && <UserEditModal user={selectedUser} onClose={() => setIsUserEditModalOpen(false)} onSave={handleSaveUser} />}
        {isCreateUserModalOpen && <CreateUserModal onClose={() => setIsCreateUserModalOpen(false)} onCreate={handleCreateUser} />}
        {isCourseEditModalOpen && <CourseEditModal course={selectedCourse} users={users} onClose={() => setIsCourseEditModalOpen(false)} onSave={handleSaveCourse} />}
        {isBookingDetailModalOpen && selectedBooking && <BookingDetailModal booking={selectedBooking} onClose={() => setIsBookingDetailModalOpen(false)} userMap={userMap} />}
        {isAdminAvailabilityModalOpen && <AdminAvailabilityModal teachers={users.filter(u => u.role === 'teacher')} onClose={() => setIsAdminAvailabilityModalOpen(false)} onSaveSuccess={handleSaveSuccess} />}
        {isManualBookingModalOpen && <AdminManualBookingModal users={users} courses={courses} onClose={() => setIsManualBookingModalOpen(false)} onSaveSuccess={handleSaveSuccess} />}
    </div>
  );
};

export default AdminPortal;
