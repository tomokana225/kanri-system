import React, { useState, useEffect } from 'react';
import { User } from '../types';
import CreateUserModal from './CreateUserModal';
import { getUsers, addUser, seedDatabase } from '../services/firebase';
import Spinner from './Spinner';
import Alert from './Alert';

const AdminPortal: React.FC = () => {
  const [isCreateUserModalOpen, setCreateUserModalOpen] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const usersData = await getUsers();
        setUsers(usersData);
      } catch (e) {
        setError('ユーザー情報の取得に失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleCreateUser = async (newUser: Omit<User, 'id'>) => {
    try {
      await addUser(newUser);
      setUsers([...users, { ...newUser, id: newUser.email }]); // Optimistic update
      setCreateUserModalOpen(false);
    } catch (e: any) {
      alert(`ユーザー作成失敗: ${e.message}`);
    }
  };

  const handleSeedData = async () => {
    if (!confirm('デモ用のユーザーとコースデータをデータベースに投入します。よろしいですか？')) {
      return;
    }
    setSeeding(true);
    setError('');
    try {
      await seedDatabase();
      alert('デモデータの投入が完了しました。ページをリフレッシュして確認してください。');
      // Refetch users
      const usersData = await getUsers();
      setUsers(usersData);
    } catch (e: any) {
      console.error("Seeding error:", e);
      setError(`データの投入に失敗しました: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-gray-800">管理者ダッシュボード</h1>
        <div className="flex gap-2">
           <button
            onClick={handleSeedData}
            disabled={seeding}
            className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 self-start sm:self-auto"
          >
            {seeding ? '処理中...' : 'デモデータ投入'}
          </button>
          <button
            onClick={() => setCreateUserModalOpen(true)}
            className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 self-start sm:self-auto"
          >
            新規ユーザー作成
          </button>
        </div>
      </div>
      
      {error && <Alert message={error} type="error" />}

      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">ユーザー管理</h2>
        {loading ? (
          <div className="flex justify-center items-center h-40"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名前</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">メールアドレス</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">役割</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">編集</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{u.role === 'student' ? '学生' : u.role === 'teacher' ? '教師' : '管理者'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button className="text-blue-600 hover:text-blue-900">編集</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {isCreateUserModalOpen && (
        <CreateUserModal
          onClose={() => setCreateUserModalOpen(false)}
          onCreate={handleCreateUser}
        />
      )}
    </div>
  );
};

export default AdminPortal;
