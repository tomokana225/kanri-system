import React, { useState, useEffect, useMemo } from 'react';
import { User, Course, Booking, Availability } from '../types';
import { getAvailabilitiesForTeacher, createBooking } from '../services/firebase';
import { Timestamp } from 'firebase/firestore';
import Modal from './Modal';
import Spinner from './Spinner';
import Alert from './Alert';
import Calendar from './Calendar';
import { CloseIcon } from './icons';

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
          setAvailabilities(avails.filter(a => a.status !== 'booked'));
          setStep('date');
        } catch (e: any) {
          setError('教師の空き時間の取得に失敗しました。');
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

  const resetState = () => {
    setStep('course');
    setSelectedCourse(null);
    setAvailabilities([]);
    setSelectedDate(null);
    setSelectedAvailability(null);
    setError('');
  };

  const renderContent = () => {
    if (loading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    
    switch (step) {
      case 'course':
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">1. コースを選択してください</h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {courses.map(course => (
                <button key={course.id} onClick={() => setSelectedCourse(course)} className="w-full text-left p-4 border rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">2. 日付を選択してください</h3>
            {availableDates.length > 0 ? (
              <Calendar onDateSelect={handleDateSelect} selectedDate={selectedDate} availableDates={availableDates} />
            ) : (
              <p className="text-center text-gray-500 py-10">現在、この教師の空き時間はありません。</p>
            )}
          </div>
        );

      case 'time':
        return (
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">3. 時間を選択してください</h3>
                <p className="text-center text-gray-600 mb-4 font-semibold">{selectedDate?.toLocaleDateString('ja-JP')}</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {timesForSelectedDate.map(avail => (
                        <button key={avail.id} onClick={() => handleTimeSelect(avail)} className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                            {avail.startTime.toDate().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </button>
                    ))}
                </div>
            </div>
        );
        
      case 'confirm':
        if (!selectedCourse || !selectedAvailability) return null;
        return (
            <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">4. 予約内容の確認</h3>
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                    <p><strong>コース:</strong> {selectedCourse.title}</p>
                    <p><strong>教師:</strong> {selectedCourse.teacherName}</p>
                    <p><strong>日時:</strong> {selectedAvailability.startTime.toDate().toLocaleString('ja-JP')}</p>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <button onClick={() => setStep('time')} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">戻る</button>
                    <button onClick={handleConfirmBooking} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">予約を確定する</button>
                </div>
            </div>
        );
        
      case 'success':
        return (
            <div className="text-center py-10">
                <h3 className="text-xl font-bold text-green-600 mb-2">予約が完了しました！</h3>
                <p className="text-gray-600">詳細は「今後の予約」から確認できます。</p>
                <button onClick={() => { onBookingSuccess(); onClose(); }} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">閉じる</button>
            </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 transform transition-all">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">クラスを予約</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon /></button>
        </div>
        <div className="p-6">
            {error && <Alert message={error} type="error" />}
            {renderContent()}
        </div>
        {step !== 'course' && step !== 'success' && (
            <div className="p-4 border-t">
                <button onClick={resetState} className="text-sm text-blue-600 hover:underline">最初からやり直す</button>
            </div>
        )}
      </div>
    </div>
  );
};

export default BookingModal;
