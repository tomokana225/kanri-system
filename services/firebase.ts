// services/firebase.ts
// Fix: Use Firebase compat imports to resolve module resolution errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/messaging';

import { AppConfig, getConfig } from './config';
import type { User, Course, Booking, Availability, Notification, Message } from '../types';

let firebaseApp: firebase.app.App;
let auth: firebase.auth.Auth;
let db: firebase.firestore.Firestore;
let storage: firebase.storage.Storage;
let messaging: firebase.messaging.Messaging;


let firebaseInitializationPromise: Promise<{ app: firebase.app.App, auth: firebase.auth.Auth, db: firebase.firestore.Firestore, storage: firebase.storage.Storage }> | null = null;

// Helper to convert Firestore docs to objects
const docToObject = <T>(d: firebase.firestore.DocumentSnapshot): T => ({ id: d.id, ...d.data() } as unknown as T);

export const initializeFirebase = async (): Promise<{ app: firebase.app.App, auth: firebase.auth.Auth, db: firebase.firestore.Firestore, storage: firebase.storage.Storage }> => {
  if (firebaseInitializationPromise) {
    return firebaseInitializationPromise;
  }

  firebaseInitializationPromise = (async () => {
    try {
      const config: AppConfig = await getConfig();
      
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(config.firebase);
      } else {
        firebaseApp = firebase.app();
      }
      
      // Use global firebase services, which is more robust with compat libraries
      auth = firebase.auth();
      db = firebase.firestore();
      storage = firebase.storage();
      if (firebase.messaging.isSupported()) {
        messaging = firebase.messaging();
      }

      return { app: firebaseApp, auth, db, storage };
    } catch (error) {
      console.error("Firebase initialization failed:", error);
      // Let the caller handle the error display
      throw error;
    }
  })();
  
  return firebaseInitializationPromise;
};


// User Functions
export const getUserProfile = async (uid: string): Promise<User | null> => {
  await initializeFirebase();
  const userRef = db.collection('users').doc(uid);
  const userSnap = await userRef.get();
  if (userSnap.exists) {
    return { id: userSnap.id, ...userSnap.data() } as User;
  }
  return null;
};

export const createUserProfile = async (uid: string, userData: Omit<User, 'id'>): Promise<void> => {
  await initializeFirebase();
  const userRef = db.collection('users').doc(uid);
  await userRef.set(userData);
};

export const getAllUsers = async (): Promise<User[]> => {
  await initializeFirebase();
  const usersCol = db.collection('users');
  const userSnapshot = await usersCol.get();
  return userSnapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => docToObject<User>(doc));
};

export const updateUser = async (uid: string, userData: Partial<Omit<User, 'id'>>): Promise<void> => {
    await initializeFirebase();
    const userRef = db.collection('users').doc(uid);
    await userRef.update(userData);
};

export const deleteUser = async (uid: string): Promise<void> => {
    await initializeFirebase();
    const userRef = db.collection('users').doc(uid);
    await userRef.delete();
};


// Course Functions
export const getAllCourses = async (): Promise<Course[]> => {
    await initializeFirebase();
    const coursesCol = db.collection('courses');
    const courseSnapshot = await coursesCol.get();
    return courseSnapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => docToObject<Course>(doc));
};

export const getCoursesForStudent = async (studentId: string): Promise<Course[]> => {
    await initializeFirebase();
    const q = db.collection('courses').where('studentIds', 'array-contains', studentId);
    const querySnapshot = await q.get();
    return querySnapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => docToObject<Course>(doc));
};

export const getCoursesForTeacher = async (teacherId: string): Promise<Course[]> => {
    await initializeFirebase();
    const q = db.collection('courses').where('teacherId', '==', teacherId);
    const querySnapshot = await q.get();
    return querySnapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => docToObject<Course>(doc));
};

export const createCourse = async (courseData: Omit<Course, 'id'>): Promise<void> => {
    await initializeFirebase();
    await db.collection('courses').add(courseData);
};

export const updateCourse = async (courseId: string, courseData: Partial<Omit<Course, 'id'>>): Promise<void> => {
    await initializeFirebase();
    const courseRef = db.collection('courses').doc(courseId);
    await courseRef.update(courseData);
};

