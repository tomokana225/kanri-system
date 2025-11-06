import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
    getFirestore,
    Firestore,
    doc,
    setDoc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    orderBy,
} from 'firebase/firestore';
import { AppConfig, getConfig } from './config';
import { User, Course, Booking, Notification } from '../types';

let firebaseApp: FirebaseApp;
let auth: Auth;
let db: Firestore;

let firebaseInitializationPromise: Promise<{ auth: Auth; db: Firestore }> | null = null;

export const initializeFirebase = (): Promise<{ auth: Auth; db: Firestore }> => {
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
            return { auth, db };
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            firebaseInitializationPromise = null;
            throw error; // Rethrow to be caught by the caller
        }
    })();

    return firebaseInitializationPromise;
};

// --- User Management ---

export async function getUserProfile(uid: string): Promise<User | null> {
    const { db } = await initializeFirebase();
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() } as User;
    } else {
        return null;
    }
}

export async function createUserProfile(uid: string, userData: Omit<User, 'id'>): Promise<void> {
    const { db } = await initializeFirebase();
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, userData);
}

export async function getAllUsers(): Promise<User[]> {
    const { db } = await initializeFirebase();
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    const users: User[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) { // Ensure data exists to prevent crashes
            users.push({ id: doc.id, ...data } as User);
        }
    });
    return users;
}

export async function updateUser(uid: string, userData: Partial<Omit<User, 'id'>>): Promise<void> {
    const { db } = await initializeFirebase();
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, userData);
}

export async function deleteUser(uid: string): Promise<void> {
    const { db } = await initializeFirebase();
    // Note: This does not delete the user from Firebase Auth. That requires the Admin SDK.
    await deleteDoc(doc(db, 'users', uid));
}

// --- Course Management ---

export async function getStudentCourses(studentId: string): Promise<Course[]> {
    const { db } = await initializeFirebase();
    const coursesRef = collection(db, 'courses');
    const q = query(coursesRef, where('studentIds', 'array-contains', studentId));
    const querySnapshot = await getDocs(q);

    const courses: Course[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) {
            courses.push({ id: doc.id, ...data } as Course);
        }
    });

    return courses;
}

export async function getTeacherCourses(teacherId: string): Promise<Course[]> {
    const { db } = await initializeFirebase();
    const coursesRef = collection(db, 'courses');
    const q = query(coursesRef, where('teacherId', '==', teacherId));
    const querySnapshot = await getDocs(q);

    const courses: Course[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) {
            courses.push({ id: doc.id, ...data } as Course);
        }
    });

    return courses;
}


export async function getAllCourses(): Promise<Course[]> {
    const { db } = await initializeFirebase();
    const coursesRef = collection(db, 'courses');
    const querySnapshot = await getDocs(coursesRef);
    const courses: Course[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) { // Ensure data exists
            courses.push({ id: doc.id, ...data } as Course);
        }
    });
    return courses;
}

export async function createCourse(courseData: Omit<Course, 'id'>): Promise<void> {
    const { db } = await initializeFirebase();
    const coursesRef = collection(db, 'courses');
    await addDoc(coursesRef, courseData);
}

export async function updateCourse(courseId: string, courseData: Partial<Omit<Course, 'id'>>): Promise<void> {
    const { db } = await initializeFirebase();
    const courseRef = doc(db, 'courses', courseId);
    await updateDoc(courseRef, courseData);
}

export async function deleteCourse(courseId: string): Promise<void> {
    const { db } = await initializeFirebase();
    await deleteDoc(doc(db, 'courses', courseId));
}

// --- Booking Management ---

export async function getAllBookings(): Promise<Booking[]> {
    const { db } = await initializeFirebase();
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, orderBy('startTime', 'desc'));
    const querySnapshot = await getDocs(q);

    const bookings: Booking[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) { // Ensure data exists
            bookings.push({ id: doc.id, ...data } as Booking);
        }
    });
    return bookings;
}

export async function getTeacherBookings(teacherId: string): Promise<Booking[]> {
    const { db } = await initializeFirebase();
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('teacherId', '==', teacherId), where('status', '==', 'confirmed'));
    const querySnapshot = await getDocs(q);

    const bookings: Booking[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) {
            bookings.push({ id: doc.id, ...data } as Booking);
        }
    });
    return bookings;
}

export async function getStudentBookings(studentId: string): Promise<Booking[]> {
    const { db } = await initializeFirebase();
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('studentId', '==', studentId), where('status', '==', 'confirmed'));
    const querySnapshot = await getDocs(q);

    const bookings: Booking[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) {
            bookings.push({ id: doc.id, ...data } as Booking);
        }
    });
    // Sort by start time, soonest first
    return bookings.sort((a, b) => a.startTime.toMillis() - b.startTime.toMillis());
}

export async function createBooking(bookingData: Omit<Booking, 'id'>): Promise<void> {
    const { db } = await initializeFirebase();
    const bookingsRef = collection(db, 'bookings');
    await addDoc(bookingsRef, bookingData);
}

export async function updateBooking(bookingId: string, bookingData: Partial<Omit<Booking, 'id'>>): Promise<void> {
    const { db } = await initializeFirebase();
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, bookingData);
}


// --- Notification Management ---

export async function getUserNotifications(userId: string): Promise<Notification[]> {
    const { db } = await initializeFirebase();
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const notifications: Notification[] = [];
    querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data) {
            notifications.push({ id: doc.id, ...data } as Notification);
        }
    });
    // Sort by creation date, newest first
    return notifications.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
}