import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
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
    Timestamp,
    writeBatch,
    deleteDoc,
    updateDoc,
    runTransaction,
    orderBy
} from 'firebase/firestore';
import { getConfig } from './config';
import { User, Course, Booking, Notification, Availability } from '../types';

let firebaseApp: FirebaseApp;
let auth: Auth;
let db: ReturnType<typeof getFirestore>;

// Singleton initialization
let initializationPromise: Promise<{ auth: Auth; db: ReturnType<typeof getFirestore> }> | null = null;

export const initializeFirebase = async () => {
    if (initializationPromise) {
        return initializationPromise;
    }
    initializationPromise = (async () => {
        try {
            const config = await getConfig();
            // Check if firebaseApp is already initialized to avoid re-initialization
            if (!getApps().length) {
                firebaseApp = initializeApp(config.firebase);
            } else {
                firebaseApp = getApps()[0];
            }
            auth = getAuth(firebaseApp);
            db = getFirestore(firebaseApp);
            
            return { auth, db };
        } catch (error) {
            console.error("Firebase initialization failed:", error);
            // Reset promise on failure to allow retry
            initializationPromise = null;
            throw error; // Re-throw to be caught by the caller
        }
    })();

    return initializationPromise;
};

// User Functions
export const getUserProfile = async (uid: string): Promise<User | null> => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as User;
    }
    return null;
};

export const createUserProfile = async (uid: string, data: Omit<User, 'id'>): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, data);
};

export const getAllUsers = async (): Promise<User[]> => {
    const usersCol = collection(db, 'users');
    const userSnapshot = await getDocs(usersCol);
    return userSnapshot.docs.filter(doc => doc.exists()).map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const updateUser = async (uid: string, data: Partial<Omit<User, 'id'>>): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, data);
};

export const deleteUser = async (uid: string): Promise<void> => {
    // This only deletes the Firestore record. Deleting the auth user requires admin SDK.
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
};


// Course Functions
export const getAllCourses = async (): Promise<Course[]> => {
    const coursesCol = collection(db, 'courses');
    const courseSnapshot = await getDocs(coursesCol);
    const courses = courseSnapshot.docs.filter(doc => doc.exists()).map(doc => ({ id: doc.id, ...doc.data() } as Course));
    
    // Fetch teacher names for convenience
    const users = await getAllUsers();
    const teacherMap = new Map(users.filter(u => u.role === 'teacher' && u.id && u.name).map(t => [t.id, t.name]));

    return courses.map(course => ({
        ...course,
        teacherName: teacherMap.get(course.teacherId) || '不明'
    }));
};

export const getStudentCourses = async (studentId: string): Promise<Course[]> => {
    const q = query(collection(db, "courses"), where("studentIds", "array-contains", studentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

export const getTeacherCourses = async (teacherId: string): Promise<Course[]> => {
    const q = query(collection(db, "courses"), where("teacherId", "==", teacherId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
};

export const createCourse = async (courseData: Omit<Course, 'id'>): Promise<void> => {
    const newCourseRef = doc(collection(db, "courses"));
    await setDoc(newCourseRef, courseData);
};

export const updateCourse = async (courseId: string, courseData: Partial<Omit<Course, 'id'>>): Promise<void> => {
    const courseRef = doc(db, "courses", courseId);
    await updateDoc(courseRef, courseData);
};

export const deleteCourse = async (courseId: string): Promise<void> => {
    const courseRef = doc(db, "courses", courseId);
    await deleteDoc(courseRef);
};


// Booking Functions
export const createBooking = async (bookingData: Omit<Booking, 'id'>, availabilityId: string): Promise<void> => {
    const newBookingRef = doc(collection(db, "bookings"));
    const availabilityRef = doc(db, "availabilities", availabilityId);

    await runTransaction(db, async (transaction) => {
        const availabilityDoc = await transaction.get(availabilityRef);
        if (!availabilityDoc.exists()) {
            throw new Error("This time slot is no longer available.");
        }
        transaction.set(newBookingRef, bookingData);
        transaction.delete(availabilityRef); // The slot is now booked, so remove it
    });
};

export const getStudentBookings = async (studentId: string): Promise<Booking[]> => {
    const q = query(
        collection(db, "bookings"), 
        where("studentId", "==", studentId), 
        where("startTime", ">=", Timestamp.now()),
        orderBy("startTime", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};

export const getTeacherBookings = async (teacherId: string): Promise<Booking[]> => {
    const q = query(
        collection(db, "bookings"), 
        where("teacherId", "==", teacherId), 
        where("startTime", ">=", Timestamp.now()),
        orderBy("startTime", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};

export const getAllBookings = async (): Promise<Booking[]> => {
    const q = query(
        collection(db, "bookings"), 
        where("startTime", ">=", Timestamp.now()),
        orderBy("startTime", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.filter(doc => doc.exists()).map(doc => ({ id: doc.id, ...doc.data() } as Booking));
};


// Availability Functions
export const addAvailabilities = async (availabilities: Omit<Availability, 'id'>[]): Promise<void> => {
    const batch = writeBatch(db);
    availabilities.forEach(avail => {
        const newAvailRef = doc(collection(db, "availabilities"));
        batch.set(newAvailRef, avail);
    });
    await batch.commit();
};

export const getTeacherAvailabilities = async (teacherId: string): Promise<Availability[]> => {
    const q = query(
        collection(db, "availabilities"), 
        where("teacherId", "==", teacherId), 
        where("startTime", ">", Timestamp.now()),
        orderBy("startTime", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Availability));
};

export const getAllAvailabilities = async (): Promise<Availability[]> => {
    const q = query(
        collection(db, "availabilities"), 
        where("startTime", ">", Timestamp.now()),
        orderBy("startTime", "asc")
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.filter(doc => doc.exists()).map(doc => ({ id: doc.id, ...doc.data() } as Availability));
};

export const deleteAvailability = async (availabilityId: string): Promise<void> => {
    const availRef = doc(db, "availabilities", availabilityId);
    await deleteDoc(availRef);
};


// Notification Functions
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
    const q = query(collection(db, "notifications"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
};