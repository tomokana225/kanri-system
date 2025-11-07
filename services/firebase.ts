import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  deleteDoc, 
  writeBatch,
  addDoc,
  Firestore,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { User, Course, Booking, Availability, Notification } from '../types';
import { getConfig } from './config';

let firebaseApp: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Helper to initialize Firebase
export const initializeFirebase = async () => {
    if (!firebaseApp) {
        const config = await getConfig();
        firebaseApp = initializeApp(config.firebase);
        auth = getAuth(firebaseApp);
        db = getFirestore(firebaseApp);
    }
    return { firebaseApp, auth, db };
};


// --- User Management ---

// Get a user's profile from Firestore
export const getUserProfile = async (uid: string): Promise<User | null> => {
    await initializeFirebase();
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return null;
};

// Create a user profile in Firestore
export const createUserProfile = async (uid: string, userData: Omit<User, 'id'>): Promise<void> => {
    await initializeFirebase();
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, userData);
};

// Get all users
export const getAllUsers = async (): Promise<User[]> => {
    await initializeFirebase();
    const usersCol = collection(db, 'users');
    const userSnapshot = await getDocs(usersCol);
    return userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

// Update a user
export const updateUser = async (uid: string, userData: Partial<Omit<User, 'id'>>): Promise<void> => {
    await initializeFirebase();
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, userData);
};

// Delete a user from Firestore (doesn't delete from Auth)
export const deleteUser = async (uid: string): Promise<void> => {
    await initializeFirebase();
    await deleteDoc(doc(db, 'users', uid));
};


// --- Course Management ---

// Get all courses
export const getAllCourses = async (): Promise<Course[]> => {
    await initializeFirebase();
    const coursesCol = collection(db, 'courses');
    const courseSnapshot = await getDocs(coursesCol);
    return courseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

// Get courses for a specific student
export const getStudentCourses = async (studentId: string): Promise<Course[]> => {
    await initializeFirebase();
    const coursesRef = collection(db, 'courses');
    const q = query(coursesRef, where('studentIds', 'array-contains', studentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

// Get courses for a specific teacher
export const getTeacherCourses = async (teacherId: string): Promise<Course[]> => {
    await initializeFirebase();
    const coursesRef = collection(db, 'courses');
    const q = query(coursesRef, where('teacherId', '==', teacherId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

// Create a new course
export const createCourse = async (courseData: Omit<Course, 'id'>): Promise<void> => {
    await initializeFirebase();
    await addDoc(collection(db, 'courses'), courseData);
};

// Update an existing course
export const updateCourse = async (courseId: string, courseData: Partial<Omit<Course, 'id'>>): Promise<void> => {
    await initializeFirebase();
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, courseData);
};

// Delete a course
export const deleteCourse = async (courseId: string): Promise<void> => {
    await initializeFirebase();
    await deleteDoc(doc(db, 'courses', courseId));
};


// --- Booking Management ---

// Get all bookings
export const getAllBookings = async (): Promise<Booking[]> => {
    await initializeFirebase();
    const bookingsCol = collection(db, 'bookings');
    const bookingSnapshot = await getDocs(bookingsCol);
    return bookingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};

// Get bookings for a specific student
export const getStudentBookings = async (studentId: string): Promise<Booking[]> => {
    await initializeFirebase();
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('studentId', '==', studentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};

// Get bookings for a specific teacher
export const getTeacherBookings = async (teacherId: string): Promise<Booking[]> => {
    await initializeFirebase();
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('teacherId', '==', teacherId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};

// Create a booking and consume an availability slot
export const createBooking = async (bookingData: Omit<Booking, 'id'>, availabilityId: string): Promise<void> => {
    await initializeFirebase();
    const batch = writeBatch(db);

    const bookingRef = doc(collection(db, 'bookings'));
    batch.set(bookingRef, bookingData);
    
    const availabilityRef = doc(db, 'availabilities', availabilityId);
    batch.delete(availabilityRef);
    
    await batch.commit();
};

// Create a manual booking (by admin, does not consume availability)
export const createManualBooking = async (bookingData: Omit<Booking, 'id'>): Promise<void> => {
    await initializeFirebase();
    await addDoc(collection(db, 'bookings'), bookingData);
};


// --- Availability Management ---

// Get all availabilities
export const getAllAvailabilities = async (): Promise<Availability[]> => {
    await initializeFirebase();
    const availabilitiesCol = collection(db, 'availabilities');
    const availabilitySnapshot = await getDocs(availabilitiesCol);
    return availabilitySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Availability));
};

// Get availabilities for a specific teacher
export const getTeacherAvailabilities = async (teacherId: string): Promise<Availability[]> => {
    await initializeFirebase();
    const availabilitiesRef = collection(db, 'availabilities');
    const q = query(availabilitiesRef, where('teacherId', '==', teacherId), where('startTime', '>', Timestamp.now()));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Availability));
};

// Add multiple availabilities in a batch
export const addAvailabilities = async (availabilities: Omit<Availability, 'id'>[]): Promise<void> => {
    await initializeFirebase();
    const batch = writeBatch(db);
    availabilities.forEach(availability => {
        const docRef = doc(collection(db, 'availabilities'));
        batch.set(docRef, availability);
    });
    await batch.commit();
};

// Delete an availability slot
export const deleteAvailability = async (availabilityId: string): Promise<void> => {
    await initializeFirebase();
    await deleteDoc(doc(db, 'availabilities', availabilityId));
};


// --- Notification Management ---

// Get notifications for a user
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
    await initializeFirebase();
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
};
