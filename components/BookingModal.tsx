import React, { useState, useEffect, useMemo } from 'react';
import { User, Course, Booking, Availability } from '../types';
import { getAllCourses, createBooking, getTeacherAvailabilities } from '../services/firebase';
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
        const fetchedCourses = await getAllCourses();
        setCourses(fetchedCourses);
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
        // Move to next step only if there are availabilities
        if (teacherAvailabilities.length > 0) {
            setStep(2);
        }
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
    setStep(3);
  };
  
  const handleTimeSelect = (availability: Availability) => {
    setSelectedAvailability(availability);
    setStep(4);
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
        setStep(5);
    } catch (e: any) {
        const code = e.code ? ` (コード: ${e.code})` : '';
        if (e.message && e.message.includes("no longer available")) {
            setError("申し訳ありませんが、この時間枠はたった今予約されました。別の時間を選択してください。");
        } else {
            setError(`予約の作成に失敗しました。${e.message}${code}`);
        }
        setStep(3); // Go back to time selection on failure
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

  const renderContent = () => {
    if (loading) {
        return <div className="flex justify-center items-center h-96"><Spinner /></div>;
    }
    
    if (error) {
      return (
        <div className="text-center p-4">
            <Alert message={error} type="error" />
            <button onClick={() => { setStep(1); setError(''); setSelectedCourse(null); }} className="mt-4 text-sm text-blue-600 hover:underline">← コース選択に戻る</button>
        </div>
      );
    }

    if (selectedCourse && availabilities.length === 0) {
      return (
        <div className="text-center p-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">空き時間がありません</h3>
            <p className="text-gray-600 mb-6">{selectedCourse.teacherName || 'この教師'}には、現在予約可能な日時が登録されていません。</p>
            <button onClick={() => { setStep(1); setSelectedCourse(null); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                他のコースを選択する
            </button>
        </div>
      )
    }

    switch (step) {
      case 1:
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4 text-center">ステップ1: コースを選択してください</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto p-2">
                {courses.map(course => (
                    <button key={course.id} onClick={() => handleCourseSelect(course)} className="p-4 border rounded-lg text-left hover:bg-gray-100 hover:shadow-md transition-all disabled:opacity-50" disabled={loading}>
                        <p className="font-bold text-blue-700">{course.title}</p>
                        <p className="text-sm text-gray-600">{course.description}</p>
                        <p className="text-sm text-gray-500 mt-2">担当: {course.teacherName || '不明'}</p>
                    </button>
                ))}
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h3 className="text-lg font-semibold mb-1 text-center">ステップ2: 日付を選択してください</h3>
            <p className="text-center mb-4 text-gray-700 text-sm">コース: <span className="font-bold">{selectedCourse?.title}</span></p>
            <div className="w-full">
                <Calendar onDateSelect={handleDateSelect} selectedDate={selectedDate} availableDates={availableDates} />
            </div>
            <button onClick={() => { setStep(1); setSelectedCourse(null); }} className="mt-4 text-sm text-blue-600 hover:underline">← コース選択に戻る</button>
          </div>
        );
      case 3:
        return (
          <div>
            <h3 className="text-lg font-semibold mb-2 text-center">ステップ3: 時間を選択してください</h3>
            <p className="text-center mb-4 text-gray-700 text-sm">選択中の日付: <span className="font-bold">{selectedDate?.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}</span></p>
            {timeSlotsForSelectedDate.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {timeSlotsForSelectedDate.sort((a,b) => a.startTime.toMillis() - b.startTime.toMillis()).map(avail => (
                  <button key={avail.id} onClick={() => handleTimeSelect(avail)} className="p-2 border rounded-md hover:bg-blue-500 hover:text-white transition text-center font-medium">
                    {avail.startTime.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                  </button>
                ))}
              </div>
            ) : <p className="text-sm text-gray-500 text-center py-4">選択した日付に予約可能な時間はありません。</p>}
             <button onClick={() => setStep(2)} className="mt-4 text-sm text-blue-600 hover:underline">← 日付選択に戻る</button>
          </div>
        );
      case 4:
        const startTime = selectedAvailability?.startTime.toDate();
        return (
            <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">ステップ4: 予約内容の確認</h3>
                <div className="p-4 bg-gray-50 rounded-lg text-left space-y-2">
                    <p><strong>コース:</strong> {selectedCourse?.title}</p>
                    <p><strong>日時:</strong> {startTime?.toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    <p><strong>担当教師:</strong> {selectedCourse?.teacherName || '不明'}</p>
                </div>
                <div className="mt-6 flex justify-center gap-4">
                    <button onClick={() => { setStep(3); setError(''); }} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100">戻る</button>
                    <button onClick={handleConfirmBooking} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
                        {loading ? '処理中...' : '予約を確定する'}
                    </button>
                </div>
            </div>
        );
        case 5:
            return (
                <div className="text-center p-8">
                    <h3 className="text-xl font-bold mb-4 text-green-600">予約が完了しました！</h3>
                    <p className="text-gray-600">ご予約ありがとうございます。詳細はダッシュボードで確認できます。</p>
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
      {renderContent()}
    </Modal>
  );
};

export default BookingModal;