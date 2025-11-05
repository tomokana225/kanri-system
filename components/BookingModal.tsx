

import React, { useState, useMemo } from 'react';
import { User, ScheduleSlot } from '../types';
import { api } from '../services/api';
import Modal from './Modal';
import Alert from './Alert';

interface BookingModalProps {
  student: User;
  teacher: User;
  date: string;
  schedule: ScheduleSlot[];
  onClose: () => void;
  onBookingSuccess: () => void;
}

const BookingModal: React.FC<BookingModalProps> = ({ student, teacher, date, schedule, onClose, onBookingSuccess }) => {
  const [selectedTime, setSelectedTime] = useState('');
  const [subject, setSubject] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableSlots = useMemo(() => {
    return schedule.filter(s => s.date === date && s.isAvailable);
  }, [schedule, date]);

  const handleSubmit = async () => {
    if (!selectedTime || !subject) {
        setError('時間と科目を選択してください。');
        return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      // FIX: Use uid instead of id for user identifiers to match the User type and Firestore documents.
      const newBooking = await api.createBooking({
        studentId: student.uid,
        teacherId: teacher.uid,
        date,
        time: selectedTime,
        subject,
      });

      // Send notification to teacher
      // FIX: Use uid instead of id for user identifiers.
      await api.sendNotification({
          userId: teacher.uid,
          title: "新規予約のお知らせ",
          message: `<strong>${student.name}</strong>さんから新しい予約が入りました。<br>日時: ${new Date(date).toLocaleDateString()} ${selectedTime}<br>科目: ${subject}`
      });

      onBookingSuccess();
    } catch (err) {
      setError('予約の作成に失敗しました。時間をおいて再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={`${new Date(date).toLocaleDateString('ja-JP')} の予約`}
      onClose={onClose}
      onConfirm={handleSubmit}
      confirmText={isSubmitting ? "予約中..." : "予約を確定"}
      isConfirmDisabled={isSubmitting || !selectedTime || !subject}
    >
        {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      <div className="space-y-4">
        <p className="text-sm text-gray-600">先生: {teacher.name}</p>
        <div>
          <label className="block text-sm font-medium text-gray-700">時間を選択:</label>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
            {availableSlots.map(slot => (
              <button
                key={slot.id}
                onClick={() => setSelectedTime(slot.time)}
                className={`px-4 py-2 text-sm font-medium border rounded-md transition-colors ${
                  selectedTime === slot.time
                    ? 'bg-brand-primary text-white border-brand-primary'
                    : 'bg-white hover:bg-gray-50 border-gray-300'
                }`}
              >
                {slot.time}
              </button>
            ))}
          </div>
          {availableSlots.length === 0 && <p className="text-sm text-gray-500 mt-2">この日付に予約可能な時間枠はありません。</p>}
        </div>
        <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">科目:</label>
            <input
                type="text"
                id="subject"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                placeholder="例: 数学I, 英語コミュニケーション"
            />
        </div>
      </div>
    </Modal>
  );
};

export default BookingModal;