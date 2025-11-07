import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { 
    getFirestore, 
    Firestore, 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    deleteDoc, 
    addDoc, 
    writeBatch,
    Timestamp,
    orderBy,
    runTransaction,
    updateDoc,
} from "firebase/firestore";
import { getConfig } from "./config";
import { User, Course, Booking, Availability, Notification } from "../types";

let firebaseApp: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Initialization
export const initializeFirebase = async () => {
    if (firebaseApp) {
        return { auth, db };
    }
    const config = await getConfig();
    firebaseApp = initializeApp(config.firebase);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    return { auth, db };
};

// User Management
export const getUserProfile = async (uid: string): Promise<User | null> => {
    const userDocRef = doc(db, 'users', uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
        return { id: userDocSnap.id, ...userDocSnap.data() } as User;
    }
    return null;
};

export const createUserProfile = async (uid: string, data: Omit<User, 'id'>) => {
    await setDoc(doc(db, 'users', uid), data);
};

export const updateUserProfile = async (uid: string, data: Partial<Omit<User, 'id'>>) => {
    await updateDoc(doc(db, 'users', uid), data);
};

export const getAllUsers = async (): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    const userSnapshot = await getDocs(usersCol);
    return userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

// Course Management
export const getAllCourses = async (): Promise<Course[]> => {
    const coursesCol = collection(db, 'courses');
    const courseSnapshot = await getDocs(coursesCol);
    const courses = courseSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
    
    // Denormalize teacher names for easier display
    const users = await getAllUsers();
    const teacherMap = new Map(users.filter(u => u.role === 'teacher').map(t => [t.id, t.name]));

    return courses.map(course => ({
        ...course,
        teacherName: teacherMap.get(course.teacherId) || '不明'
    }));
};

export const getStudentCourses = async (studentId: string): Promise<Course[]> => {
    const q = query(collection(db, 'courses'), where('studentIds', 'array-contains', studentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

export const getTeacherCourses = async (teacherId: string): Promise<Course[]> => {
    const q = query(collection(db, 'courses'), where('teacherId', '==', teacherId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

export const createCourse = async (courseData: Partial<Omit<Course, 'id'>>) => {
    await addDoc(collection(db, 'courses'), courseData);
};

export const updateCourse = async (courseId: string, courseData: Partial<Omit<Course, 'id'>>) => {
    await updateDoc(doc(db, 'courses', courseId), courseData);
};

export const deleteCourse = async (courseId: string) => {
    await deleteDoc(doc(db, 'courses', courseId));
};


// Booking & Availability Management
export const getStudentBookings = async (studentId: string): Promise<Booking[]> => {
    const q = query(collection(db, 'bookings'), where('studentId', '==', studentId), orderBy('startTime', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};

export const getTeacherBookings = async (teacherId: string): Promise<Booking[]> => {
    const q = query(collection(db, 'bookings'), where('teacherId', '==', teacherId), orderBy('startTime', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};

export const getTeacherAvailabilities = async (teacherId: string): Promise<Availability[]> => {
    const now = Timestamp.now();
    const q = query(collection(db, 'availabilities'), where('teacherId', '==', teacherId), where('startTime', '>=', now), orderBy('startTime', 'asc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Availability));
};

export const addAvailabilities = async (availabilities: Omit<Availability, 'id'>[]) => {
    const batch = writeBatch(db);
    const availabilitiesCol = collection(db, 'availabilities');
    availabilities.forEach(avail => {
        const docRef = doc(availabilitiesCol);
        batch.set(docRef, avail);
    });
    await batch.commit();
};

export const deleteAvailability = async (availabilityId: string) => {
    await deleteDoc(doc(db, 'availabilities', availabilityId));
};

export const createBooking = async (bookingData: Omit<Booking, 'id'>, availabilityId: string) => {
    await runTransaction(db, async (transaction) => {
        const availabilityRef = doc(db, 'availabilities', availabilityId);
        const availabilityDoc = await transaction.get(availabilityRef);
        if (!availabilityDoc.exists()) {
            throw new Error("この時間は既に予約されているか、利用できなくなりました。");
        }
        
        // Delete availability and create new booking
        transaction.delete(availabilityRef);
        const bookingRef = doc(collection(db, 'bookings'));
        transaction.set(bookingRef, bookingData);
    });
};

// Notifications
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
    const q = query(collection(db, 'notifications'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
};
