import React, { useState, useEffect, useMemo } from 'react';
import { User, Course, Booking, Availability } from '../types';
import { getAllCourses, createBooking, getAllUsers, getTeacherAvailabilities } from '../services/firebase';
import Modal from './Modal';
import Spinner from './Spinner';
import Alert from './Alert';
import Calendar from './Calendar';

interface BookingModalProps {
  user: User;
  onClose: () => void;
  onBookingSuccess: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ user, onClose, onBookingSuccess }) => {
  const [step, setStep] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Map<string, string>>(new Map());
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAvailability, setSelectedAvailability] = useState<Availability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError('');
      try {
        const [fetchedCourses, fetchedUsers] = await Promise.all([getAllCourses(), getAllUsers()]);
        setCourses(fetchedCourses);
        const teacherMap = new Map(fetchedUsers.filter(u => u.role === 'teacher').map(t => [t.id, t.name]));
        setTeachers(teacherMap);
      } catch (e: any) {
        const code = e.code ? ` (コード: ${e.code})` : '';
        setError(`コースの読み込みに失敗しました。${code}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);
  
  const handleCourseSelect = async (course: Course) => {
    setLoading(true);
    setError('');
    setSelectedCourse(course);
    setSelectedDate(null);
    setSelectedAvailability(null);
    try {
        const teacherAvailabilities = await getTeacherAvailabilities(course.teacherId);
        setAvailabilities(teacherAvailabilities);
        setStep(2);
    } catch (e: any) {
        const code = e.code ? ` (コード: ${e.code})` : '';
        setError(`教師の空き時間の取得に失敗しました。${code}`);
    } finally {
        setLoading(false);
    }
  };
  
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedAvailability(null);
  };
  
  const handleTimeSelect = (availability: Availability) => {
    setSelectedAvailability(availability);
    setStep(3);
  };

  const handleConfirmBooking = async () => {
    if (!selectedCourse || !selectedAvailability) {
        setError('予約情報が不完全です。');
        return;
    }
    setLoading(true);
    setError('');
    
    try {
        const newBooking: Omit<Booking, 'id'> = {
            studentId: user.id,
            studentName: user.name,
            teacherId: selectedCourse.teacherId,
            courseId: selectedCourse.id,
            courseTitle: selectedCourse.title,
            startTime: selectedAvailability.startTime,
            endTime: selectedAvailability.endTime,
            status: 'confirmed',
        };

        await createBooking(newBooking, selectedAvailability.id);
        setStep(4);
    } catch (e: any) {
        const code = e.code ? ` (コード: ${e.code})` : '';
        setError(`予約の作成に失敗しました。${e.message}${code}`);
        setStep(2); // Go back to time selection on failure
    } finally {
        setLoading(false);
    }
  };
  
  const handleFinish = () => {
    onBookingSuccess();
    onClose();
  };

  const availableDates = useMemo(() => {
    return Array.from(
      new Set(
        availabilities.map(a => a.startTime.toDate().toDateString())
      )
    ).map(dateStr => new Date(dateStr));
  }, [availabilities]);

  const timeSlotsForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return availabilities.filter(
      a => a.startTime.toDate().toDateString() === selectedDate.toDateString()
    );
  }, [availabilities, selectedDate]);

  const renderStep = () => {
    if (loading) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }
    if (error && step !== 4) { // Don't show old error on success screen
        return <Alert message={error} type="error" />;
    }

    switch (step) {
      case 1:
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-center">ステップ1: コースを選択してください</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto p-2">
                {courses.map(course => (
                    <button key={course.id} onClick={() => handleCourseSelect(course)} className="p-4 border rounded-lg text-left hover:bg-gray-100 hover:shadow-md transition-all">
                        <p className="font-bold text-blue-700">{course.title}</p>
                        <p className="text-sm text-gray-600">{course.description}</p>
                        <p className="text-sm text-gray-500 mt-2">担当: {teachers.get(course.teacherId) || '不明'}</p>
                    </button>
                ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-center">ステップ2: 日時を選択してください</h3>
            <p className="text-center mb-2 text-gray-700">コース: <span className="font-bold">{selectedCourse?.title}</span></p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Calendar onDateSelect={handleDateSelect} selectedDate={selectedDate} availableDates={availableDates} />
              {selectedDate && (
                <div>
                  <h4 className="font-semibold mb-2">時間を選択:</h4>
                  {timeSlotsForSelectedDate.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {timeSlotsForSelectedDate.map(avail => (
                        <button key={avail.id} onClick={() => handleTimeSelect(avail)} className="p-2 border rounded-md hover:bg-blue-500 hover:text-white transition">
                          {avail.startTime.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </button>
                      ))}
                    </div>
                  ) : <p className="text-sm text-gray-500">選択した日付に空きがありません。</p>}
                </div>
              )}
            </div>
             <button onClick={() => { setStep(1); setError(''); }} className="mt-4 text-sm text-blue-600 hover:underline">← コース選択に戻る</button>
          </div>
        );
      case 3:
        const startTime = selectedAvailability?.startTime.toDate();
        return (
            <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">ステップ3: 予約内容の確認</h3>
                <div className="p-4 bg-gray-50 rounded-lg text-left space-y-2">
                    <p><strong>コース:</strong> {selectedCourse?.title}</p>
                    <p><strong>日時:</strong> {startTime?.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <p><strong>担当教師:</strong> {teachers.get(selectedCourse?.teacherId || '') || '不明'}</p>
                </div>
                <div className="mt-6 flex justify-center gap-4">
                    <button onClick={() => { setStep(2); setError(''); }} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100">戻る</button>
                    <button onClick={handleConfirmBooking} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {loading ? '処理中...' : '予約を確定する'}
                    </button>
                </div>
            </div>
        );
        case 4:
            return (
                <div className="text-center">
                    <h3 className="text-xl font-bold mb-4 text-green-600">予約が完了しました！</h3>
                    <p>ご予約ありがとうございます。詳細はダッシュボードで確認できます。</p>
                    <div className="mt-6">
                        <button onClick={handleFinish} className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">閉じる</button>
                    </div>
                </div>
            );
      default:
        return null;
    }
  };

  return (
    <Modal title="クラス予約" onClose={onClose}>
      {renderStep()}
    </Modal>
  );
};

export default BookingModal;