import React, { useState, useEffect } from 'react';
import { User, Course, Booking } from '../types';
import { getTeacherCourses, getTeacherBookings } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';

interface TeacherPortalProps {
  user: User;
}

const TeacherPortal: React.FC<TeacherPortalProps> = ({ user }) => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setError('');
            try {
                const [teacherCourses, teacherBookings] = await Promise.all([
                    getTeacherCourses(user.id),
                    getTeacherBookings(user.id),
                ]);
                setCourses(teacherCourses);
                setBookings(teacherBookings);
            } catch (e: any) {
                console.error("教師データの取得に失敗:", e);
                setError("ダッシュボードデータの読み込みに失敗しました。");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user.id]);

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }

    if (error) {
        return <Alert message={error} type="error" />;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">教師ダッシュボード</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">私のコース</h2>
                    {courses.length > 0 ? (
                        <ul className="space-y-2">
                            {courses.map(course => (
                                <li key={course.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition">
                                    <span className="text-gray-700">{course.title}</span>
                                    <span className="text-sm text-gray-500">{course.studentIds.length}人の生徒</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">担当しているコースはありません。</p>
                    )}
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">今後の予約</h2>
                    {bookings.length > 0 ? (
                        <ul className="space-y-2">
                            {bookings.map(app => (
                                <li key={app.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition">
                                    <span className="text-gray-700">{app.studentName}</span>
                                    <span className="text-sm font-medium text-blue-600">
                                        {app.startTime.toDate().toLocaleString('ja-JP', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <p className="text-gray-500">今後の予約はありません。</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherPortal;
