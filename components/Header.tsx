import React, { useState, useEffect } from 'react';
import type { User, Notification } from '../types';
import { BellIcon, LogoutIcon, MenuIcon, BellPlusIcon, BellCheckIcon, BellSlashIcon, ShareIcon, PlusSquareIcon, CloseIcon } from './icons';
import NotificationPanel from './NotificationPanel';
import { subscribeToUserNotifications, markAllNotificationsAsRead, requestNotificationPermissionAndSaveToken } from '../services/firebase';
// Fix: Import firebase to use firebase.firestore.Timestamp for mock data.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

interface HeaderProps {
  user: User;
  onLogout: () => void;
  onToggleSidebar: () => void;
  onNavigate: (link: Notification['link']) => void;
}

const IosInstallPrompt: React.FC<{onClose: () => void}> = ({ onClose }) => (
    <div className="bg-gray-800 text-white p-3 text-center text-sm relative">
        <span>
            プッシュ通知を有効にするには、このアプリをホーム画面に追加してください: 
            <ShareIcon className="inline-block w-4 h-4 mx-1" />
            をタップし、「ホーム画面に追加」
            <PlusSquareIcon className="inline-block w-4 h-4 mx-1" />
            を選択します。
        </span>
        <button onClick={onClose} className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-gray-300 hover:text-white">
            <CloseIcon className="w-5 h-5" />
        </button>
    </div>
);


const Header: React.FC<HeaderProps> = ({ user, onLogout, onToggleSidebar, onNavigate }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(
    window.Notification ? Notification.permission : 'default'
  );
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    // Check if we should show the iOS PWA installation prompt
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;
    const hasSeenPrompt = localStorage.getItem('hasSeenIosInstallPrompt');

    if (isIOS && !isInStandaloneMode && !hasSeenPrompt) {
        setShowIosPrompt(true);
    }
  }, []);

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

  const handleEnableNotifications = async () => {
    // Only proceed if permission is in the default state
    if (Notification.permission !== 'default') return;

    const success = await requestNotificationPermissionAndSaveToken(user.id);
    if (success) {
        alert('通知が有効になりました。');
    } else {
        alert('通知を有効にできませんでした。ブラウザの設定で通知がブロックされていないか確認してください。');
    }
    setPermissionStatus(Notification.permission);
  };

  const getPermissionButtonTitle = () => {
    switch (permissionStatus) {
      case 'granted':
        return "プッシュ通知は有効です";
      case 'denied':
        return "通知がブロックされています。ブラウザの設定を変更してください。";
      default:
        return "プッシュ通知を有効にする";
    }
  };

  const handleCloseIosPrompt = () => {
      localStorage.setItem('hasSeenIosInstallPrompt', 'true');
      setShowIosPrompt(false);
  };

  return (
    <>
      <header className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="flex items-center">
          <button onClick={onToggleSidebar} className="p-2 text-gray-500 rounded-md hover:bg-gray-100">
              <MenuIcon />
          </button>
          <div className="text-2xl font-bold text-gray-800 ml-2">
            Classroom Connect
          </div>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <span className="text-gray-600 hidden sm:block">ようこそ、{user.name}さん</span>
          
          <button 
            onClick={handleEnableNotifications}
            disabled={permissionStatus !== 'default'}
            title={getPermissionButtonTitle()}
            className="relative p-2 text-gray-500 rounded-full hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {permissionStatus === 'granted' && <BellCheckIcon className="text-green-600" />}
            {permissionStatus === 'denied' && <BellSlashIcon className="text-red-600" />}
            {permissionStatus === 'default' && <BellPlusIcon />}
          </button>
          
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
      {showIosPrompt && <IosInstallPrompt onClose={handleCloseIosPrompt} />}
    </>
  );
};

export default Header;