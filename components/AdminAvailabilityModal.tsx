import React, { useState } from 'react';
import { User, Availability } from '../types';
import { addAvailabilities, addRecurringAvailabilities } from '../services/firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import Modal from './Modal';
import Alert from './Alert';
import Calendar from './Calendar';
import { RepeatIcon } from './icons';

interface AdminAvailabilityModalProps {
  teachers: User[];
  onClose: () => void;
  onSaveSuccess: () => void;
}

type Mode = 'single' | 'recurring';
const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
const weekdays = ['日', '月', '火', '水', '木', '金', '土'];

const AdminAvailabilityModal: React.FC<AdminAvailabilityModalProps> = ({ teachers, onClose, onSaveSuccess }) => {
  const [mode, setMode] = useState<Mode>('single');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  
  // Single mode states
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimes, setSelectedTimes] = useState<string[]>([]);
  
  // Recurring mode states
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [recurringTime, setRecurringTime] = useState<string>('09:00');
  const [endDate, setEndDate] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleTimeToggle = (time: string) => {
    setSelectedTimes(prev => prev.includes(time) ? prev.filter(t => t !== time) : [...prev, time]);
  };
  
  const handleDayToggle = (dayIndex: number) => {
    setDaysOfWeek(prev => prev.includes(dayIndex) ? prev.filter(d => d !== dayIndex) : [...prev, dayIndex]);
  };

  const handleSubmit = async () => {
    if (!selectedTeacherId) {
      setError('教師を選択してください。');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (mode === 'single') {
        if (!selectedDate || selectedTimes.length === 0) {
          throw new Error('日付と少なくとも1つの時間帯を選択してください。');
        }
        const newAvailabilities: Omit<Availability, 'id'>[] = selectedTimes.map(time => {
          const [hours, minutes] = time.split(':').map(Number);
          const startTime = new Date(selectedDate);
          startTime.setHours(hours, minutes, 0, 0);
          const endTime = new Date(startTime);
          endTime.setHours(startTime.getHours() + 1);
          return {
            teacherId: selectedTeacherId,
            startTime: firebase.firestore.Timestamp.fromDate(startTime),
            endTime: firebase.firestore.Timestamp.fromDate(endTime),
          };
        });
        await addAvailabilities(newAvailabilities);
      } else { // Recurring mode
        if (daysOfWeek.length === 0 || !recurringTime || !endDate) {
          throw new Error('曜日、時間、繰り返し終了日をすべて選択してください。');
        }
        await addRecurringAvailabilities(selectedTeacherId, daysOfWeek, recurringTime, new Date(), new Date(endDate));
      }
      onSaveSuccess();
      onClose();
    } catch (e: any) {
      console.error('空き時間の登録に失敗:', e);
      setError(e.message || '空き時間の登録に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const renderSingleMode = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
      <Calendar onDateSelect={setSelectedDate} selectedDate={selectedDate} />
      {selectedDate && (
        <div>
          <h4 className="font-semibold mb-2 text-gray-800">{selectedDate.toLocaleDateString('ja-JP')} の時間帯:</h4>
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map(time => (
              <button key={time} onClick={() => handleTimeToggle(time)} className={`p-2 border rounded-md transition-colors ${selectedTimes.includes(time) ? 'bg-blue-500 text-white' : 'hover:bg-blue-100'}`}>
                {time}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderRecurringMode = () => (
    <div className="space-y-4 mt-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">曜日を選択 (複数可)</label>
        <div className="grid grid-cols-4 gap-2">
          {weekdays.map((day, index) => (
            <button key={index} onClick={() => handleDayToggle(index)} className={`p-2 border rounded-md transition-colors text-sm ${daysOfWeek.includes(index) ? 'bg-blue-500 text-white' : 'hover:bg-blue-100'}`}>
              {day}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="recurring-time" className="block text-sm font-medium text-gray-700">時間</label>
          <select id="recurring-time" value={recurringTime} onChange={e => setRecurringTime(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
            {timeSlots.map(time => <option key={time} value={time}>{time}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-gray-700">繰り返し終了日</label>
          <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
    </div>
  );
  
  return (
    <Modal title="教師の空き時間を追加" onClose={onClose}>
      <div className="space-y-4">
        {error && <Alert message={error} type="error" />}
        
        <div>
          <label htmlFor="teacher-select" className="block text-sm font-medium text-gray-700">教師を選択</label>
          <select id="teacher-select" value={selectedTeacherId} onChange={(e) => setSelectedTeacherId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
            <option value="" disabled>教師を選択してください</option>
            {teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.name}</option>)}
          </select>
        </div>

        <div className="flex justify-center p-1 bg-gray-100 rounded-lg">
          <button onClick={() => setMode('single')} className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-md transition-colors ${mode === 'single' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>
            単発スロット
          </button>
          <button onClick={() => setMode('recurring')} className={`w-1/2 px-4 py-2 text-sm font-semibold rounded-md transition-colors flex items-center justify-center gap-2 ${mode === 'recurring' ? 'bg-white text-blue-600 shadow' : 'text-gray-600'}`}>
            <RepeatIcon /> 繰り返しスロット
          </button>
        </div>

        {mode === 'single' ? renderSingleMode() : renderRecurringMode()}

        <div className="flex justify-end space-x-2 pt-4">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            キャンセル
          </button>
          <button onClick={handleSubmit} disabled={loading || !selectedTeacherId} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AdminAvailabilityModal;