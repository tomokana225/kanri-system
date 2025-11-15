import React, { useState, useMemo } from 'react';
import { User, Course, Booking } from '../types';
import { createManualBooking } from '../services/firebase';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import Modal from './Modal';
import Alert from './Alert';
import Calendar from './Calendar';

interface AdminManualBookingModalProps {
  users: User[];
  courses: Course[];
  onClose: () => void;
  onSaveSuccess: () => void;
}

const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

const AdminManualBookingModal: React.FC<AdminManualBookingModalProps> = ({ users, courses, onClose, onSaveSuccess }) => {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const students = useMemo(() => users.filter(u => u.role === 'student'), [users]);
  const userMap = useMemo(() => new Map(users.map(u => [u.id, u])), [users]);
  
  const selectedCourse = useMemo(() => courses.find(c => c.id === selectedCourseId), [courses, selectedCourseId]);
  const teacher = useMemo(() => selectedCourse ? userMap.get(selectedCourse.teacherId) : null, [selectedCourse, userMap]);

  const handleSubmit = async () => {
    if (!selectedStudentId || !selectedCourseId || !selectedDate || !selectedTime) {
      setError('すべての項目を入力してください。');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const student = userMap.get(selectedStudentId);
      if (!student || !selectedCourse || !teacher) {
        throw new Error("選択された情報が無効です。");
      }

      const [hours, minutes] = selectedTime.split(':').map(Number);
      const startTime = new Date(selectedDate);
      startTime.setHours(hours, minutes, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(startTime.getHours() + 1);

      const newBooking: Omit<Booking, 'id'> = {
        studentId: student.id,
        studentName: student.name,
        teacherId: teacher.id,
        courseId: selectedCourse.id,
        courseTitle: selectedCourse.title,
        startTime: firebase.firestore.Timestamp.fromDate(startTime),
        endTime: firebase.firestore.Timestamp.fromDate(endTime),
        status: 'confirmed',
      };
      
      await createManualBooking(newBooking);
      onSaveSuccess();
      onClose();

    } catch (e: any) {
      console.error('手動予約の作成に失敗:', e);
      setError(e.message || '予約の作成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title="手動で予約を作成" onClose={onClose}>
      <div className="space-y-4">
        {error && <Alert message={error} type="error" />}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="student-select" className="block text-sm font-medium text-gray-700">生徒を選択</label>
                <select id="student-select" value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                    <option value="" disabled>生徒を選択...</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="course-select" className="block text-sm font-medium text-gray-700">コースを選択</label>
                <select id="course-select" value={selectedCourseId} onChange={(e) => setSelectedCourseId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                    <option value="" disabled>コースを選択...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
            </div>
        </div>

        {teacher && <p className="text-sm text-gray-500">担当教師: {teacher.name}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Calendar onDateSelect={setSelectedDate} selectedDate={selectedDate} />
          {selectedDate && (
            <div>
              <h4 className="font-semibold mb-2 text-gray-800">時間を選択:</h4>
              <div className="grid grid-cols-3 gap-2">
                {timeSlots.map(time => (
                  <button key={time} onClick={() => setSelectedTime(time)} className={`p-2 border rounded-md transition-colors ${selectedTime === time ? 'bg-blue-500 text-white' : 'hover:bg-blue-100'}`}>
                    {time}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <button type="button" onClick={onClose} disabled={loading} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
            キャンセル
          </button>
          <button onClick={handleSubmit} disabled={loading || !selectedStudentId || !selectedCourseId || !selectedDate || !selectedTime} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50">
            {loading ? '作成中...' : '予約を作成'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AdminManualBookingModal;