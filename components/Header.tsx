import React, { useState, useEffect } from 'react';
import { User, Notification } from '../types';
import { BellIcon, LogoutIcon, MenuIcon } from './icons';
import NotificationPanel from './NotificationPanel';
import { subscribeToUserNotifications, markAllNotificationsAsRead } from '../services/firebase';
// Fix: Import firebase to use firebase.firestore.Timestamp for mock data.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onToggleSidebar: () => void;
  onNavigate: (link: Notification['link']) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, onToggleSidebar, onNavigate }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const isDevMode = user.id.startsWith('dev-');
    if (isDevMode) {
        // Mock notifications for dev mode
        const mockNotifs = [
            { id: 'n1', userId: user.id, message: 'モック通知: クラスのリマインダー', read: false, createdAt: new Date(), link: { type: 'booking' } },
            { id: 'n2', userId: user.id, message: 'モック通知: 新しいメッセージ', read: true, createdAt: new Date(Date.now() - 3600 * 1000), link: { type: 'chat', payload: { partnerId: 'dev-teacher-1', partnerName: '田中先生' } } },
        ].map(n => ({...n, createdAt: firebase.firestore.Timestamp.fromDate(n.createdAt)}));
        setNotifications(mockNotifs as Notification[]);
        return;
    }

    const unsubscribe = subscribeToUserNotifications(user.id, (newNotifications) => {
      setNotifications(newNotifications);
    });
    return () => unsubscribe();
  }, [user.id]);

  const handleToggleNotifications = () => {
    setShowNotifications(prev => !prev);
    if (!showNotifications && unreadCount > 0) {
      markAllNotificationsAsRead(user.id);
    }
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
      <div className="flex items-center">
        <button onClick={onToggleSidebar} className="p-2 text-gray-500 rounded-md hover:bg-gray-100">
            <MenuIcon />
        </button>
        <div className="text-2xl font-bold text-gray-800 ml-2">
          Classroom Connect
        </div>
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
          {showNotifications && <NotificationPanel notifications={notifications} onClose={() => setShowNotifications(false)} onNavigate={onNavigate} />}
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