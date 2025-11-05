import React, { useState } from 'react';
import { User } from '../types';
import CreateUserModal from './CreateUserModal';

const AdminPortal: React.FC = () => {
  const [isCreateUserModalOpen, setCreateUserModalOpen] = useState(false);

  // Mock data for users
  const [users, setUsers] = useState<User[]>([
    { id: 'student1', name: 'Alice Johnson', email: 'student@test.com', role: 'student' },
    { id: 'teacher1', name: 'Dr. Smith', email: 'teacher@test.com', role: 'teacher' },
    { id: 'admin1', name: 'Admin User', email: 'admin@test.com', role: 'admin' },
  ]);

  const handleCreateUser = (newUser: Partial<User>) => {
    console.log('Creating user:', newUser);
    // In a real app, you would call an API to create the user in your database/Firebase
    // Here, we just add to the local state for demonstration
    const createdUser: User = {
      id: `new-${Date.now()}`,
      name: newUser.name || '',
      email: newUser.email || '',
      role: newUser.role || 'student',
    };
    setUsers([...users, createdUser]);
    setCreateUserModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 sm:mb-0">Admin Dashboard</h1>
        <button
          onClick={() => setCreateUserModalOpen(true)}
          className="px-4 py-2 text-white bg-green-600 rounded-md hover:bg-green-700 self-start sm:self-auto"
        >
          Create New User
        </button>
      </div>

      <div className="p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">User Management</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">{u.role}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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