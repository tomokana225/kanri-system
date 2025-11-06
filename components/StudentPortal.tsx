import React, { useState, useEffect, useCallback } from 'react';
import { User, Course, Booking } from '../types';
import { generateStudentProgressSummary } from '../services/geminiService';
import { getStudentCourses, getStudentBookings } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import BookingModal from './BookingModal';

interface StudentPortalProps {
  user: User;
}

const StudentPortal: React.FC<StudentPortalProps> = ({ user }) => {
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Course[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [coursesError, setCoursesError] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState('');

  const fetchStudentData = useCallback(async () => {
    setLoadingCourses(true);
    setLoadingBookings(true);
    setCoursesError('');
    setBookingsError('');
    try {
      const [courses, studentBookings] = await Promise.all([
        getStudentCourses(user.id),
        getStudentBookings(user.id)
      ]);
      setEnrolledCourses(courses);
      setBookings(studentBookings.filter(b => b.startTime.toDate() > new Date()));
    } catch (e) {
      console.error('学生データの取得に失敗しました:', e);
      setCoursesError('登録コースの取得に失敗しました。');
      setBookingsError('予約の取得に失敗しました。');
    } finally {
      setLoadingCourses(false);
      setLoadingBookings(false);
    }
  }, [user.id]);

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  const handleGenerateSummary = async (courseTitle: string) => {
    setLoadingSummary(true);
    setSelectedCourse(courseTitle);
    setSummary('');
    setSummaryError('');
    try {
      const result = await generateStudentProgressSummary(user, courseTitle);
      setSummary(result);
    } catch (e: any) {
      setSummaryError(e.message || "予期せぬエラーが発生しました。");
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleBookingSuccess = () => {
    fetchStudentData();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">学生ダッシュボード</h1>

      <div className="p-6 bg-white rounded-lg shadow text-center border-t-4 border-blue-500">
        <h2 className="text-2xl font-semibold mb-2 text-gray-800">新しいクラスを予約する</h2>
        <p className="text-gray-600 mb-4 max-w-2xl mx-auto">カレンダーから好きなコースと時間を選んで、次の学習計画を立てましょう。</p>
        <button
          onClick={() => setIsBookingModalOpen(true)}
          className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 shadow-lg"
        >
          クラスを予約
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">私のコース</h2>
          {loadingCourses ? (
            <div className="flex justify-center items-center h-24"><Spinner /></div>
          ) : coursesError ? (
            <Alert message={coursesError} type="error" />
          ) : enrolledCourses.length === 0 ? (
            <p className="text-gray-500 text-center pt-8">現在登録されているコースはありません。</p>
          ) : (
            <ul className="space-y-3">
              {enrolledCourses.map(course => (
                <li key={course.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 bg-gray-50 rounded-md">
                  <span className="text-gray-700 mb-2 sm:mb-0">{course.title}</span>
                  <button
                    onClick={() => handleGenerateSummary(course.title)}
                    disabled={loadingSummary}
                    className="px-3 py-1 text-sm text-white bg-blue-500 rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed w-full sm:w-auto"
                    title={"AIによる進捗サマリーを生成します"}
                  >
                    {loadingSummary && selectedCourse === course.title ? '生成中...' : 'AIサマリーを取得'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-1 p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">今後の予約</h2>
          {loadingBookings ? (
            <div className="flex justify-center items-center h-24"><Spinner /></div>
          ) : bookingsError ? (
            <Alert message={bookingsError} type="error" />
          ) : bookings.length === 0 ? (
            <p className="text-gray-500 text-center pt-8">今後の予約はありません。</p>
          ) : (
            <ul className="space-y-3">
              {bookings.map(booking => (
                <li key={booking.id} className="p-3 bg-gray-50 rounded-md">
                  <p className="font-semibold text-gray-800">{booking.courseTitle}</p>
                  <p className="text-sm text-gray-500">
                    {booking.startTime.toDate().toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-1 p-6 bg-white rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">AIによる進捗サマリー</h2>
          {summaryError && <Alert message={summaryError} type="error" />}

          {loadingSummary && <div className="flex justify-center items-center h-24"><Spinner /></div>}

          {summary && !loadingSummary && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h3 className="font-semibold text-blue-800 mb-2">{selectedCourse} のサマリー</h3>
              <p className="text-gray-800 whitespace-pre-wrap">{summary}</p>
            </div>
          )}

          {!summary && !loadingSummary && (
            <p className="text-gray-500 text-center pt-8">コースの「AIサマリーを取得」をクリックして、進捗の概要を確認してください。</p>
          )}
        </div>
      </div>
      {isBookingModalOpen && <BookingModal user={user} onClose={() => setIsBookingModalOpen(false)} onBookingSuccess={handleBookingSuccess} />}
    </div>
  );
};

export default StudentPortal;
