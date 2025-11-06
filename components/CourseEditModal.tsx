import React, { useState, useEffect } from 'react';
import { Course } from '../types';
import Modal from './Modal';
import Alert from './Alert';

interface CourseEditModalProps {
  course: Course | null; // null for creating a new course
  onClose: () => void;
  onSave: (courseData: Partial<Omit<Course, 'id'>>, courseId?: string) => Promise<void>;
}

const CourseEditModal: React.FC<CourseEditModalProps> = ({ course, onClose, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [studentIds, setStudentIds] = useState(''); // Comma-separated string
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditing = course && course.id;

  useEffect(() => {
    if (isEditing) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      setTeacherId(course.teacherId || '');
      setStudentIds((course.studentIds || []).join(', '));
    }
  }, [course, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const courseData = {
        title,
        description,
        teacherId,
        studentIds: studentIds.split(',').map(s => s.trim()).filter(Boolean),
    };

    try {
        await onSave(courseData, isEditing ? course.id : undefined);
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
          <label htmlFor="teacherId" className="block text-sm font-medium text-gray-700">担当教師 ID</label>
          <input
            type="text"
            id="teacherId"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="studentIds" className="block text-sm font-medium text-gray-700">生徒 ID (カンマ区切り)</label>
          <input
            type="text"
            id="studentIds"
            value={studentIds}
            onChange={(e) => setStudentIds(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
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
