// functions/api/cron-handler.ts
/**
 * This is a Cloudflare Pages Function designed to be triggered by a cron job.
 * Its purpose is to check for upcoming bookings and send reminder notifications.
 * 
 * SETUP:
 * 1. In your Cloudflare Pages project settings, go to "Functions".
 * 2. Under "Cron Triggers", add a new trigger.
 * 3. Set the schedule (e.g., `0 * * * *` to run every hour).
 * 4. The URL to trigger will be `https://your-project.pages.dev/api/cron-handler`
 * 
 * This function requires the same Firebase environment variables as the main application.
 * Note: For production, using the Firebase Admin SDK in a dedicated backend environment
 * is recommended for security and to bypass client-side security rules. This example
 * uses the client-side SDK for simplicity and compatibility with the existing setup.
 */

import { initializeApp, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch,
  Timestamp,
  doc,
  addDoc
} from 'firebase/firestore';

interface Env {
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_MEASUREMENT_ID: string;
}

// Global scope to avoid re-initialization on every call in the same worker instance
let firebaseApp: FirebaseApp;
let db: any;

const initializeFirebaseInWorker = (env: Env) => {
    if (firebaseApp) return; // Already initialized

    const firebaseConfig = {
        apiKey: env.FIREBASE_API_KEY,
        authDomain: env.FIREBASE_AUTH_DOMAIN,
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
        appId: env.FIREBASE_APP_ID,
        measurementId: env.FIREBASE_MEASUREMENT_ID,
    };
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
}

export const onRequest: (context: { env: Env }) => Promise<Response> = async ({ env }) => {
    try {
        initializeFirebaseInWorker(env);

        const now = Timestamp.now();
        const twentyFourHoursFromNow = new Timestamp(now.seconds + 24 * 60 * 60, now.nanoseconds);

        const bookingsRef = collection(db, 'bookings');
        const q = query(bookingsRef, 
            where('status', '==', 'confirmed'),
            where('reminderSent', '==', false),
            where('startTime', '>=', now),
            where('startTime', '<=', twentyFourHoursFromNow)
        );

        const querySnapshot = await getDocs(q);
        const bookingsToRemind = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        if (bookingsToRemind.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "No upcoming bookings to remind." }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const batch = writeBatch(db);
        let notificationCount = 0;

        for (const booking of bookingsToRemind) {
            const startTime = (booking.startTime as Timestamp).toDate().toLocaleString('ja-JP');
            const studentMessage = `リマインダー: ${booking.courseTitle} の授業が ${startTime} に始まります。`;
            const teacherMessage = `リマインダー: ${booking.studentName}さんとの ${booking.courseTitle} の授業が ${startTime} に始まります。`;
            
            // Notification for student
            const studentNotifRef = doc(collection(db, 'notifications'));
            batch.set(studentNotifRef, {
                userId: booking.studentId,
                message: studentMessage,
                read: false,
                createdAt: Timestamp.now(),
                link: `/my-portal`
            });

            // Notification for teacher
            const teacherNotifRef = doc(collection(db, 'notifications'));
            batch.set(teacherNotifRef, {
                userId: booking.teacherId,
                message: teacherMessage,
                read: false,
                createdAt: Timestamp.now(),
                link: `/teacher-dashboard`
            });

            // Mark booking as reminder sent
            const bookingRef = doc(db, 'bookings', booking.id);
            batch.update(bookingRef, { reminderSent: true });

            notificationCount += 2;
        }

        await batch.commit();

        return new Response(JSON.stringify({ success: true, notificationsSent: notificationCount, bookingsUpdated: bookingsToRemind.length }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("Cron handler failed:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
