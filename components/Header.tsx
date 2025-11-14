import React, { useState } from 'react';
import { User } from '../types';
import { BellIcon, LogoutIcon } from './icons';
import NotificationPanel from './NotificationPanel';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      <div className="text-2xl font-bold text-gray-800">
        Classroom Connect
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-gray-600 hidden sm:block">ようこそ、{user.name}さん</span>
        <div className="relative">
          <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <BellIcon />
          </button>
          {showNotifications && <NotificationPanel user={user} onClose={() => setShowNotifications(false)} />}
        </div>
        <button
          onClick={onLogout}
          className="flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200"
        >
          <LogoutIcon />
          <span className="ml-2 hidden sm:block">ログアウト</span>
        </button>
      </div>
    </header>
  );
};

export default Header;