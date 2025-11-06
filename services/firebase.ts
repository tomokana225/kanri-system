import { initializeApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  writeBatch,
  Timestamp,
  orderBy
} from 'firebase/firestore';
import { getConfig } from './config';
import { User, Course, Notification, Booking } from '../types';

interface FirebaseServices {
  auth: Auth;
  db: Firestore;
}

let firebaseInitializationPromise: Promise<FirebaseServices> | null = null;

export const initializeFirebase = (): Promise<FirebaseServices> => {
    if (firebaseInitializationPromise) {
        return firebaseInitializationPromise;
    }

    firebaseInitializationPromise = (async () => {
        try {
            const config = await getConfig();
            if (!config.firebase) {
                throw new Error("Firebaseの構成が設定ファイルに見つかりません。");
            }
            const app = initializeApp(config.firebase);
            const auth = getAuth(app);
            const db = getFirestore(app);
            return { auth, db };
        } catch (e: any) {
            console.error("Firebase initialization error:", e);
            throw new Error(e.message || `Firebaseの初期化に失敗しました。`);
        }
    })();

    return firebaseInitializationPromise;
};


// ユーザープロファイル取得
export const getUserProfile = async (uid: string): Promise<User | null> => {
  const { db } = await initializeFirebase();
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    return userDocSnap.data() as User;
  }
  return null;
};

// 新規サインアップ時にユーザープロファイル作成
export const createUserProfile = async (uid: string, data: Omit<User, 'id'>) => {
  const { db } = await initializeFirebase();
  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, { id: uid, ...data });
};

// 全ユーザー取得 (管理者用)
export const getUsers = async (): Promise<User[]> => {
    const { db } = await initializeFirebase();
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(doc => doc.data() as User);
}

// ユーザー追加 (管理者用)
export const addUser = async (userData: Omit<User, 'id'>): Promise<void> => {
    const { db } = await initializeFirebase();
    const tempId = userData.email.replace(/[^a-zA-Z0-9]/g, '');
    const userRef = doc(db, 'users', tempId);
    if ((await getDoc(userRef)).exists()) {
        throw new Error("このメールアドレスは既に使用されています。");
    }
    await setDoc(userRef, { ...userData, id: tempId });
};


// 学生のコース取得
export const getStudentCourses = async (studentId: string): Promise<Course[]> => {
    const { db } = await initializeFirebase();
    const q = query(collection(db, "courses"), where("studentIds", "array-contains", studentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
}

// 教師のコース取得
export const getTeacherCourses = async (teacherId: string): Promise<Course[]> => {
    const { db } = await initializeFirebase();
    const q = query(collection(db, "courses"), where("teacherId", "==", teacherId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
}

// 教師の予約取得
export const getTeacherBookings = async (teacherId: string): Promise<Booking[]> => {
    const { db } = await initializeFirebase();
    const q = query(collection(db, "bookings"), where("teacherId", "==", teacherId), orderBy("startTime", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
}

// ユーザーの通知取得
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
    const { db } = await initializeFirebase();
    const q = query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
}


// デモデータ投入
export const seedDatabase = async () => {
    const { db } = await initializeFirebase();
    const batch = writeBatch(db);

    const users: User[] = [
        { id: 'student-demo', name: 'デモ学生', email: 'student-demo@test.com', role: 'student' },
        { id: 'teacher-demo', name: 'デモ先生', email: 'teacher-demo@test.com', role: 'teacher' },
        { id: 'admin-demo', name: 'デモ管理者', email: 'admin-demo@test.com', role: 'admin' },
    ];
    users.forEach(user => {
        const userRef = doc(db, "users", user.id);
        batch.set(userRef, user);
    });

    const courses: Omit<Course, 'id'>[] = [
        { title: 'AI入門', description: 'AIの基礎を学ぶ', teacherId: 'teacher-demo', teacherName: 'デモ先生', studentIds: ['student-demo'] },
        { title: '高度なReact', description: 'Reactの応用技術を学ぶ', teacherId: 'teacher-demo', teacherName: 'デモ先生', studentIds: ['student-demo'] },
    ];
    courses.forEach((course, index) => {
        const courseRef = doc(db, "courses", `course-demo-${index + 1}`);
        batch.set(courseRef, course);
    });
    
    const bookings: Omit<Booking, 'id'>[] = [
        { studentId: 'student-demo', studentName: 'デモ学生', teacherId: 'teacher-demo', startTime: Timestamp.fromDate(new Date(Date.now() + 24 * 3600 * 1000)), endTime: Timestamp.fromDate(new Date(Date.now() + 25 * 3600 * 1000)), status: 'confirmed', courseTitle: 'AI入門' }
    ];
    bookings.forEach((booking, index) => {
        const bookingRef = doc(db, "bookings", `booking-demo-${index + 1}`);
        batch.set(bookingRef, booking);
    });

    const notifications: Omit<Notification, 'id'>[] = [
        { userId: 'student-demo', message: '「AI入門」の課題提出期限は明日です。', read: false, createdAt: Timestamp.now() },
        { userId: 'teacher-demo', message: 'デモ学生さんとの面談が明日予定されています。', read: false, createdAt: Timestamp.now() },
    ];
    notifications.forEach((notification, index) => {
        const notifRef = doc(db, "notifications", `notif-demo-${index + 1}`);
        batch.set(notifRef, notification);
    });

    await batch.commit();
}