export const deleteCourse = async (courseId: string): Promise<void> => {
    await initializeFirebase();
    const courseRef = db.collection('courses').doc(courseId);
    await courseRef.delete();
};

// Availability Functions
export const addAvailabilities = async (availabilities: Omit<Availability, 'id'>[]): Promise<void> => {
  await initializeFirebase();
  const batch = db.batch();
  const availabilitiesCol = db.collection('availabilities');
  availabilities.forEach(avail => {
    const newAvailRef = availabilitiesCol.doc();
    batch.set(newAvailRef, { ...avail, status: 'available' }); // Ensure status is set
  });
  await batch.commit();
};

export const addRecurringAvailabilities = async (
  teacherId: string,
  daysOfWeek: number[], // 0=Sun, 1=Mon, ..., 6=Sat
  times: string[], // "HH:mm" array
  startDate: Date,
  endDate: Date
): Promise<void> => {
  await initializeFirebase();
  const batch = db.batch();
  const availabilitiesCol = db.collection('availabilities');

  let currentDate = new Date(startDate);
  // Normalize start date to the beginning of the day to avoid time zone issues
  currentDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999); // Ensure end date is inclusive

  while (currentDate <= endDate) {
    if (daysOfWeek.includes(currentDate.getDay())) {
      for (const time of times) {
        const [hours, minutes] = time.split(':').map(Number);
        const startTime = new Date(currentDate);
        startTime.setHours(hours, minutes);

        const endTime = new Date(startTime);
        endTime.setHours(hours + 1, minutes);

        const newAvailRef = availabilitiesCol.doc();
        const availability: Omit<Availability, 'id'> = {
          teacherId: teacherId,
          startTime: firebase.firestore.Timestamp.fromDate(startTime),
          endTime: firebase.firestore.Timestamp.fromDate(endTime),
          status: 'available',
        };
        batch.set(newAvailRef, availability);
      }
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  await batch.commit();
};

export const getAvailabilitiesForTeacher = async (teacherId: string, fetchAll: boolean = false): Promise<Availability[]> => {
    await initializeFirebase();
    let q: firebase.firestore.Query = db.collection('availabilities').where('teacherId', '==', teacherId);
    if (!fetchAll) {
        q = q.where('startTime', '>=', firebase.firestore.Timestamp.now());
    }
    // Add orderBy to satisfy the composite index for the range filter and to provide sorted data.
    q = q.orderBy('startTime', 'asc');
    const querySnapshot = await q.get();
    return querySnapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => docToObject<Availability>(doc));
};

export const getAllAvailabilities = async (): Promise<Availability[]> => {
    await initializeFirebase();
    const snapshot = await db.collection('availabilities').get();
    return snapshot.docs.map(doc => docToObject<Availability>(doc));
};

export const deleteAvailability = async (availabilityId: string): Promise<void> => {
    await initializeFirebase();
    await db.collection('availabilities').doc(availabilityId).delete();
};


// Booking Functions
export const getBookingsForUser = async (userId: string, role: 'student' | 'teacher'): Promise<Booking[]> => {
    await initializeFirebase();
    const field = role === 'student' ? 'studentId' : 'teacherId';
    const q = db.collection('bookings').where(field, '==', userId).orderBy('startTime', 'desc');
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(doc => docToObject<Booking>(doc));
};

export const getAllBookings = async (): Promise<Booking[]> => {
    await initializeFirebase();
    const snapshot = await db.collection('bookings').orderBy('startTime', 'desc').get();
    return snapshot.docs.map(doc => docToObject<Booking>(doc));
};

// Low-level update
export const updateBookingStatus = async (bookingId: string, status: Booking['status']): Promise<void> => {
    await initializeFirebase();
    await db.collection('bookings').doc(bookingId).update({ status });
};

