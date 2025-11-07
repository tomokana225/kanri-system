import React, { useState, useEffect, useCallback } from 'react';
import { User, Course } from '../types';
import { 
    getAllUsers, 
    getAllCourses, 
    updateUserProfile, 
    createCourse, 
    updateCourse, 
    deleteCourse,
    createUserProfile
} from '../services/firebase';
import { generateCourseDetails } from '../services/geminiService';
import Spinner from './Spinner';
import Alert from './Alert';
import UserEditModal from './UserEditModal';
import CreateUserModal from './CreateUserModal';
import CourseEditModal from './CourseEditModal';
import AiCourseGenerateModal from './AiCourseGenerateModal';

const AdminPortal: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [view, setView] = useState<'users' | 'courses'>('users');
    
    // Modals state
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [isCreatingCourse, setIsCreatingCourse] = useState(false);
    const [isAiGenerating, setIsAiGenerating] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [fetchedUsers, fetchedCourses] = await Promise.all([getAllUsers(), getAllCourses()]);
            setUsers(fetchedUsers);
            setCourses(fetchedCourses);
        } catch (e: any) {
            setError('データの取得に失敗しました。' + (e.message || ''));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // User Handlers
    const handleSaveUser = async (uid: string, userData: Partial<Omit<User, 'id'>>) => {
        await updateUserProfile(uid, userData);
        setEditingUser(null);
        fetchData();
    };

    const handleCreateUser = async (newUser: Omit<User, 'id'>) => {
        // This is a simplified version. A real app would use a cloud function to create an auth user.
        // For this demo, we can't create an auth user, so we'll just add them to Firestore.
        // They won't be able to log in until they register with the same email.
        const pseudoUid = `manual-${new Date().getTime()}`;
        await createUserProfile(pseudoUid, newUser);
        setIsCreatingUser(false);
        fetchData();
    };

    // Course Handlers
    const handleSaveCourse = async (courseData: Partial<Omit<Course, 'id'>>, courseId?: string) => {
        if (courseId) {
            await updateCourse(courseId, courseData);
        } else {
            await createCourse(courseData as Omit<Course, 'id'>);
        }
        setEditingCourse(null);
        setIsCreatingCourse(false);
        fetchData();
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (window.confirm('このコースを本当に削除しますか？')) {
            await deleteCourse(courseId);
            fetchData();
        }
    };
    
    const handleAiGenerate = async (topic: string) => {
        const { title, description } = await generateCourseDetails(topic);
        setIsAiGenerating(false);
        setIsCreatingCourse(true); // Open the create modal
        // Pre-fill the form with generated details
        setEditingCourse({ id: '', title, description, teacherId: '', studentIds: [], teacherName: '' });
    };

    const renderUsers = () => (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">ユーザー管理</h2>
                <button onClick={() => setIsCreatingUser(true)} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">新規ユーザー作成</button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="p-3">氏名</th>
                            <th className="p-3">メールアドレス</th>
                            <th className="p-3">役割</th>
                            <th className="p-3">アクション</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b hover:bg-gray-50">
                                <td className="p-3">{user.name}</td>
                                <td className="p-3">{user.email}</td>
                                <td className="p-3">{user.role}</td>
                                <td className="p-3">
                                    <button onClick={() => setEditingUser(user)} className="text-blue-600 hover:underline">編集</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
    
    const renderCourses = () => (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">コース管理</h2>
                <div className="space-x-2">
                    <button onClick={() => setIsAiGenerating(true)} className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">AIでコース生成</button>
                    <button onClick={() => { setEditingCourse(null); setIsCreatingCourse(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">新規コース作成</button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className="p-3">コース名</th>
                            <th className="p-3">担当教師</th>
                            <th className="p-3">生徒数</th>
                            <th className="p-3">アクション</th>
                        </tr>
                    </thead>
                    <tbody>
                        {courses.map(course => (
                            <tr key={course.id} className="border-b hover:bg-gray-50">
                                <td className="p-3 font-medium">{course.title}</td>
                                <td className="p-3">{course.teacherName}</td>
                                <td className="p-3">{course.studentIds.length}</td>
                                <td className="p-3 space-x-4">
                                    <button onClick={() => { setEditingCourse(course); setIsCreatingCourse(false); }} className="text-blue-600 hover:underline">編集</button>
                                    <button onClick={() => handleDeleteCourse(course.id)} className="text-red-600 hover:underline">削除</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (loading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">管理者ダッシュボード</h1>
            {error && <Alert message={error} type="error" />}
            
            <div className="flex space-x-2 border-b">
                <button onClick={() => setView('users')} className={`px-4 py-2 font-semibold ${view === 'users' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>ユーザー</button>
                <button onClick={() => setView('courses')} className={`px-4 py-2 font-semibold ${view === 'courses' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>コース</button>
            </div>

            {view === 'users' ? renderUsers() : renderCourses()}

            {editingUser && <UserEditModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveUser} />}
            {isCreatingUser && <CreateUserModal onClose={() => setIsCreatingUser(false)} onCreate={handleCreateUser} />}
            {(isCreatingCourse || editingCourse) && <CourseEditModal course={editingCourse} users={users} onClose={() => { setIsCreatingCourse(false); setEditingCourse(null); }} onSave={handleSaveCourse} />}
            {isAiGenerating && <AiCourseGenerateModal onClose={() => setIsAiGenerating(false)} onGenerate={handleAiGenerate} />}
        </div>
    );
};

export default AdminPortal;
