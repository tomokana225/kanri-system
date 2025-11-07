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
    runTransaction,
    Firestore,
    collectionGroup
} from 'firebase/firestore';
import { AppConfig, getConfig } from './config';
import { User, Course, Booking, Availability, Notification } from '../types';

let firebaseApp: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Centralized Firebase initialization
export const initializeFirebase = async () => {
  if (firebaseApp) {
    return { firebaseApp, auth, db };
  }

  try {
    const config: AppConfig = await getConfig();
    firebaseApp = initializeApp(config.firebase);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    return { firebaseApp, auth, db };
  } catch (error) {
    console.error("Firebase initialization failed:", error);
    throw error;
  }
};

// User Functions
export const getUserProfile = async (uid: string): Promise<User | null> => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as User;
    }
    return null;
};

export const createUserProfile = async (uid: string, userData: Omit<User, 'id'>): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, userData);
};

export const getAllUsers = async (): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    const userSnapshot = await getDocs(usersCol);
    return userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const updateUser = async (uid: string, userData: Partial<Omit<User, 'id'>>): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, userData);
};

export const deleteUser = async (uid: string): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    // Note: This does not delete the Firebase Auth user, only the Firestore profile.
    await deleteDoc(userRef);
};


// Course Functions
export const getAllCourses = async (): Promise<Course[]> => {
    const coursesCol = collection(db, 'courses');
    const courseSnapshot = await getDocs(coursesCol);
    return courseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

export const createCourse = async (courseData: Omit<Course, 'id'>): Promise<string> => {
    const coursesCol = collection(db, 'courses');
    const docRef = await addDoc(coursesCol, courseData);
    return docRef.id;
};

export const updateCourse = async (courseId: string, courseData: Partial<Omit<Course, 'id'>>): Promise<void> => {
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, courseData);
};

export const deleteCourse = async (courseId: string): Promise<void> => {
    const courseRef = doc(db, 'courses', courseId);
    await deleteDoc(courseRef);
};


// Booking and Availability Functions
export const getAllBookings = async (): Promise<Booking[]> => {
    const bookingsCol = collection(db, 'bookings');
    const bookingSnapshot = await getDocs(bookingsCol);
    return bookingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};

export const getStudentBookings = async (studentId: string): Promise<Booking[]> => {
    const bookingsQuery = query(collection(db, 'bookings'), where('studentId', '==', studentId));
    const bookingSnapshot = await getDocs(bookingsQuery);
    return bookingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};

export const getTeacherBookings = async (teacherId: string): Promise<Booking[]> => {
    const bookingsQuery = query(collection(db, 'bookings'), where('teacherId', '==', teacherId));
    const bookingSnapshot = await getDocs(bookingsQuery);
    return bookingSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};


export const getAllAvailabilities = async (): Promise<Availability[]> => {
    const availabilitiesCol = collection(db, 'availabilities');
    const availabilitiesSnapshot = await getDocs(availabilitiesCol);
    return availabilitiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Availability));
};

export const getTeacherAvailabilities = async (teacherId: string): Promise<Availability[]> => {
    const availabilitiesQuery = query(
        collection(db, 'availabilities'),
        where('teacherId', '==', teacherId),
        where('status', '!=', 'booked')
    );
    const snapshot = await getDocs(availabilitiesQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Availability));
};

export const addAvailabilities = async (availabilities: Omit<Availability, 'id'>[]): Promise<void> => {
    const batch = writeBatch(db);
    const availabilitiesCol = collection(db, 'availabilities');
    availabilities.forEach(avail => {
        const newAvailRef = doc(availabilitiesCol);
        batch.set(newAvailRef, { ...avail, status: 'available' });
    });
    await batch.commit();
};

export const deleteAvailability = async (availabilityId: string): Promise<void> => {
    const availabilityRef = doc(db, 'availabilities', availabilityId);
    await deleteDoc(availabilityRef);
};

export const createBooking = async (bookingData: Omit<Booking, 'id'>, availabilityId: string): Promise<void> => {
    await runTransaction(db, async (transaction) => {
        const availabilityRef = doc(db, 'availabilities', availabilityId);
        const availabilitySnap = await transaction.get(availabilityRef);

        if (!availabilitySnap.exists() || availabilitySnap.data().status === 'booked') {
            throw new Error("This time slot is no longer available.");
        }

        transaction.update(availabilityRef, { status: 'booked', studentId: bookingData.studentId });

        const newBookingRef = doc(collection(db, 'bookings'));
        transaction.set(newBookingRef, bookingData);
    });
};

export const createManualBooking = async (bookingData: Omit<Booking, 'id'>): Promise<void> => {
    const bookingsCol = collection(db, 'bookings');
    await addDoc(bookingsCol, bookingData);
};


// Notification Functions
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
    const notificationsQuery = query(collection(db, 'notifications'), where('userId', '==', userId));
    const notificationSnapshot = await getDocs(notificationsQuery);
    return notificationSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
};

// Teacher Portal Specific
export const getBookingRequests = async (teacherId: string): Promise<Booking[]> => {
    const q = query(
        collection(db, "bookings"),
        where("teacherId", "==", teacherId),
        where("status", "==", "pending")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()} as Booking));
};

export const updateBookingStatus = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, { status });
};
