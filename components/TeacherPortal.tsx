import React from 'react';

const TeacherPortal: React.FC = () => {
    // モックデータ
    const courses = [
        { id: 'c1', title: 'AI入門', studentCount: 25 },
        { id: 'c3', title: 'データ構造', studentCount: 30 },
        { id: 'c4', title: 'Web開発入門', studentCount: 45 },
    ];
    const upcomingAppointments = [
        { id: 'a1', studentName: '田中 アリス', time: '10:00 AM' },
        { id: 'a2', studentName: '鈴木 ボブ', time: '11:30 AM' },
        { id: 'a3', studentName: '佐藤 チャーリー', time: '2:00 PM' },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-800">教師ダッシュボード</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">私のコース</h2>
                    <ul className="space-y-2">
                        {courses.map(course => (
                            <li key={course.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition">
                                <span className="text-gray-700">{course.title}</span>
                                <span className="text-sm text-gray-500">{course.studentCount}人の生徒</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="p-6 bg-white rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">今後の予約</h2>
                    <ul className="space-y-2">
                        {upcomingAppointments.map(app => (
                            <li key={app.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-md hover:bg-gray-100 transition">
                                <span className="text-gray-700">{app.studentName}</span>
                                <span className="text-sm font-medium text-blue-600">{app.time}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default TeacherPortal;
