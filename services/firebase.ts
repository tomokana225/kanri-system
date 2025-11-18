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
    const q = db.collection('availabilities').where('teacherId', '==', teacherId);
    const querySnapshot = await q.get();
    const allAvailabilities = querySnapshot.docs.map((doc: firebase.firestore.QueryDocumentSnapshot) => docToObject<Availability>(doc));

    if (fetchAll) {
      return all