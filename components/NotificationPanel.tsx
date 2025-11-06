import React, { useState, useEffect } from 'react';
import { Notification, User } from '../types';
import { CloseIcon } from './icons';
import Spinner from './Spinner';
import { getUserNotifications } from '../services/firebase';

interface NotificationPanelProps {
    user: User;
    onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ user, onClose }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const data = await getUserNotifications(user.id);
                setNotifications(data);
            } catch (e) {
                console.error("通知の取得に失敗:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchNotifications();
    }, [user.id]);

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
                        <div key={notif.id} className={`p-3 ${notif.read ? 'bg-white' : 'bg-blue-50'} hover:bg-gray-100`}>
                            <p className={`text-sm ${notif.read ? 'text-gray-600' : 'text-gray-800 font-medium'}`}>{notif.message}</p>
                            <p className="text-xs text-gray-400 mt-1">{notif.createdAt.toDate().toLocaleDateString('ja-JP')}</p>
                        </div>
                    ))
                ) : (
                    <p className="p-4 text-sm text-gray-500 text-center">新しい通知はありません。</p>
                )}
            </div>
        </div>
    );
};

export default NotificationPanel;
