import React, { useState, useEffect, useCallback } from 'react';
import { User, Course } from '../types';
import {
  getAllUsers,
  getAllCourses,
  deleteUser,
  deleteCourse,
  createCourse as apiCreateCourse,
  updateUser as apiUpdateUser,
  updateCourse as apiUpdateCourse,
} from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import CreateUserModal from './CreateUserModal';
import UserEditModal from './UserEditModal';
import CourseEditModal from './CourseEditModal';


const AdminPortal: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [fetchedUsers, fetchedCourses] = await Promise.all([
                getAllUsers(),
                getAllCourses(),
            ]);
            setUsers(fetchedUsers);
            setCourses(fetchedCourses);
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
        // Creating Firebase Auth users from the client is not recommended without Admin SDK.
        // This would typically be a call to a serverless function.
        alert("ユーザー作成機能は現在シミュレートされています。完全な実装にはFirebase Admin SDKが必要です。");
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
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">コース管理</h2>
                    <button onClick={() => setEditingCourse({} as Course)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                        新規コース作成
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">コース名</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">担当教師 ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">生徒数</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">アクション</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {courses.map(course => (
                                <tr key={course.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{course.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{course.teacherId}</td>
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

            {isUserModalOpen && <CreateUserModal onClose={() => setIsUserModalOpen(false)} onCreate={handleCreateUser} />}
            {editingUser && <UserEditModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleUpdateUser} />}
            {editingCourse && (
              <CourseEditModal
                course={editingCourse.id ? editingCourse : null}
                onClose={() => setEditingCourse(null)}
                onSave={handleSaveCourse}
              />
            )}
        </div>
    );
};

export default AdminPortal;
