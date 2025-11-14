// services/firebase.ts
// Fix: Use Firebase compat imports to resolve module resolution errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

import { AppConfig, getConfig } from './config';
import { User, Course, Booking, Availability, Notification, Message } from '../types';

let firebaseApp: firebase.app.App;
let auth: firebase.auth.Auth;
let db: firebase.firestore.Firestore;

let firebaseInitializationPromise: Promise<{ app: firebase.app.App, auth: firebase.auth.Auth, db: firebase.firestore.Firestore }> | null = null;

// Helper to convert Firestore docs to objects
const docToObject = <T>(d: firebase.firestore.DocumentSnapshot): T => ({ id: d.id, ...d.data() } as unknown as T);

export const initializeFirebase = async (): Promise<{ app: firebase.app.App, auth: firebase.auth.Auth, db: firebase.firestore.Firestore }> => {
  if (firebaseInitializationPromise) {
    return firebaseInitializationPromise;
  }

  firebaseInitializationPromise = (async () => {
    try {
      const config: AppConfig = await getConfig();
      
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(config.firebase);
        auth = firebase.auth();
        db = firebase.firestore();
      } else {
        firebaseApp = firebase.app();
        auth = firebase.auth();
        db = firebase.firestore();
      }
      return { app: firebaseApp, auth, db };
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
    try {
        await db.runTransaction(async (transaction) => {
            const availabilityRef = db.collection('availabilities').doc(availabilityId);
            const availabilityDoc = await transaction.get(availabilityRef);

            if (!availabilityDoc.exists || availabilityDoc.data()?.status === 'booked') {
                throw new Error("This slot is already booked or no longer available.");
            }
            
            // Set a 24-hour cancellation policy
            const CANCELLATION_POLICY_HOURS = 24;
            const deadline = new Date(bookingData.startTime.toDate().getTime());
            deadline.setHours(deadline.getHours() - CANCELLATION_POLICY_HOURS);
            const cancellationDeadline = firebase.firestore.Timestamp.fromDate(deadline);

            // Create new booking
            const newBookingRef = db.collection('bookings').doc();
            transaction.set(newBookingRef, {
                ...bookingData,
                cancellationDeadline,
                reminderSent: false
            });

            // Update availability to 'booked'
            transaction.update(availabilityRef, { status: 'booked', studentId: bookingData.studentId });
        });
    } catch (e) {
        console.error("Booking transaction failed: ", e);
        if (e instanceof Error && e.message.includes('already booked')) {
            throw new Error('申し訳ありませんが、この時間枠はたった今予約されました。');
        }
        throw e; // re-throw other errors
    }
};

export const createManualBooking = async (bookingData: Omit<Booking, 'id'>): Promise<void> => {
  await initializeFirebase();
  await db.collection('bookings').add(bookingData);
};

export const getBookingsForUser = async (userId: string, role: 'student' | 'teacher'): Promise<Booking[]> => {
    await initializeFirebase();
    const field = role === 'student' ? 'studentId' : 'teacherId';
    // Simplified query to avoid composite index requirement
    const q = db.collection('bookings').where(field, '==', userId);
    const querySnapshot = await q.get();
    const allBookings = querySnapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => docToObject<Booking>(doc));
    
    // Sort on client-side
    return allBookings.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
};

export const getAllBookings = async (): Promise<Booking[]> => {
    await initializeFirebase();
    const snapshot = await db.collection('bookings').get();
    const allBookings = snapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => docToObject<Booking>(doc));
    // Sort on client
    return allBookings.sort((a,b) => b.startTime.toMillis() - a.startTime.toMillis());
};

export const updateBookingStatus = async (bookingId: string, status: Booking['status']): Promise<void> => {
    await initializeFirebase();
    const bookingRef = db.collection('bookings').doc(bookingId);
    await bookingRef.update({ status });
};

export const submitFeedback = async (bookingId: string, feedback: { rating: number; comment: string }): Promise<void> => {
  await initializeFirebase();
  const bookingRef = db.collection('bookings').doc(bookingId);
  await bookingRef.update({ feedback, status: 'completed' });
};

// Notification Functions
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  await initializeFirebase();
  // Simplified query to avoid composite index requirement
  const q = db.collection('notifications')
    .where('userId', '==', userId)
    .limit(50);
  const querySnapshot = await q.get();
  const allNotifications = querySnapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => docToObject<Notification>(doc));

  // Sort and limit on client-side
  return allNotifications
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    .slice(0, 20);
};

// Chat Functions
// Helper to create a consistent chat ID between two users
export const getChatId = (uid1: string, uid2: string): string => {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
};

export const sendChatMessage = async (chatId: string, message: Omit<Message, 'id' | 'createdAt'>): Promise<void> => {
  await initializeFirebase();
  const messagesCol = db.collection('chats').doc(chatId).collection('messages');
  await messagesCol.add({
    ...message,
    createdAt: firebase.firestore.Timestamp.now(),
  });
};

// Use onSnapshot for real-time updates. This returns an unsubscribe function for cleanup.
export const getChatMessages = async (chatId: string, onUpdate: (messages: Message[]) => void): Promise<() => void> => {
  await initializeFirebase();
  const chatDocRef = db.collection('chats').doc(chatId);
  
  // Ensure the chat document exists so security rules can check participants
  const chatDocSnap = await chatDocRef.get();
  if (!chatDocSnap.exists) {
      await chatDocRef.set({ participants: chatId.split('_').sort() });
  }

  const messagesCol = db.collection('chats').doc(chatId).collection('messages');
  const q = messagesCol.orderBy('createdAt', 'asc').limit(100);
  
  const unsubscribe = q.onSnapshot((querySnapshot: firebase.firestore.QuerySnapshot) => {
    const messages = querySnapshot.docs.map((d: firebase.firestore.QueryDocumentSnapshot) => docToObject<Message>(d));
    onUpdate(messages);
  });
  
  return unsubscribe;
};