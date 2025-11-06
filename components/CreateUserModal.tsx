import React, { useState } from 'react';
import { User, UserRole } from '../types';
import Modal from './Modal';
import Alert from './Alert';

interface CreateUserModalProps {
  onClose: () => void;
  onCreate: (newUser: Omit<User, 'id'>) => Promise<void>;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
        await onCreate({ name, email, role });
    } catch (err: any) {
        setError(err.message || 'ユーザー作成に失敗しました。');
    } finally {
        setLoading(false);
    }
  };

  return (
    <Modal title="新規ユーザー作成" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert message={error} type="error" />}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">氏名</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">メールアドレス</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">役割</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="student">学生</option>
            <option value="teacher">教師</option>
            <option value="admin">管理者</option>
          </select>
        </div>
        <p className="text-xs text-gray-500">注: ここで作成されたユーザーは、サインアップページから自身でパスワードを設定する必要があります。</p>
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
            {loading ? '作成中...' : 'ユーザー作成'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateUserModal;
