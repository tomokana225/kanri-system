import React, { useState } from 'react';
import { api } from '../services/api';
import { UserRole } from '../types';
import Modal from './Modal';
import Alert from './Alert';

interface CreateUserModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const CreateUserModal: React.FC<CreateUserModalProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.STUDENT);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name || !email || !password) {
      setError('すべてのフィールドを入力してください。');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await api.createUser({ name, email, password, role });
      onSuccess();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました。';
      if (errorMessage.includes('auth/email-already-in-use')) {
        setError('このメールアドレスは既に使用されています。');
      } else if (errorMessage.includes('auth/weak-password')) {
        setError('パスワードは6文字以上で設定してください。');
      } else {
        setError('ユーザーの作成に失敗しました。');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title="新規ユーザー作成"
      onClose={onClose}
      onConfirm={handleSubmit}
      confirmText={isSubmitting ? '作成中...' : '作成'}
      isConfirmDisabled={isSubmitting}
    >
      {error && <Alert type="error" message={error} onClose={() => setError(null)} />}
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">氏名</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">メールアドレス</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">初期パスワード</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
            required
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">役割</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm rounded-md"
          >
            <option value={UserRole.STUDENT}>生徒</option>
            <option value={UserRole.TEACHER}>先生</option>
            <option value={UserRole.ADMIN}>管理者</option>
          </select>
        </div>
      </div>
    </Modal>
  );
};

export default CreateUserModal;
