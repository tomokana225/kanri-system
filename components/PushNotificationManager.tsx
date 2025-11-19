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
        console.log('Foreground push received:', payload);
        // We do NOT show a toast here because Header.tsx handles the 'notifications' collection listener
        // which triggers at the same time (since sendAppAndPushNotification updates both).
        // This prevents duplicate toasts.
      });

      return () => {
        unsubscribe();
      };
    }
  }, [user, onShowToast]);

  return null;
};

export default PushNotificationManager;