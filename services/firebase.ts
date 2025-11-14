// services/firebase.ts
import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  writeBatch,
  addDoc,
  orderBy,
  limit,
  Timestamp,
  runTransaction,
  onSnapshot
} from 'firebase/firestore';
import { AppConfig, getConfig } from './config';
import { User, Course, Booking, Availability, Notification, Message } from '../types';

let firebaseApp: FirebaseApp;
let auth: Auth;
let db: any; // Firestore

let firebaseInitializationPromise: Promise<{ app: FirebaseApp, auth: Auth, db: any }> | null = null;

// Helper to convert Firestore docs to objects
const docToObject = <T>(d: any): T => ({ id: d.id, ...d.data() } as unknown as T);

export const initializeFirebase = async (): Promise<{ app: FirebaseApp, auth: Auth, db: any }> => {
  if (firebaseInitializationPromise) {
    return firebaseInitializationPromise;
  }

  firebaseInitializationPromise = (async () => {
    try {
      const config: AppConfig = await getConfig();
      
      if (!getApps().length) {
        firebaseApp = initializeApp(config.firebase);
        auth = getAuth(firebaseApp);
        db = getFirestore(firebaseApp);
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
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() } as User;
  }
  return null;
};

export const createUserProfile = async (uid: string, userData: Omit<User, 'id'>): Promise<void> => {
  await initializeFirebase();
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, userData);
};

export const getAllUsers = async (): Promise<User[]> => {
  await initializeFirebase();
  const usersCol = collection(db, 'users');
  const userSnapshot = await getDocs(usersCol);
  return userSnapshot.docs.map(doc => docToObject<User>(doc));
};

export const updateUser = async (uid: string, userData: Partial<Omit<User, 'id'>>): Promise<void> => {
    await initializeFirebase();
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, userData);
};

export const deleteUser = async (uid: string): Promise<void> => {
    await initializeFirebase();
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
};


// Course Functions
export const getAllCourses = async (): Promise<Course[]> => {
    await initializeFirebase();
    const coursesCol = collection(db, 'courses');
    const courseSnapshot = await getDocs(coursesCol);
    return courseSnapshot.docs.map(doc => docToObject<Course>(doc));
};

