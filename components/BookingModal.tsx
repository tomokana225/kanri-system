import React, { useState, useEffect } from 'react';
import { User, Course, Booking } from '../types';
import { getAllCourses, createBooking, getAllUsers } from '../services/firebase';
import { Timestamp } from 'firebase/firestore';
import Modal from './Modal';
import Spinner from './Spinner';
import Alert from './Alert';
import Calendar from './Calendar';

interface BookingModalProps {
  user: User;
  onClose: () => void;
  onBookingSuccess: () => void;
}

// Dummy time slots for demonstration
const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];

const BookingModal: React.FC<BookingModalProps> = ({ user, onClose, onBookingSuccess }) => {
  const [step, setStep] = useState(1);
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Map<string, string>>(new Map());
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
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

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    setStep(2);
  };
  
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };
  
  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(3);
  };

  const handleConfirmBooking = async () => {
    if (!selectedCourse || !selectedDate || !selectedTime) {
        setError('予約情報が不完全です。');
        return;
    }
    setLoading(true);
    setError('');
    
    try {
        const [hours, minutes] = selectedTime.split(':').map(Number);
        const startTime = new Date(selectedDate);
        startTime.setHours(hours, minutes, 0, 0);

        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 1);

        const newBooking: Omit<Booking, 'id'> = {
            studentId: user.id,
            studentName: user.name,
            teacherId: selectedCourse.teacherId,
            courseId: selectedCourse.id,
            courseTitle: selectedCourse.title,
            startTime: Timestamp.fromDate(startTime),
            endTime: Timestamp.fromDate(endTime),
            status: 'confirmed',
        };

        await createBooking(newBooking);
        setStep(4);
    } catch (e: any) {
        const code = e.code ? ` (コード: ${e.code})` : '';
        setError(`予約の作成に失敗しました。${code}`);
        setLoading(false);
    }
  };
  
  const handleFinish = () => {
    onBookingSuccess();
    onClose();
  };

  const renderStep = () => {
    if (loading && step === 1) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }
    if (error) {
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
              <Calendar onDateSelect={handleDateSelect} selectedDate={selectedDate} />
              {selectedDate && (
                <div>
                  <h4 className="font-semibold mb-2">時間を選択:</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map(time => (
                      <button key={time} onClick={() => handleTimeSelect(time)} className="p-2 border rounded-md hover:bg-blue-500 hover:text-white transition">
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
             <button onClick={() => setStep(1)} className="mt-4 text-sm text-blue-600 hover:underline">← コース選択に戻る</button>
          </div>
        );
      case 3:
        return (
            <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">ステップ3: 予約内容の確認</h3>
                <div className="p-4 bg-gray-50 rounded-lg text-left space-y-2">
                    <p><strong>コース:</strong> {selectedCourse?.title}</p>
                    <p><strong>日時:</strong> {selectedDate?.toLocaleDateString('ja-JP')} {selectedTime}</p>
                    <p><strong>担当教師:</strong> {teachers.get(selectedCourse?.teacherId || '') || '不明'}</p>
                </div>
                <div className="mt-6 flex justify-center gap-4">
                    <button onClick={() => setStep(2)} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100">戻る</button>
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