// High-level cancellation with notification
export const cancelBooking = async (bookingId: string, cancelledByUserId: string, cancelledByUserName: string, reason?: string): Promise<void> => {
    await initializeFirebase();
    
    // 1. Get booking details to identify the partner
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) {
        throw new Error("予約が見つかりません。");
    }
    
    const booking = docToObject<Booking>(bookingDoc);
    
    // 2. Update status and reason
    const updateData: any = { status: 'cancelled' };
    if (reason) {
        updateData.cancellationReason = reason;
    }
    await bookingRef.update(updateData);

    // 3. Reset Availability Status
    // Find the availability slot corresponding to this booking
    try {
        const availSnapshot = await db.collection('availabilities')
            .where('teacherId', '==', booking.teacherId)
            .where('startTime', '==', booking.startTime)
            .get();

        if (!availSnapshot.empty) {
            // Assuming one slot per time for a teacher
            const availDoc = availSnapshot.docs[0];
            await availDoc.ref.update({
                status: 'available',
                studentId: firebase.firestore.FieldValue.delete()
            });
        }
    } catch (e) {
        console.error("Failed to reset availability status:", e);
        // Continue even if resetting availability fails, as the booking is already cancelled
    }
    
    // 4. Send notification to the partner
    let targetUserId = '';
    
    if (booking.studentId === cancelledByUserId) {
        targetUserId = booking.teacherId;
    } else if (booking.teacherId === cancelledByUserId) {
        targetUserId = booking.studentId;
    }
    
    if (targetUserId) {
        const startTimeStr = booking.startTime.toDate().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        let messageBody = `${cancelledByUserName}さんが予約をキャンセルしました: ${booking.courseTitle} (${startTimeStr})`;
        if (reason) {
            messageBody += `\n理由: ${reason}`;
        }

        await sendAppAndPushNotification(
            targetUserId,
            "予約キャンセル",
            messageBody,
            { type: 'booking' }
        );
    }
};

export const createBooking = async (newBooking: Omit<Booking, 'id'>, availabilityId: string): Promise<void> => {
    await initializeFirebase();
    const bookingRef = db.collection('bookings').doc();
    const availabilityRef = db.collection('availabilities').doc(availabilityId);

    await db.runTransaction(async (transaction) => {
        const availabilityDoc = await transaction.get(availabilityRef);
        if (!availabilityDoc.exists || availabilityDoc.data()?.status === 'booked') {
            throw new Error("この時間枠はたった今予約されました。");
        }
        transaction.set(bookingRef, newBooking);
        transaction.update(availabilityRef, { status: 'booked', studentId: newBooking.studentId });
    });

    const startTimeStr = newBooking.startTime.toDate().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Notify the teacher
    await sendAppAndPushNotification(
        newBooking.teacherId,
        "新しい予約",
        `${newBooking.studentName}さんから予約が入りました: ${newBooking.courseTitle} (${startTimeStr})`,
        { type: 'booking' }
    );

    // Notify the student
    await sendAppAndPushNotification(
        newBooking.studentId,
        "予約完了",
        `予約が完了しました: ${newBooking.courseTitle} (${startTimeStr})`,
        { type: 'booking' }
    );
};

export const createManualBooking = async (newBooking: Omit<Booking, 'id'>): Promise<void> => {
    await initializeFirebase();
    await db.collection('bookings').add(newBooking);
};


// Feedback Functions
// Low-level submit
export const submitFeedback = async (bookingId: string, feedback: { rating: number, comment: string }): Promise<void> => {
    await initializeFirebase();
    await db.collection('bookings').doc(bookingId).update({ feedback });
};

// High-level submit with notification
export const submitFeedbackWithNotification = async (bookingId: string, feedback: { rating: number, comment: string }, submittedByUserId: string, submittedByUserName: string): Promise<void> => {
    await initializeFirebase();
    
    const bookingRef = db.collection('bookings').doc(bookingId);
    const bookingDoc = await bookingRef.get();
    
    if (!bookingDoc.exists) throw new Error("予約が見つかりません。");
    const booking = docToObject<Booking>(bookingDoc);

    await bookingRef.update({ feedback });

    // Determine recipient (the other party)
    let targetUserId = '';
    if (booking.studentId === submittedByUserId) {
        targetUserId = booking.teacherId;
    } else if (booking.teacherId === submittedByUserId) {
        targetUserId = booking.studentId;
    }

    if (targetUserId) {
        await sendAppAndPushNotification(
            targetUserId,
            "フィードバック受信",
            `${submittedByUserName}さんから${booking.courseTitle}のクラスに対するフィードバックが届きました。`,
            { type: 'booking' } // Redirect to booking list to see feedback
        );
    }
};

