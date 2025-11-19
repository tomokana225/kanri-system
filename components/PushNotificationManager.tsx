import React, { useEffect } from 'react';
import { User } from '../types';
import { initializeMessagingListener } from '../services/firebase';

interface PushNotificationManagerProps {
  user: User | null;
  onShowToast: (message: string) => void;
}

const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({ user, onShowToast }) => {
  useEffect(() => {
    if (user) {
      const unsubscribe = initializeMessagingListener((payload) => {
        const notificationTitle = payload.notification?.title || '新しい通知';
        const notificationBody = payload.notification?.body || '';
        
        // Display a toast instead of an alert for better UX
        onShowToast(`${notificationTitle}${notificationBody ? `: ${notificationBody}` : ''}`);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [user, onShowToast]);

  return null;
};

export default PushNotificationManager;