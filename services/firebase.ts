// services/firebase.ts
import { initializeApp, FirebaseApp } from 'firebase/app';
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
  Timestamp
} from 'firebase/firestore';
import { AppConfig, getConfig } from './config';
import { User, Course, Booking, Availability, Notification } from '../types';

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
      
      if (!firebaseApp) {
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
    // This is a simplified delete. In a real app, you'd handle cleaning up related data.
    // Also, deleting a user from Firestore doesn't delete them from Firebase Auth.
    // That requires the Admin SDK on a backend.
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
    batch.set(newAvailRef, avail);
  });
  await batch.commit();
};

export const getAvailabilitiesForTeacher = async (teacherId: string): Promise<Availability[]> => {
    await initializeFirebase();
    const q = query(
      collection(db, 'availabilities'), 
      where('teacherId', '==', teacherId),
      where('startTime', '>=', Timestamp.now())
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToObject<Availability>(doc));
};

export const getAllAvailabilities = async (): Promise<Availability[]> => {
    await initializeFirebase();
    const snapshot = await getDocs(collection(db, 'availabilities'));
    return snapshot.docs.map(doc => docToObject<Availability>(doc));
}

export const deleteAvailability = async (availabilityId: string): Promise<void> => {
    await initializeFirebase();
    await deleteDoc(doc(db, 'availabilities', availabilityId));
}

// Booking Functions
export const createBooking = async (bookingData: Omit<Booking, 'id'>, availabilityId: string): Promise<void> => {
    await initializeFirebase();
    const batch = writeBatch(db);
    
    // Add new booking
    const newBookingRef = doc(collection(db, 'bookings'));
    batch.set(newBookingRef, bookingData);

    // Update availability to 'booked'
    const availabilityRef = doc(db, 'availabilities', availabilityId);
    batch.update(availabilityRef, { status: 'booked', studentId: bookingData.studentId });

    await batch.commit();
};

export const createManualBooking = async (bookingData: Omit<Booking, 'id'>): Promise<void> => {
  await initializeFirebase();
  await addDoc(collection(db, 'bookings'), bookingData);
};

export const getBookingsForUser = async (userId: string, role: 'student' | 'teacher'): Promise<Booking[]> => {
    await initializeFirebase();
    const field = role === 'student' ? 'studentId' : 'teacherId';
    const q = query(collection(db, 'bookings'), where(field, '==', userId), orderBy('startTime', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => docToObject<Booking>(doc));
};

export const getAllBookings = async (): Promise<Booking[]> => {
    await initializeFirebase();
    const snapshot = await getDocs(collection(db, 'bookings'));
    return snapshot.docs.map(doc => docToObject<Booking>(doc));
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
  const q = query(
    collection(db, 'notifications'), 
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => docToObject<Notification>(doc));
};
