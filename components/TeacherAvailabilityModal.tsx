import React, { useState } from 'react';
import { User, Availability } from '../types';
import { addAvailabilities } from '../services/firebase';
import { Timestamp } from 'firebase/firestore';
import Modal from './Modal';
import Alert from './Alert';
import Calendar from './Calendar';

interface TeacherAvailabilityModalProps {
  user: User;
  onClose: () => void;
  onSaveSuccess: () => void;
}

const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const TeacherAvailabilityModal: React.FC<TeacherAvailabilityModalProps> = ({ user, onClose, onSaveSuccess }) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleTimeToggle = (time: string) => {
    setSelectedTimes(prev =>
      prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]
    );
  };

  const handleSubmit = async () => {
    if (!selectedDate || selectedTimes.length === 0) {
      setError('日付と少なくとも1つの時間帯を選択してください。');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const newAvailabilities: Omit<Availability, 'id'>[] = selectedTimes.map(time => {
        const [hours, minutes] = time.split(':').map(Number);
        const startTime = new Date(selectedDate);
        startTime.setHours(hours, minutes, 0, 0);

        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + 1);

        return {
          teacherId: user.id,
          startTime: Timestamp.fromDate(startTime),
          endTime: Timestamp.fromDate(endTime),
        };
      });

      await addAvailabilities(newAvailabilities);
      onSaveSuccess();
      onClose();
    } catch (e: any) {
      console.error('空き時間の登録に失敗:', e);
      setError('空き時間の登録に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="空き時間の登録" onClose={onClose}>
      <div className="space-y-4">
        {error && <Alert message={error} type="error" />}
        <p className="text-sm text-gray-600">指導可能な日付を選択し、時間帯を複数選択してください。</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Calendar onDateSelect={setSelectedDate} selectedDate={selectedDate} availableDates={[]} />
          {selectedDate && (
            <div>
              <h4 className="font-semibold mb-2 text-gray-800">
                {selectedDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })} の時間帯を選択:
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map(time => (
                  <button
                    key={time}
                    onClick={() => handleTimeToggle(time)}
                    className={`p-2 border rounded-md transition-colors ${
                      selectedTimes.includes(time)
                        ? 'bg-blue-500 text-white'
                        : 'hover:bg-blue-100'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedDate || selectedTimes.length === 0}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TeacherAvailabilityModal;