export const getCoursesForStudent = async (studentId: string): Promise<Course[]> => {
    await initializeFirebase();
    const q = query(collection(db, 'courses'), where('studentIds', 'array-contains', studentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToObject<Course>(doc));
};

export const getCoursesForTeacher = async (teacherId: string): Promise<Course[]> => {
    await initializeFirebase();
    const q = query(collection(db, 'courses'), where('teacherId', '==', teacherId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToObject<Course>(doc));
};

export const createCourse = async (courseData: Omit<Course, 'id'>): Promise<void> => {
    await initializeFirebase();
    await addDoc(collection(db, 'courses'), courseData);
};

export const updateCourse = async (courseId: string, courseData: Partial<Omit<Course, 'id'>>): Promise<void> => {
    await initializeFirebase();
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, courseData);
};

export const deleteCourse = async (courseId: string): Promise<void> => {
    await initializeFirebase();
    const courseRef = doc(db, 'courses', courseId);
    await deleteDoc(courseRef);
};

// Availability Functions
export const addAvailabilities = async (availabilities: Omit<Availability, 'id'>[]): Promise<void> => {
  await initializeFirebase();
  const batch = writeBatch(db);
  const availabilitiesCol = collection(db, 'availabilities');
  availabilities.forEach(avail => {
    const newAvailRef = doc(availabilitiesCol);
    batch.set(newAvailRef, { ...avail, status: 'available' }); // Ensure status is set
  });
  await batch.commit();
};

export const getAvailabilitiesForTeacher = async (teacherId: string): Promise<Availability[]> => {
    await initializeFirebase();
    // Simplified query to avoid composite index requirement
    const q = query(collection(db, 'availabilities'), where('teacherId', '==', teacherId));
    const querySnapshot = await getDocs(q);
    const allAvailabilities = querySnapshot.docs.map(doc => docToObject<Availability>(doc));

    // Filter and sort on the client-side
    const now = new Date();
    return allAvailabilities
      .filter(a => a.startTime.toDate() >= now)
      .sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
};

export const getAllAvailabilities = async (): Promise<Availability[]> => {
    await initializeFirebase();
    const snapshot = await getDocs(collection(db, 'availabilities'));
    const allAvailabilities = snapshot.docs.map(doc => docToObject<Availability>(doc));
    // Sort on client
    return allAvailabilities.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
}

export const deleteAvailability = async (availabilityId: string): Promise<void> => {
    await initializeFirebase();
    await deleteDoc(doc(db, 'availabilities', availabilityId));
}

// Booking Functions
export const createBooking = async (bookingData: Omit<Booking, 'id'>, availabilityId: string): Promise<void> => {
    await initializeFirebase();
    try {
        await runTransaction(db, async (transaction) => {
            const availabilityRef = doc(db, 'availabilities', availabilityId);
            const availabilityDoc = await transaction.get(availabilityRef);

            if (!availabilityDoc.exists() || availabilityDoc.data().status === 'booked') {
                throw new Error("This slot is already booked or no longer available.");
            }
            
            // Set a 24-hour cancellation policy
            const CANCELLATION_POLICY_HOURS = 24;
            const deadline = new Date(bookingData.startTime.toDate().getTime());
            deadline.setHours(deadline.getHours() - CANCELLATION_POLICY_HOURS);
            const cancellationDeadline = Timestamp.fromDate(deadline);

            // Create new booking
            const newBookingRef = doc(collection(db, 'bookings'));
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
  await addDoc(collection(db, 'bookings'), bookingData);
};

export const getBookingsForUser = async (userId: string, role: 'student' | 'teacher'): Promise<Booking[]> => {
    await initializeFirebase();
    const field = role === 'student' ? 'studentId' : 'teacherId';
    // Simplified query to avoid composite index requirement
    const q = query(collection(db, 'bookings'), where(field, '==', userId));
    const querySnapshot = await getDocs(q);
    const allBookings = querySnapshot.docs.map(doc => docToObject<Booking>(doc));
    
    // Sort on client-side
    return allBookings.sort((a, b) => b.startTime.toMillis() - a.startTime.toMillis());
};

export const getAllBookings = async (): Promise<Booking[]> => {
    await initializeFirebase();
    const snapshot = await getDocs(collection(db, 'bookings'));
    const allBookings = snapshot.docs.map(doc => docToObject<Booking>(doc));
    // Sort on client
    return allBookings.sort((a,b) => b.startTime.toMillis() - a.startTime.toMillis());
};

export const updateBookingStatus = async (bookingId: string, status: Booking['status']): Promise<void> => {
    await initializeFirebase();
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, { status });
};

export const submitFeedback = async (bookingId: string, feedback: { rating: number; comment: string }): Promise<void> => {
  await initializeFirebase();
  const bookingRef = doc(db, 'bookings', bookingId);
  await updateDoc(bookingRef, { feedback, status: 'completed' });
};

// Notification Functions
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  await initializeFirebase();
  // Simplified query to avoid composite index requirement
  const q = query(
    collection(db, 'notifications'), 
    where('userId', '==', userId),
    limit(50) // Fetch a bit more and sort/limit on client
  );
  const querySnapshot = await getDocs(q);
  const allNotifications = querySnapshot.docs.map(doc => docToObject<Notification>(doc));

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
  const messagesCol = collection(db, 'chats', chatId, 'messages');
  await addDoc(messagesCol, {
    ...message,
    createdAt: Timestamp.now(),
  });
};

// Use onSnapshot for real-time updates. This returns an unsubscribe function for cleanup.
export const getChatMessages = async (chatId: string, onUpdate: (messages: Message[]) => void): Promise<() => void> => {
  await initializeFirebase();
  const chatDocRef = doc(db, 'chats', chatId);
  
  // Ensure the chat document exists so security rules can check participants
  const chatDocSnap = await getDoc(chatDocRef);
  if (!chatDocSnap.exists()) {
      await setDoc(chatDocRef, { participants: chatId.split('_').sort() });
  }

  const messagesCol = collection(db, 'chats', chatId, 'messages');
  const q = query(messagesCol, orderBy('createdAt', 'asc'), limit(100));
  
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const messages = querySnapshot.docs.map(d => docToObject<Message>(d));
    onUpdate(messages);
  });
  
  return unsubscribe;
};