// Notification & Messaging Functions
const saveFCMToken = async (userId: string, token: string): Promise<void> => {
    await initializeFirebase();
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
        fcmTokens: firebase.firestore.FieldValue.arrayUnion(token)
    });
};

export const requestNotificationPermissionAndSaveToken = async (userId: string): Promise<{ success: boolean; message: string; }> => {
  if (!firebase.messaging.isSupported()) {
    return { success: false, message: 'このブラウザはプッシュ通知をサポートしていません。' };
  }
  await initializeFirebase();
  const config = await getConfig();

  if (!config.vapidKey || config.vapidKey.startsWith('MOCK_')) {
      return { success: false, message: 'サーバー設定が不完全なため、通知を有効化できません。管理者に連絡してください。' };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      const token = await messaging.getToken({ vapidKey: config.vapidKey });
      if (token) {
        await saveFCMToken(userId, token);
        return { success: true, message: 'プッシュ通知が有効になりました！' };
      } else {
        return { success: false, message: '通知トークンの取得に失敗しました。後でもう一度お試しください。' };
      }
    } else {
      return { success: false, message: '通知の許可がされませんでした。' };
    }
  } catch (err: any) {
    console.error('An error occurred while retrieving token. ', err);
    let errorMessage = `通知の有効化中にエラーが発生しました: ${err.message}`;
    if (err.code === 'messaging/permission-blocked' || err.code === 'messaging/permission-default') {
        errorMessage = '通知がブロックされています。ブラウザの設定を確認してください。';
    } else if (err.message.includes('insufficient permissions') || err.message.includes('MISSING_OR_INSUFFICIENT_PERMISSIONS') || err.code === 'messaging/insufficient-permission') {
        errorMessage = '通知の認証に失敗しました。2つの点を確認してください: \n1. Cloudflareの環境変数 `VAPID_KEY` に、Firebaseコンソールの「キーペア」(公開鍵)が正しく設定されていること。\n2. Firebaseプロジェクトで「Cloud Messaging API (V1)」が有効になっていること。';
    }
    return { success: false, message: errorMessage };
  }
};


export const subscribeToUserNotifications = (userId: string, callback: (notifications: Notification[]) => void): () => void => {
    const q = db.collection('notifications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(20);
    
    return q.onSnapshot(snapshot => {
        const notifications = snapshot.docs.map(doc => docToObject<Notification>(doc));
        callback(notifications);
    });
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
    await initializeFirebase();
    const notificationsRef = db.collection('notifications');
    const q = notificationsRef.where('userId', '==', userId).where('read', '==', false);
    const snapshot = await q.get();
    
    if (snapshot.empty) return;

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { read: true });
    });
    await batch.commit();
};

export const initializeMessagingListener = (onMessageReceived: (payload: any) => void): (() => void) => {
    if (messaging) {
        return messaging.onMessage((payload) => {
            console.log('Message received. ', payload);
            onMessageReceived(payload);
        });
    }
    return () => {}; // Return a no-op unsubscribe function if messaging is not supported
};

// Internal helper to call the backend API
const callPushNotificationApi = async (userId: string, title: string, body: string) => {
    try {
        const response = await fetch('/api/send-push-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, title, body }),
        });
        
        if (!response.ok) {
            const errorData = await response.json() as { error?: string };
            console.warn('Push notification API warning:', errorData.error || response.statusText);
            // We return the response to let the caller decide if they want to throw
            return response; 
        }
        return response;
    } catch (error) {
        console.error('Failed to send push notification request:', error);
        throw error;
    }
};

// Helper function to save in-app notification AND send push notification
export const sendAppAndPushNotification = async (userId: string, title: string, message: string, link?: Notification['link']) => {
  await initializeFirebase();
  
  // 1. Create In-App Notification
  const notificationData = {
    userId: userId,
    message: message,
    read: false,
    createdAt: firebase.firestore.Timestamp.now(),
    link: link || null
  };
  
  try {
      await db.collection('notifications').add(notificationData);
  } catch (e) {
      console.error("Failed to create in-app notification:", e);
  }

  // 2. Send Push Notification
  // We don't await this to avoid blocking UI if the API is slow
  callPushNotificationApi(userId, title, message).catch(e => {
      console.error("Failed to send push notification:", e);
  });
};


