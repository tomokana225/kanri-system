import React, { useState, useEffect } from 'react';
import { Course, User } from '../types';
import Modal from './Modal';
import Alert from './Alert';

interface CourseEditModalProps {
  course: Course | null; // null for creating a new course
  users: User[];
  onClose: () => void;
  onSave: (courseData: Partial<Omit<Course, 'id'>>, courseId?: string) => Promise<void>;
}

const CourseEditModal: React.FC<CourseEditModalProps> = ({ course, users, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = course && course.id;
  const teachers = users.filter(u => u.role === 'teacher');
  const students = users.filter(u => u.role === 'student');

  useEffect(() => {
    if (isEditing) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      setTeacherId(course.teacherId || '');
      setSelectedStudentIds(course.studentIds || []);
    } else {
      // Reset form for new course
      setTitle('');
      setDescription('');
      setTeacherId('');
      setSelectedStudentIds([]);
    }
  }, [course, isEditing]);

  const handleStudentSelection = (studentId: string) => {
    setSelectedStudentIds(prev =>
        prev.includes(studentId)
            ? prev.filter(id => id !== studentId)
            : [...prev, studentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherId) {
        setError('担当教師を選択してください。');
        return;
    }
    setError('');
    setLoading(true);

    const courseData = {
        title,
        description,
        teacherId,
        studentIds: selectedStudentIds,
    };

    try {
        await onSave(courseData, isEditing ? course.id : undefined);
        onClose(); // Close modal on success
    } catch (err: any) {
        setError(err.message || 'コースの保存に失敗しました。');
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal title={isEditing ? 'コース編集' : '新規コース作成'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert message={error} type="error" />}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">コース名</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">説明</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
            <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700">担当教師</label>
            <select
                id="teacherId"
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                required
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
                <option value="" disabled>教師を選択してください</option>
                {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>
                    {teacher.name}
                </option>
                ))}
            </select>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-700">登録生徒</label>
            <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-2 bg-gray-50">
                {students.length > 0 ? students.map(student => (
                    <div key={student.id} className="flex items-center">
                    <input
                        id={`student-${student.id}`}
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => handleStudentSelection(student.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor={`student-${student.id}`} className="ml-3 text-sm text-gray-700">
                        {student.name} <span className="text-gray-500">({student.email})</span>
                    </label>
                    </div>
                )) : <p className="text-sm text-gray-500 p-2">登録可能な学生がいません。</p>}
            </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CourseEditModal;