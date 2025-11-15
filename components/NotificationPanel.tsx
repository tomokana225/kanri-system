import React from 'react';
import { Notification } from '../types';
import { CloseIcon } from './icons';
import Spinner from './Spinner';

interface NotificationPanelProps {
    notifications: Notification[];
    onClose: () => void;
    onNavigate: (link: Notification['link']) => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ notifications, onClose, onNavigate }) => {
    const loading = !Array.isArray(notifications);

    const handleNotificationClick = (notification: Notification) => {
        if (notification.link) {
            onNavigate(notification.link);
            onClose(); // Close panel after navigation
        }
    };

    return (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-10 border border-gray-200">
            <div className="flex justify-between items-center p-3 border-b">
                <h3 className="font-semibold text-gray-700">通知</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                    <CloseIcon className="h-5 w-5" />
                </button>
            </div>
            <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center items-center p-4 h-24">
                        <Spinner />
                    </div>
                ) : notifications.length > 0 ? (
                    notifications.map(notif => (
                        <button
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`w-full text-left p-3 ${notif.read ? 'bg-white' : 'bg-blue-50'} ${notif.link ? 'hover:bg-gray-100 cursor-pointer' : 'cursor-default'}`}
                        >
                            <p className={`text-sm ${notif.read ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{notif.createdAt.toDate().toLocaleDateString('ja-JP')}</p>
                        </button>
                    ))
                ) : (
                    <p className="p-4 text-sm text-gray-500 text-center">新しい通知はありません。</p>
                )}
            </div>
        </div>
    );
};

export default NotificationPanel;