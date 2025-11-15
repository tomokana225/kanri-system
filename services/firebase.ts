// services/firebase.ts
// Fix: Use Firebase compat imports to resolve module resolution errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

import { AppConfig, getConfig } from './config';
import { User, Course, Booking, Availability, Notification, Message } from '../types';

let firebaseApp: firebase.app.App;
let auth: firebase.auth.Auth;
let db: firebase.firestore.Firestore;
let storage: firebase.storage.Storage;

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
  time: string, // "HH:mm"
  startDate: Date,
  endDate: Date
): Promise<void> => {
  await initializeFirebase();
  const batch = db.batch();
  const availabilitiesCol = db.collection('availabilities');
  const [hours, minutes] = time.split(':').map(Number);

  let currentDate = new Date(startDate);
  // Normalize start date to the beginning of the day to avoid time zone issues
  currentDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999); // Ensure end date is inclusive

  while (currentDate <= endDate) {
    if (daysOfWeek.includes(currentDate.getDay())) {
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
    currentDate.setDate(currentDate.getDate() + 1);
  }

  await batch.commit();
};


export const getAvailabilitiesForTeacher = async (teacherId: string): Promise<Availability[]> => {
    await initializeFirebase();
    // Simplified query to avoid composite index requirement
    const q = db.collection('availabilities').where('teacherId', '==', teacherId);
    const querySnapshot = await q.get();
    const allAvailabilities = querySnapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => docToObject<Availability>(doc));

    // Filter and sort on the client-side
    const now = new Date();
    return allAvailabilities
      .filter(a => a.startTime.toDate() >= now)
      .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
};

export const getAllAvailabilities = async (): Promise<Availability[]> => {
    await initializeFirebase();
    const snapshot = await db.collection('availabilities').get();
    const allAvailabilities = snapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => docToObject<Availability>(doc));
    // Sort on client
    return allAvailabilities.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
}

export const deleteAvailability = async (availabilityId: string): Promise<void> => {
    await initializeFirebase();
    await db.collection('availabilities').doc(availabilityId).delete();
}

// Booking Functions
export const createBooking = async (bookingData: Omit<Booking, 'id'>, availabilityId: string): Promise<void> => {
    await initializeFirebase();
    const batch = db.batch();
    try {
        await db.runTransaction(async (transaction) => {
            const availabilityRef = db.collection('availabilities').doc(availabilityId);
            const availabilityDoc = await transaction.get(availabilityRef);

            if (!availabilityDoc.exists || availabilityDoc.data()?.status === 'booked') {
                throw new Error("This slot is already booked or no longer available.");
            }
            
            const CANCELLATION_POLICY_HOURS = 24;
            const deadline = new Date(bookingData.startTime.toDate().getTime());
            deadline.setHours(deadline.getHours() - CANCELLATION_POLICY_HOURS);
            const cancellationDeadline = firebase.firestore.Timestamp.fromDate(deadline);

            const newBookingRef = db.collection('bookings').doc();
            transaction.set(newBookingRef, { ...bookingData, cancellationDeadline, reminderSent: false });
            transaction.update(availabilityRef, { status: 'booked', studentId: bookingData.studentId });
        });
        
        // After transaction succeeds, create notifications in a batch
        const studentNotifRef = db.collection('notifications').doc();
        batch.set(studentNotifRef, {
            userId: bookingData.studentId,
            message: `「${bookingData.courseTitle}」の予約が確定しました。`,
            read: false,
            createdAt: firebase.firestore.Timestamp.now(),
        });

        const teacherNotifRef = db.collection('notifications').doc();
        batch.set(teacherNotifRef, {
            userId: bookingData.teacherId,
            message: `${bookingData.studentName}さんから「${bookingData.courseTitle}」の新しい予約が入りました。`,
            read: false,
            createdAt: firebase.firestore.Timestamp.now(),
        });
        await batch.commit();

    } catch (e) {
        console.error("Booking transaction failed: ", e);
        if (e instanceof Error && e.message.includes('already booked')) {
            throw new Error('申し訳ありませんが、この時間枠はたった今予約されました。');
        }
        throw e;
    }
};


export const createManualBooking = async (bookingData: Omit<Booking, 'id'>): Promise<void> => {
  await initializeFirebase();
  await db.collection('bookings').add(bookingData);
};

export const getBookingsForUser = async (userId: string, role: 'student' | 'teacher'): Promise<Booking[]> => {
    await initializeFirebase();
    const field = role === 'student' ? 'studentId' : 'teacherId';
    const q = db.collection('bookings').where(field, '==', userId);
    const querySnapshot = await q.get();
    const allBookings = querySnapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => docToObject<Booking>(doc));
    
    return allBookings.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
};

export const getAllBookings = async (): Promise<Booking[]> => {
    await initializeFirebase();
    const snapshot = await db.collection('bookings').get();
    const allBookings = snapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => docToObject<Booking>(doc));
    return allBookings.sort((a,b) => b.startTime.toMillis() - a.startTime.toMillis());
};

