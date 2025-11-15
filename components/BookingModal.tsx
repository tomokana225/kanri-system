import React, { useState, useEffect, useMemo } from 'react';
import { User, Course, Booking, Availability } from '../types';
import { getAvailabilitiesForTeacher, createBooking } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';
import Calendar from './Calendar';
// Fix: Import the Modal component to be used as a wrapper. The CloseIcon is used within Modal.
import Modal from './Modal';

interface BookingModalProps {
  user: User;
  courses: Course[];
  onClose: () => void;
  onBookingSuccess: () => void;
}

type BookingStep = 'course' | 'date' | 'time' | 'confirm' | 'success';

const BookingModal: React.FC<BookingModalProps> = ({ user, courses, onClose, onBookingSuccess }) => {
  const [step, setStep] = useState<BookingStep>('course');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAvailability, setSelectedAvailability] = useState<Availability | null>(null);

  useEffect(() => {
    const fetchAvailabilities = async () => {
      if (selectedCourse) {
        setLoading(true);
        setError('');
        try {
          const avails = await getAvailabilitiesForTeacher(selectedCourse.teacherId);
          const availableSlots = avails.filter(a => a.status !== 'booked');
          setAvailabilities(availableSlots);
          
          if (availableSlots.length > 0) {
              setStep('date');
          } else {
              setError('現在、この教師の空き時間はありません。');
              setStep('course'); 
              setSelectedCourse(null);
          }

        } catch (e: any) {
          const code = e.code ? ` (コード: ${e.code})` : '';
          setError(`教師の空き時間の取得に失敗しました。${code}`);
          setStep('course');
          setSelectedCourse(null);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchAvailabilities();
  }, [selectedCourse]);

  const availableDates = useMemo(() => {
    const uniqueDates = new Set<string>();
    availabilities.forEach(a => {
      uniqueDates.add(a.startTime.toDate().toDateString());
    });
    return Array.from(uniqueDates).map(d => new Date(d));
  }, [availabilities]);

  const timesForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    return availabilities
      .filter(a => a.startTime.toDate().toDateString() === selectedDate.toDateString())
      .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
  }, [selectedDate, availabilities]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setStep('time');
  };

  const handleTimeSelect = (availability: Availability) => {
    setSelectedAvailability(availability);
    setStep('confirm');
  };
  
  const handleConfirmBooking = async () => {
    if (!selectedCourse || !selectedAvailability) return;
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
        setStep('success');
    } catch (err: any) {
        if (err.message.includes('already booked')) {
            setError('申し訳ありませんが、この時間枠はたった今予約されました。');
        } else {
            const code = err.code ? ` (コード: ${err.code})` : '';
            setError(`予約に失敗しました。${code}`);
        }
        setStep('time'); // Go back to time selection
    } finally {
        setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'course':
        return (
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">1. コースを選択してください</h3>
            {error && <Alert message={error} type="error" />}
            {loading && <div className="flex justify-center"><Spinner /></div>}
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {courses.map(course => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourse(course)}
                  className="w-full text-left p-3 border rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <p className="font-semibold">{course.title}</p>
                  <p className="text-sm text-gray-500">教師: {course.teacherName}</p>
                </button>
              ))}
            </div>
          </div>
        );
      case 'date':
        return (
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">2. 日付を選択してください</h3>
            <p className="text-sm text-gray-500 mb-2">コース: {selectedCourse?.title}</p>
            {loading && <div className="flex justify-center"><Spinner /></div>}
            <Calendar onDateSelect={handleDateSelect} selectedDate={selectedDate} availableDates={availableDates} />
            <button onClick={() => { setStep('course'); setSelectedCourse(null); }} className="mt-4 text-sm text-blue-600">コース選択に戻る</button>
          </div>
        );
      case 'time':
        return (
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">3. 時間を選択してください</h3>
            <p className="text-sm text-gray-500 mb-2">日付: {selectedDate?.toLocaleDateString('ja-JP')}</p>
            {loading && <div className="flex justify-center"><Spinner /></div>}
            {error && <Alert message={error} type="error" />}
            <div className="grid grid-cols-3 gap-2">
              {timesForSelectedDate.map(avail => (
                <button
                  key={avail.id}
                  onClick={() => handleTimeSelect(avail)}
                  className="p-2 border rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {avail.startTime.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </button>
              ))}
            </div>
            <button onClick={() => setStep('date')} className="mt-4 text-sm text-blue-600">日付選択に戻る</button>
          </div>
        );
      case 'confirm':
        return (
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">4. 予約内容の確認</h3>
            <div className="p-4 bg-gray-50 rounded-md space-y-1">
              <p><strong>コース:</strong> {selectedCourse?.title}</p>
              <p><strong>教師:</strong> {selectedCourse?.teacherName}</p>
              <p><strong>日時:</strong> {selectedAvailability?.startTime.toDate().toLocaleString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            {loading && <div className="flex justify-center mt-4"><Spinner /></div>}
            {error && <Alert message={error} type="error" />}
            <div className="flex justify-between items-center mt-6">
              <button onClick={() => setStep('time')} className="text-sm text-blue-600" disabled={loading}>時間選択に戻る</button>
              <button onClick={handleConfirmBooking} disabled={loading} className="px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 disabled:opacity-50">
                {loading ? '予約中...' : '予約を確定'}
              </button>
            </div>
          </div>
        );
      case 'success':
        return (
          <div className="text-center py-4">
            <h3 className="text-lg font-medium text-green-700">予約が完了しました！</h3>
            <p className="mt-2 text-gray-600">ご予約ありがとうございます。詳細はマイポータルでご確認ください。</p>
            {/* Fix: Complete the button that was cut off in the provided file content. */}
            <button onClick={() => { onBookingSuccess(); onClose(); }} className="mt-6 px-4 py-2 font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700">
                閉じる
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  // Fix: Add a return statement to the component to render JSX, resolving the type error.
  return (
    <Modal title="クラスを予約" onClose={onClose}>
      {renderStep()}
    </Modal>
  );
};

// Fix: Add a default export to resolve the import error in StudentPortal.tsx.
export default BookingModal;
