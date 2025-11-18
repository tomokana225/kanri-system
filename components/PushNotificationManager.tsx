import React, { useEffect } from 'react';
import { User } from '../types';
import { initializeMessagingListener } from '../services/firebase';

interface PushNotificationManagerProps {
  user: User | null;
}

const PushNotificationManager: React.FC<PushNotificationManagerProps> = ({ user }) => {
  useEffect(() => {
    if (user) {
      // In a real app, you might use a more sophisticated UI element like a toast or snackbar.
      const unsubscribe = initializeMessagingListener((payload) => {
        const notificationTitle = payload.notification?.title || '新しい通知';
        const notificationBody = payload.notification?.body || '新しいメッセージがあります。';
        alert(`${notificationTitle}\n\n${notificationBody}`);
      });

      return () => {
        unsubscribe();
      };
    }
  }, [user]);

  return null;
};

export default PushNotificationManager;