export const updateBookingStatus = async (bookingId: string, status: Booking['status']): Promise<void> => {
    await initializeFirebase();
    const bookingRef = db.collection('bookings').doc(bookingId);
    await bookingRef.update({ status });

    if (status === 'cancelled') {
        const bookingDoc = await bookingRef.get();
        if (bookingDoc.exists) {
            const booking = bookingDoc.data() as Booking;
            const batch = db.batch();
            const studentNotifRef = db.collection('notifications').doc();
            batch.set(studentNotifRef, {
                userId: booking.studentId,
                message: `「${booking.courseTitle}」の予約がキャンセルされました。`,
                read: false, createdAt: firebase.firestore.Timestamp.now()
            });
            const teacherNotifRef = db.collection('notifications').doc();
            batch.set(teacherNotifRef, {
                userId: booking.teacherId,
                message: `${booking.studentName}さんが「${booking.courseTitle}」の予約をキャンセルしました。`,
                read: false, createdAt: firebase.firestore.Timestamp.now()
            });
            await batch.commit();
        }
    }
};

export const submitFeedback = async (bookingId: string, feedback: { rating: number; comment: string }): Promise<void> => {
  await initializeFirebase();
  const bookingRef = db.collection('bookings').doc(bookingId);
  await bookingRef.update({ feedback, status: 'completed' });
};

// Notification Functions
export const subscribeToUserNotifications = (
  userId: string,
  onUpdate: (notifications: Notification[]) => void
): (() => void) => {
  initializeFirebase();
  const q = db.collection('notifications')
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(20);
  
  return q.onSnapshot(snapshot => {
    const notifications = snapshot.docs.map(doc => docToObject<Notification>(doc));
    onUpdate(notifications);
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


// Chat Functions
export const getChatId = (uid1: string, uid2: string): string => {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

export const sendChatMessage = async (
  chatId: string,
  message: Partial<Omit<Message, 'id' | 'createdAt'>>,
  sender: User,
  recipient: Partial<User>
): Promise<void> => {
  await initializeFirebase();
  const batch = db.batch();
  
  const chatDocRef = db.collection('chats').doc(chatId);
  batch.set(chatDocRef, { participants: chatId.split('_').sort() }, { merge: true });

  const messagesCol = chatDocRef.collection('messages');
  const newMsgRef = messagesCol.doc();
  
  batch.set(newMsgRef, {
    ...message,
    senderId: sender.id,
    createdAt: firebase.firestore.Timestamp.now(),
    readBy: [sender.id], // Initially only read by the sender
  });

  // Create a notification for the recipient
  const notifRef = db.collection('notifications').doc();
  const notifMessage = message.type === 'image' ? `${sender.name}さんから写真が届きました。` : `${sender.name}さんから新しいメッセージです。`;
  batch.set(notifRef, {
    userId: recipient.id,
    message: notifMessage,
    read: false,
    createdAt: firebase.firestore.Timestamp.now(),
    link: `/chat/${sender.id}` // Example link to open chat
  });
  
  await batch.commit();
};

export const getChatMessages = async (
  chatId: string,
  onUpdate: (messages: Message[]) => void,
  onError: (error: firebase.firestore.FirestoreError) => void
): Promise<() => void> => {
  await initializeFirebase();
  const chatDocRef = db.collection('chats').doc(chatId);
  
  try {
    // Ensure chat doc exists for listener
    await chatDocRef.set({ participants: chatId.split('_').sort() }, { merge: true });
  } catch (error: any) {
    console.error("Failed to prepare chat document:", error);
    onError(error);
    return () => {};
  }

  const messagesCol = chatDocRef.collection('messages');
  const q = messagesCol.orderBy('createdAt', 'asc').limit(100);
  
  return q.onSnapshot(
    (querySnapshot) => {
        const messages = querySnapshot.docs.map((d) => docToObject<Message>(d));
        onUpdate(messages);
    },
    (error) => {
        console.error("Chat listener error:", error);
        onError(error);
    }
  );
};

export const markMessagesAsRead = async (
    chatId: string,
    messageIds: string[],
    userId: string
): Promise<void> => {
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

export const uploadImageToStorage = async (file: File, chatId: string): Promise<string> => {
    await initializeFirebase();
    const filePath = `chat_images/${chatId}/${Date.now()}_${file.name}`;
    const fileRef = storage.ref(filePath);
    await fileRef.put(file);
    return fileRef.getDownloadURL();
};


export const getUniqueChatPartnersForStudent = async (studentId: string): Promise<User[]> => {
  await initializeFirebase();
  const studentBookings = await getBookingsForUser(studentId, 'student');
  
  if (studentBookings.length === 0) {
    return [];
  }

  const teacherIds = new Set(studentBookings.map(b => b.teacherId));
  
  const partnerPromises = Array.from(teacherIds).map(id => getUserProfile(id));
  
  const partners = await Promise.all(partnerPromises);

  return partners.filter((p): p is User => p !== null);
};

export const getUniqueChatPartnersForTeacher = async (teacherId: string): Promise<User[]> => {
  await initializeFirebase();
  const teacherBookings = await getBookingsForUser(teacherId, 'teacher');
  
  if (teacherBookings.length === 0) {
    return [];
  }

  const studentIds = new Set(teacherBookings.map(b => b.studentId));
  
  const partnerPromises = Array.from(studentIds).map(id => getUserProfile(id));
  
  const partners = await Promise.all(partnerPromises);

  return partners.filter((p): p is User => p !== null);
};