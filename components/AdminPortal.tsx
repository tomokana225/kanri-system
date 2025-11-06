import React, { useState, useEffect, useCallback } from 'react';
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
            setError("データの読み込みに失敗しました。");
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
        } catch (error) {
            console.error("Failed to update user:", error);
            setError("ユーザーの更新に失敗しました。");
        }
    };
    
    const handleDeleteUser = async (uid: string) => {
        if (window.confirm('本当にこのユーザーを削除しますか？この操作は元に戻せません。')) {
            try {
                await deleteUser(uid);
                await fetchData();
            } catch (error) {
                console.error("Failed to delete user:", error);
                setError("ユーザーの削除に失敗しました。");
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
        } catch (error) {
            console.error("Failed to save course:", error);
            setError("コースの保存に失敗しました。");
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (window.confirm('本当にこのコースを削除しますか？')) {
            try {
                await deleteCourse(courseId);
                await fetchData();
            } catch (error) {
                console.error("Failed to delete course:", error);
                setError("コースの削除に失敗しました。");
            }
        }
    };
    
    const handleCancelBooking = async (bookingId: string) => {
        if (window.confirm('本当にこの予約をキャンセルしますか？')) {
            try {
                await updateBooking(bookingId, { status: 'cancelled' });
                await fetchData();
            } catch (error) {
                console.error("Failed to cancel booking:", error);
                setError("予約のキャンセルに失敗しました。");
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
    
    const userMap = new Map(users.map(u => [u.id, u.name]));
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

    if (loading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-gray-800">管理者ダッシュボード</h1>
            {error && <Alert message={error} type="error" />}

            {/* User Management */}
            <div className="p-6 bg-white rounded-lg shadow">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">ユーザー管理</h2>
                    <button onClick={() => setIsUserModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        新規ユーザー作成
                    </button>
                </div>
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
                            {users.map(user => (
                                <tr key={user.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{user.role}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => setEditingUser(user)} className="text-indigo-600 hover:text-indigo-900">編集</button>
                                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900">削除</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Course Management */}
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
                            {courses.map(course => (
                                <tr key={course.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{course.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{userMap.get(course.teacherId) || course.teacherId}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.studentIds.length}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button onClick={() => setEditingCourse(course)} className="text-indigo-600 hover:text-indigo-900">編集</button>
                                        <button onClick={() => handleDeleteCourse(course.id)} className="text-red-600 hover:text-red-900">削除</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Booking Management */}
            <div className="p-6 bg-white rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">予約管理</h2>
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
                            {bookings.map(booking => (
                                <tr key={booking.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{userMap.get(booking.studentId) || '不明'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{userMap.get(booking.teacherId) || '不明'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.courseTitle || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{booking.startTime.toDate().toLocaleString('ja-JP')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusClasses[booking.status]}`}>
                                          {statusText[booking.status]}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        {booking.status === 'confirmed' && (
                                            <button onClick={() => handleCancelBooking(booking.id)} className="text-red-600 hover:text-red-900">
                                                キャンセル
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
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