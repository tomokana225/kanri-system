import React, { useState, useEffect } from 'react';
import { User, Notification } from '../types';
import { BellIcon, LogoutIcon } from './icons';
import NotificationPanel from './NotificationPanel';
import { subscribeToUserNotifications, markAllNotificationsAsRead } from '../services/firebase';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const unsubscribe = subscribeToUserNotifications(user.id, (newNotifications) => {
      // Show toast for new, unread notifications
      if (newNotifications.length > notifications.length) {
        const latestNotif = newNotifications[0];
        if (!latestNotif.read) {
          // You can implement a toast notification system here if desired
          // For now, the badge will update.
        }
      }
      setNotifications(newNotifications);
    });
    return () => unsubscribe();
  }, [user.id, notifications.length]);

  const handleToggleNotifications = () => {
    setShowNotifications(prev => !prev);
    if (!showNotifications && unreadCount > 0) {
      markAllNotificationsAsRead(user.id);
    }
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200">
      <div className="text-2xl font-bold text-gray-800">
        Classroom Connect
      </div>
      <div className="flex items-center space-x-4">
        <span className="text-gray-600 hidden sm:block">ようこそ、{user.name}さん</span>
        <div className="relative">
          <button onClick={handleToggleNotifications} className="relative p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <BellIcon />
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span>
            )}
          </button>
          {showNotifications && <NotificationPanel notifications={notifications} onClose={() => setShowNotifications(false)} />}
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
