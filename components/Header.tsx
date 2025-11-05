
import React, { useState, useEffect } from 'react';
import { User, Notification } from '../types';
import { api } from '../services/api';
import NotificationPanel from './NotificationPanel';
import { LogoutIcon, BellIcon, UserCircleIcon } from './icons';

interface HeaderProps {
  user: User;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    // Set up a real-time listener for notifications
    const unsubscribe = api.getNotifications(user.uid, (userNotifications) => {
      setNotifications(userNotifications);
    });

    // Cleanup listener on component unmount
    return () => unsubscribe();
  }, [user.uid]);
  
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllAsRead = async () => {
      try {
          await api.markAllNotificationsAsRead(user.uid);
          // The real-time listener will automatically update the UI
      } catch (error) {
          console.error("Failed to mark notifications as read", error);
      }
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold text-brand-primary">授業予約システム</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                <UserCircleIcon className="w-6 h-6 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">{user.name} ({user.role})</span>
            </div>
            <div className="relative">
                <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary"
                >
                    <span className="sr-only">通知を表示</span>
                    <BellIcon className="w-6 h-6" />
                    {unreadCount > 0 && (
                        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </button>
                {showNotifications && (
                    <NotificationPanel 
                        notifications={notifications} 
                        onClose={() => setShowNotifications(false)}
                        onMarkAllAsRead={handleMarkAllAsRead}
                    />
                )}
            </div>
            
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-100 hover:text-gray-800"
            >
              <LogoutIcon className="w-5 h-5" />
              <span>ログアウト</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
