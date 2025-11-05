import React, { useState, useEffect } from 'react';
import { Notification } from '../types';
import { CloseIcon } from './icons';
import Spinner from './Spinner';

// Mock notification service
const getNotifications = async (): Promise<Notification[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return [
        { id: '1', userId: '1', message: 'Your assignment "Final Project Proposal" is due tomorrow.', read: false, createdAt: new Date(Date.now() - 3600000) },
        { id: '2', userId: '1', message: 'New course material available for "Advanced React".', read: true, createdAt: new Date(Date.now() - 86400000) },
        { id: '3', userId: '1', message: 'Your teacher left feedback on your essay.', read: false, createdAt: new Date(Date.now() - 172800000) },
    ];
}

interface NotificationPanelProps {
    onClose: () => void;
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ onClose }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNotifications = async () => {
            setLoading(true);
            const data = await getNotifications();
            setNotifications(data);
            setLoading(false);
        };
        fetchNotifications();
    }, []);

    return (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg z-10 border border-gray-200">
            <div className="flex justify-between items-center p-3 border-b">
                <h3 className="font-semibold text-gray-700">Notifications</h3>
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
                            <p className="text-xs text-gray-400 mt-1">{notif.createdAt.toLocaleDateString()}</p>
                        </div>
                    ))
                ) : (
                    <p className="p-4 text-gray-500">No new notifications.</p>
                )}
            </div>
        </div>
    );
};

export default NotificationPanel;
