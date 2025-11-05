

import { Notification } from '../types';

const NOTIFICATIONS_KEY = 'app_notifications';

const generateId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const loadNotifications = (): Notification[] => {
  try {
    const data = localStorage.getItem(NOTIFICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load notifications from local storage", error);
    return [];
  }
};

const saveNotifications = (notifications: Notification[]) => {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (error) {
    console.error("Failed to save notifications to local storage", error);
  }
};

export const notificationService = {
  getForUser(userId: string): Notification[] {
    const allNotifications = loadNotifications();
    return allNotifications
      .filter(n => n.userId === userId)
      // FIX: Sort by seconds from the createdAt object, which is now consistently an object.
      // This resolves the error from trying `new Date()` on an object.
      .sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  },

  send(notificationData: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): Notification {
    const allNotifications = loadNotifications();
    const newNotification: Notification = {
      ...notificationData,
      id: generateId('notif'),
      isRead: false,
      // FIX: Changed createdAt to be a Firestore-like timestamp object to match the Notification type.
      // This resolves the type error on this line.
      createdAt: {
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: 0,
      },
    };
    allNotifications.push(newNotification);
    saveNotifications(allNotifications);
    return newNotification;
  },

  markAllAsRead(userId: string): Notification[] {
    let allNotifications = loadNotifications();
    allNotifications = allNotifications.map(n => 
      n.userId === userId ? { ...n, isRead: true } : n
    );
    saveNotifications(allNotifications);
    return allNotifications.filter(n => n.userId === userId);
  }
};