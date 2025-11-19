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
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl z-50 border border-gray-100 ring-1 ring-black ring-opacity-5 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
                <h3 className="font-bold text-gray-800">お知らせ</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                    <CloseIcon className="h-5 w-5" />
                </button>
            </div>
            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {loading ? (
                    <div className="flex justify-center items-center p-4 h-24">
                        <Spinner />
                    </div>
                ) : notifications.length > 0 ? (
                    notifications.map(notif => (
                        <button
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`w-full text-left p-4 transition-colors ${notif.read ? 'bg-white hover:bg-gray-50' : 'bg-blue-50 hover:bg-blue-100'} ${notif.link ? 'cursor-pointer' : 'cursor-default'}`}
                        >
                            <div className="flex justify-between items-start">
                                <p className={`text-sm leading-snug ${notif.read ? 'text-gray-600' : 'text-gray-900 font-semibold'}`}>{notif.message}</p>
                                {!notif.read && <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5 ml-2"></span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-2">{notif.createdAt.toDate().toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </button>
                    ))
                ) : (
                    <div className="p-8 text-center">
                        <p className="text-sm text-gray-500">新しい通知はありません。</p>
                    </div>
                )}
            </div>
            <div className="p-2 bg-gray-50 border-t text-center">
                 <button onClick={onClose} className="text-xs text-blue-600 hover:underline">閉じる</button>
            </div>
        </div>
    );
};

export default NotificationPanel;