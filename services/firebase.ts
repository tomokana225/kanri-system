import { initializeApp, FirebaseApp } from 'firebase/app';
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
import { User, Course, Notification, Booking } from '../types';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseError: string | null = null;

const isConfigured = Object.values(firebaseConfig).every(Boolean);

if (isConfigured) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e: any) {
    console.error("Firebase initialization error:", e);
    firebaseError = `Firebaseの初期化に失敗しました。設定を確認してください。エラー: ${e.message}`;
  }
} else {
  firebaseError = "Firebaseの設定が不完全です。すべてのFIREBASE_で始まる環境変数が設定されているか確認してください。";
  console.error(firebaseError);
}

// ユーザープロファイル取得
export const getUserProfile = async (uid: string): Promise<User | null> => {
  if (!db) return null;
  const userDocRef = doc(db, 'users', uid);
  const userDocSnap = await getDoc(userDocRef);
  if (userDocSnap.exists()) {
    return userDocSnap.data() as User;
  }
  return null;
};

// 新規サインアップ時にユーザープロファイル作成
export const createUserProfile = async (uid: string, data: Omit<User, 'id'>) => {
  if (!db) throw new Error("Firestore is not initialized.");
  const userDocRef = doc(db, 'users', uid);
  await setDoc(userDocRef, { id: uid, ...data });
};

// 全ユーザー取得 (管理者用)
export const getUsers = async (): Promise<User[]> => {
    if (!db) return [];
    const usersCollection = collection(db, 'users');
    const snapshot = await getDocs(usersCollection);
    return snapshot.docs.map(doc => doc.data() as User);
}

// ユーザー追加 (管理者用)
export const addUser = async (userData: Omit<User, 'id'>): Promise<void> => {
    if (!db) throw new Error("Firestore is not initialized.");
    // emailでUIDを擬似的に生成（本番ではAuthと連携）
    const tempId = userData.email.replace(/[^a-zA-Z0-9]/g, '');
    const userRef = doc(db, 'users', tempId);
    if ((await getDoc(userRef)).exists()) {
        throw new Error("このメールアドレスは既に使用されています。");
    }
    await setDoc(userRef, { ...userData, id: tempId });
};


// 学生のコース取得
export const getStudentCourses = async (studentId: string): Promise<Course[]> => {
    if (!db) return [];
    const q = query(collection(db, "courses"), where("studentIds", "array-contains", studentId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
}

// 教師のコース取得
export const getTeacherCourses = async (teacherId: string): Promise<Course[]> => {
    if (!db) return [];
    const q = query(collection(db, "courses"), where("teacherId", "==", teacherId));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Course));
}

// 教師の予約取得
export const getTeacherBookings = async (teacherId: string): Promise<Booking[]> => {
    if (!db) return [];
    const q = query(collection(db, "bookings"), where("teacherId", "==", teacherId), orderBy("startTime", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
}

// ユーザーの通知取得
export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
    if (!db) return [];
    const q = query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
}


// デモデータ投入
export const seedDatabase = async () => {
    if (!db) throw new Error("Firestore is not initialized.");
    const firestore = db; // Use a local const for type inference
    const batch = writeBatch(firestore);

    // デモユーザー
    const users: User[] = [
        { id: 'student-demo', name: 'デモ学生', email: 'student-demo@test.com', role: 'student' },
        { id: 'teacher-demo', name: 'デモ先生', email: 'teacher-demo@test.com', role: 'teacher' },
        { id: 'admin-demo', name: 'デモ管理者', email: 'admin-demo@test.com', role: 'admin' },
    ];
    users.forEach(user => {
        const userRef = doc(firestore, "users", user.id);
        batch.set(userRef, user);
    });

    // デモコース
    const courses: Omit<Course, 'id'>[] = [
        { title: 'AI入門', description: 'AIの基礎を学ぶ', teacherId: 'teacher-demo', teacherName: 'デモ先生', studentIds: ['student-demo'] },
        { title: '高度なReact', description: 'Reactの応用技術を学ぶ', teacherId: 'teacher-demo', teacherName: 'デモ先生', studentIds: ['student-demo'] },
    ];
    courses.forEach((course, index) => {
        const courseRef = doc(firestore, "courses", `course-demo-${index + 1}`);
        batch.set(courseRef, course);
    });
    
    // デモ予約
    const bookings: Omit<Booking, 'id'>[] = [
        { studentId: 'student-demo', studentName: 'デモ学生', teacherId: 'teacher-demo', startTime: Timestamp.fromDate(new Date(Date.now() + 24 * 3600 * 1000)), endTime: Timestamp.fromDate(new Date(Date.now() + 25 * 3600 * 1000)), status: 'confirmed', courseTitle: 'AI入門' }
    ];
    bookings.forEach((booking, index) => {
        const bookingRef = doc(firestore, "bookings", `booking-demo-${index + 1}`);
        batch.set(bookingRef, booking);
    });

    // デモ通知
    const notifications: Omit<Notification, 'id'>[] = [
        { userId: 'student-demo', message: '「AI入門」の課題提出期限は明日です。', read: false, createdAt: Timestamp.now() },
        { userId: 'teacher-demo', message: 'デモ学生さんとの面談が明日予定されています。', read: false, createdAt: Timestamp.now() },
    ];
    notifications.forEach((notification, index) => {
        const notifRef = doc(firestore, "notifications", `notif-demo-${index + 1}`);
        batch.set(notifRef, notification);
    });

    await batch.commit();
}


export { auth, db, firebaseError };
