import React, { useState, useEffect, useCallback, memo } from 'react';
import { User, Course, Booking } from '../types';
import {
  getAllUsers,
  getAllCourses,
  getAllBookings,
  deleteUser,
  deleteCourse,
  createCourse as apiCreateCourse,
  updateUser as apiUpdateUser,
  updateCourse as apiUpdateCourse,
  updateBooking,
} from '../services/firebase';
import { generateCourseDetails } from '../services/geminiService';
import Spinner from './Spinner';
import Alert from './Alert';
import CreateUserModal from './CreateUserModal';
import UserEditModal from './UserEditModal';
import CourseEditModal from './CourseEditModal';
import AiCourseGenerateModal from './AiCourseGenerateModal';

// --- Sub-components for better structure and resilience ---

const UserTable = memo(({ users, onEdit, onDelete }: { users: User[], onEdit: (user: User) => void, onDelete: (id: string) => void }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">氏名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">役割</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => {
                    if (!user || !user.id) return null; // Data integrity check
                    return (
                        <tr key={user.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                <button onClick={() => onEdit(user)} className="text-indigo-600 hover:text-indigo-900">編集</button>
                                <button onClick={() => onDelete(user.id)} className="text-red-600 hover:text-red-900">削除</button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
));

const CourseTable = memo(({ courses, userMap, onEdit, onDelete }: { courses: Course[], userMap: Map<string, string>, onEdit: (course: Course) => void, onDelete: (id: string) => void }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">コース名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当教師</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生徒数</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {courses.map(course => {
                    if (!course || !course.id) return null; // Data integrity check
                    return (
                        <tr key={course.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{course.title || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{userMap.get(course.teacherId) || '割り当てなし'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{(course.studentIds || []).length}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                <button onClick={() => onEdit(course)} className="text-indigo-600 hover:text-indigo-900">編集</button>
                                <button onClick={() => onDelete(course.id)} className="text-red-600 hover:text-red-900">削除</button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>
));

const BookingTable = memo(({ bookings, userMap, onCancel }: { bookings: Booking[], userMap: Map<string, string>, onCancel: (id: string) => void }) => {
    const statusClasses = {
        pending: 'bg-yellow-100 text-yellow-800',
        confirmed: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
    };
    const statusText = {
        pending: '保留中',
        confirmed: '確定済み',
        cancelled: 'キャンセル済み',
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生徒</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">教師</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">コース</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日時</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ステータス</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {bookings.map(booking => {
                        if (!booking || !booking.id) return null; // Data integrity check

                        const status = booking.status || 'unknown';
                        const statusClassName = statusClasses[status as keyof typeof statusClasses] || 'bg-gray-100 text-gray-800';
                        const statusDisplayText = statusText[status as keyof typeof statusText] || '不明';
                        const bookingDate = (booking.startTime && typeof booking.startTime.toDate === 'function')
                            ? booking.startTime.toDate().toLocaleString('ja-JP')
                            : 'N/A';

                        return (
                            <tr key={booking.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userMap.get(booking.studentId) || '不明'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{userMap.get(booking.teacherId) || '不明'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.courseTitle || 'N/A'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{bookingDate}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClassName}`}>
                                        {statusDisplayText}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    {booking.status === 'confirmed' && (
                                        <button onClick={() => onCancel(booking.id)} className="text-red-600 hover:text-red-900">
                                            キャンセル
                                        </button>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
});


const AdminPortal: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [fetchedUsers, fetchedCourses, fetchedBookings] = await Promise.all([
                getAllUsers(),
                getAllCourses(),
                getAllBookings(),
            ]);
            setUsers(fetchedUsers);
            setCourses(fetchedCourses);
            setBookings(fetchedBookings);
        } catch (e: any) {
            console.error("Admin data fetching failed:", e);
            const code = e.code ? ` (コード: ${e.code})` : '';
            setError(`データの読み込みに失敗しました。${code}`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreateUser = async (newUser: Omit<User, 'id'>) => {
        alert(`ユーザー「${newUser.name}」の作成機能は現在シミュレートされています。完全な実装にはFirebase Admin SDKが必要です。`);
        setIsUserModalOpen(false);
    };
    
    const handleUpdateUser = async (uid: string, userData: Partial<Omit<User, 'id'>>) => {
        try {
            await apiUpdateUser(uid, userData);
            setEditingUser(null);
            await fetchData();
        } catch (error: any) {
            console.error("Failed to update user:", error);
            const code = error.code ? ` (コード: ${error.code})` : '';
            setError(`ユーザーの更新に失敗しました。${code}`);
        }
    };
    
    const handleDeleteUser = async (uid: string) => {
        if (window.confirm('本当にこのユーザーを削除しますか？この操作は元に戻せません。')) {
            try {
                await deleteUser(uid);
                await fetchData();
            } catch (error: any) {
                console.error("Failed to delete user:", error);
                const code = error.code ? ` (コード: ${error.code})` : '';
                setError(`ユーザーの削除に失敗しました。${code}`);
            }
        }
    };

    const handleSaveCourse = async (courseData: Omit<Course, 'id'> | Partial<Omit<Course, 'id'>>, courseId?: string) => {
        try {
            if (courseId) {
                await apiUpdateCourse(courseId, courseData);
            } else {
                await apiCreateCourse(courseData as Omit<Course, 'id'>);
            }
            setEditingCourse(null);
            await fetchData();
        } catch (error: any) {
            console.error("Failed to save course:", error);
            const code = error.code ? ` (コード: ${error.code})` : '';
            setError(`コースの保存に失敗しました。${code}`);
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (window.confirm('本当にこのコースを削除しますか？')) {
            try {
                await deleteCourse(courseId);
                await fetchData();
            } catch (error: any) {
                console.error("Failed to delete course:", error);
                const code = error.code ? ` (コード: ${error.code})` : '';
                setError(`コースの削除に失敗しました。${code}`);
            }
        }
    };
    
    const handleCancelBooking = async (bookingId: string) => {
        if (window.confirm('本当にこの予約をキャンセルしますか？')) {
            try {
                await updateBooking(bookingId, { status: 'cancelled' });
                await fetchData();
            } catch (error: any) {
                console.error("Failed to cancel booking:", error);
                const code = error.code ? ` (コード: ${error.code})` : '';
                setError(`予約のキャンセルに失敗しました。${code}`);
            }
        }
    };

    const handleGenerateCourseWithAi = async (topic: string) => {
        try {
            const { title, description } = await generateCourseDetails(topic);
            const newCourseFromAi: Omit<Course, 'id'> & { id?: string } = {
                title,
                description,
                teacherId: '',
                studentIds: [],
            };
            setEditingCourse(newCourseFromAi as Course);
            setIsAiModalOpen(false);
        } catch (error: any) {
            console.error("AI course generation failed:", error);
            throw error;
        }
    };
    
    if (loading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;

    const userMap = new Map(users.filter(u => u && u.id).map(u => [u.id, u.name]));

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">管理者ダッシュボード</h1>
            {error && <Alert message={error} type="error" />}

            <div className="p-6 bg-white rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">ユーザー管理</h2>
                    <button onClick={() => setIsUserModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        新規ユーザー作成
                    </button>
                </div>
                <UserTable users={users} onEdit={setEditingUser} onDelete={handleDeleteUser} />
            </div>

            <div className="p-6 bg-white rounded-lg shadow">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                    <h2 className="text-xl font-semibold">コース管理</h2>
                     <div className="flex gap-2 flex-wrap">
                        <button onClick={() => setIsAiModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">
                            AIでコースを生成
                        </button>
                        <button onClick={() => setEditingCourse({} as Course)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                            新規コース作成
                        </button>
                    </div>
                </div>
                <CourseTable courses={courses} userMap={userMap} onEdit={setEditingCourse} onDelete={handleDeleteCourse} />
            </div>
            
            <div className="p-6 bg-white rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">予約管理</h2>
                <BookingTable bookings={bookings} userMap={userMap} onCancel={handleCancelBooking} />
            </div>

            {isAiModalOpen && <AiCourseGenerateModal onClose={() => setIsAiModalOpen(false)} onGenerate={handleGenerateCourseWithAi} />}
            {isUserModalOpen && <CreateUserModal onClose={() => setIsUserModalOpen(false)} onCreate={handleCreateUser} />}
            {editingUser && <UserEditModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleUpdateUser} />}
            {editingCourse && (
              <CourseEditModal
                course={editingCourse.id ? editingCourse : null}
                users={users}
                onClose={() => setEditingCourse(null)}
                onSave={handleSaveCourse}
              />
            )}
        </div>
    );
};

export default AdminPortal;