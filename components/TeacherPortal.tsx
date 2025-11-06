import React, { useState, useEffect } from 'react';
import { User, Course, Booking } from '../types';
import { getTeacherCourses, getTeacherBookings } from '../services/firebase';
import { generateLessonPlan } from '../services/geminiService';
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

    const [loadingPlan, setLoadingPlan] = useState(false);
    const [lessonPlan, setLessonPlan] = useState('');
    const [planError, setPlanError] = useState('');
    const [selectedCourseForPlan, setSelectedCourseForPlan] = useState<string | null>(null);

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
                const code = e.code ? ` (コード: ${e.code})` : '';
                setError(`ダッシュボードデータの読み込みに失敗しました。${code}`);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [user.id]);

    const handleGeneratePlan = async (courseTitle: string) => {
        setLoadingPlan(true);
        setLessonPlan('');
        setPlanError('');
        setSelectedCourseForPlan(courseTitle);
        try {
            const result = await generateLessonPlan(courseTitle);
            setLessonPlan(result);
        } catch (e: any) {
            setPlanError(e.message || "予期せぬエラーが発生しました。");
        } finally {
            setLoadingPlan(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }

    if (error) {
        return <Alert message={error} type="error" />;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">教師ダッシュボード</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-6 bg-white rounded-lg shadow lg:col-span-1">
                    <h2 className="text-xl font-semibold mb-4">私のコース</h2>
                    {courses.length > 0 ? (
                        <ul className="space-y-3">
                            {courses.map(course => (
                                <li key={course.id} className="p-3 bg-gray-50 rounded-md">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-800 font-semibold">{course.title}</span>
                                        <span className="text-sm text-gray-500">{course.studentIds.length}人の生徒</span>
                                    </div>
                                    <button
                                        onClick={() => handleGeneratePlan(course.title)}
                                        disabled={loadingPlan}
                                        className="w-full mt-2 px-3 py-1.5 text-sm text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400"
                                    >
                                        {loadingPlan && selectedCourseForPlan === course.title ? '生成中...' : 'AIでレッスン案を作成'}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-gray-500">担当しているコースはありません。</p>
                    )}
                </div>
                <div className="p-6 bg-white rounded-lg shadow lg:col-span-1">
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
                 <div className="p-6 bg-white rounded-lg shadow lg:col-span-1">
                    <h2 className="text-xl font-semibold mb-4">AIによるレッスン提案</h2>
                    {planError && <Alert message={planError} type="error" />}
                    {loadingPlan && <div className="flex justify-center items-center h-24"><Spinner /></div>}
                    {lessonPlan && !loadingPlan && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                          <h3 className="font-semibold text-green-800 mb-2">{selectedCourseForPlan} のレッスン案</h3>
                          <p className="text-gray-800 whitespace-pre-wrap">{lessonPlan}</p>
                        </div>
                    )}
                    {!lessonPlan && !loadingPlan && !planError && (
                        <p className="text-gray-500 text-center pt-8">コースの「AIでレッスン案を作成」をクリックして、授業のアイデアを得ましょう。</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeacherPortal;