import React from 'react';
import { Notification } from '../types';
import { BellIcon, EnvelopeOpenIcon } from './icons';

interface NotificationPanelProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAllAsRead: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onClose, onMarkAllAsRead }) => {
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const timeSince = (timestamp: { seconds: number, nanoseconds: number }) => {
    if (!timestamp) return "";
    const date = new Date(timestamp.seconds * 1000);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "年前";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "ヶ月前";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "日前";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "時間前";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "分前";
    return "たった今";
  };

  return (
    <div className="fixed inset-0 z-30" onClick={onClose}>
      <div 
        className="absolute right-0 mt-16 mr-4 sm:mr-6 lg:mr-8 w-full max-w-sm bg-white rounded-lg shadow-2xl border border-gray-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-800">通知</h3>
          {unreadCount > 0 && (
            <button 
              onClick={onMarkAllAsRead}
              className="text-sm text-brand-primary hover:underline flex items-center gap-1"
            >
              <EnvelopeOpenIcon className="w-4 h-4" />
              すべて既読にする
            </button>
          )}
        </div>
        <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {notifications.length > 0 ? (
            notifications.map(notification => (
              <li key={notification.id} className={`p-4 hover:bg-gray-50 ${!notification.isRead ? 'bg-brand-light/50' : ''}`}>
                <div className="flex items-start gap-3">
                  {!notification.isRead && <div className="w-2 h-2 mt-1.5 bg-brand-primary rounded-full flex-shrink-0"></div>}
                  <div className={`flex-1 ${!notification.isRead ? '' : 'pl-5'}`}>
                    <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                    <div className="text-sm text-gray-600 prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: notification.message }} />
                    <p className="mt-1 text-xs text-gray-400">{timeSince(notification.createdAt)}</p>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="p-8 text-center text-gray-500">
              <BellIcon className="w-12 h-12 mx-auto text-gray-300" />
              <p className="mt-2">新しい通知はありません。</p>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export default NotificationPanel;