export const sendTestNotification = async (userId: string, senderName: string, customMessage?: string): Promise<void> => {
    await initializeFirebase();

    const title = 'テスト通知';
    const body = customMessage || `これは${senderName}からのテスト通知です。現在時刻: ${new Date().toLocaleTimeString('ja-JP')}`;

    // Use the common helper
    await sendAppAndPushNotification(userId, title, body, undefined);
};


// Chat Functions
export const getChatId = (uid1: string, uid2: string): string => {
  return [uid1, uid2].sort().join('_');
};

export const getChatMessages = (chatId: string, callback: (messages: Message[]) => void, onError: (error: any) => void): Promise<() => void> => {
    return new Promise((resolve) => {
        const unsubscribe = db.collection('chats').doc(chatId).collection('messages')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snapshot => {
                const messages = snapshot.docs.map(doc => docToObject<Message>(doc));
                callback(messages);
            }, onError);
        resolve(unsubscribe);
    });
};

export const sendChatMessage = async (chatId: string, messageData: Partial<Message>, sender: User, receiver: Partial<User>): Promise<void> => {
    await initializeFirebase();
    const chatRef = db.collection('chats').doc(chatId);
    const messageRef = chatRef.collection('messages').doc();

    const finalMessageData = {
        ...messageData,
        id: messageRef.id,
        senderId: sender.id,
        createdAt: firebase.firestore.Timestamp.now(),
        readBy: [sender.id],
    };

    const batch = db.batch();
    batch.set(messageRef, finalMessageData);
    batch.set(chatRef, { participants: [sender.id, receiver.id] }, { merge: true });
    await batch.commit();

    // Send Notification to the receiver
    if (receiver.id) {
        const title = sender.name;
        
        let body = '';
        if (messageData.type === 'image') {
            body = '📎 画像を送信しました';
        } else if (messageData.type === 'file') {
            body = '📎 ファイルを送信しました';
        } else {
            body = messageData.text || '新しいメッセージ';
        }
        
        const link: Notification['link'] = {
            type: 'chat',
            payload: {
                partnerId: sender.id,
                partnerName: sender.name,
                partnerRole: sender.role
            }
        };

        // Use the helper to save to Firestore AND send push notification
        sendAppAndPushNotification(receiver.id, title, body, link).catch(err => {
            console.error("Failed to trigger chat notification:", err);
        });
    }
};

export const uploadImageToStorage = async (file: File, chatId: string): Promise<string> => {
    await initializeFirebase();
    const filePath = `chat_images/${chatId}/${new Date().getTime()}-${file.name}`;
    const fileRef = storage.ref(filePath);
    await fileRef.put(file);
    return await fileRef.getDownloadURL();
};

export const markMessagesAsRead = async (chatId: string, messageIds: string[], userId: string): Promise<void> => {
    await initializeFirebase();
    const batch = db.batch();
    const messagesRef = db.collection('chats').doc(chatId).collection('messages');
    messageIds.forEach(msgId => {
        const docRef = messagesRef.doc(msgId);
        batch.update(docRef, {
            readBy: firebase.firestore.FieldValue.arrayUnion(userId)
        });
    });
    await batch.commit();
};

const getUniqueChatPartners = async (userId: string, roleField: 'studentId' | 'teacherId'): Promise<User[]> => {
    await initializeFirebase();
    const partnerRoleField = roleField === 'studentId' ? 'teacherId' : 'studentId';
    const q = db.collection('bookings').where(roleField, '==', userId);
    const snapshot = await q.get();
    
    if (snapshot.empty) return [];
    
    const partnerIds = new Set<string>();
    snapshot.docs.forEach(doc => {
        const booking = doc.data() as Booking;
        partnerIds.add(booking[partnerRoleField]);
    });

    if (partnerIds.size === 0) return [];

    const usersRef = db.collection('users');
    const partnersSnapshot = await usersRef.where(firebase.firestore.FieldPath.documentId(), 'in', Array.from(partnerIds)).get();

    return partnersSnapshot.docs.map(doc => docToObject<User>(doc));
};

export const getUniqueChatPartnersForStudent = (studentId: string) => getUniqueChatPartners(studentId, 'studentId');
export const getUniqueChatPartnersForTeacher = (teacherId: string) => getUniqueChatPartners(teacherId, 'teacherId');