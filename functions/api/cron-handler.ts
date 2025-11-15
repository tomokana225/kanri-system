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

// Fix: Use Firebase compat imports to resolve module resolution errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { Booking } from '../../types';


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
let db: firebase.firestore.Firestore;

const initializeFirebaseInWorker = (env: Env) => {
    if (firebase.apps.length > 0) {
        db = firebase.firestore();
        return;
    }

    const firebaseConfig = {
        apiKey: env.FIREBASE_API_KEY,
        authDomain: env.FIREBASE_AUTH_DOMAIN,
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
        appId: env.FIREBASE_APP_ID,
        measurementId: env.FIREBASE_MEASUREMENT_ID,
    };
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
}

export const onRequest: (context: { env: Env }) => Promise<Response> = async ({ env }) => {
    try {
        initializeFirebaseInWorker(env);

        const now = firebase.firestore.Timestamp.now();
        const twentyFourHoursFromNow = new firebase.firestore.Timestamp(now.seconds + 24 * 60 * 60, now.nanoseconds);

        const bookingsRef = db.collection('bookings');
        const q = bookingsRef
            .where('status', '==', 'confirmed')
            .where('reminderSent', '==', false)
            .where('startTime', '>=', now)
            .where('startTime', '<=', twentyFourHoursFromNow);

        const querySnapshot = await q.get();
        const bookingsToRemind = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking));

        if (bookingsToRemind.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "No upcoming bookings to remind." }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const batch = db.batch();
        let notificationCount = 0;

        for (const booking of bookingsToRemind) {
            const startTime = booking.startTime.toDate().toLocaleString('ja-JP');
            const studentMessage = `リマインダー: ${booking.courseTitle} の授業が ${startTime} に始まります。`;
            const teacherMessage = `リマインダー: ${booking.studentName}さんとの ${booking.courseTitle} の授業が ${startTime} に始まります。`;
            
            // Notification for student
            const studentNotifRef = db.collection('notifications').doc();
            batch.set(studentNotifRef, {
                userId: booking.studentId,
                message: studentMessage,
                read: false,
                createdAt: firebase.firestore.Timestamp.now(),
                link: { type: 'booking' }
            });

            // Notification for teacher
            const teacherNotifRef = db.collection('notifications').doc();
            batch.set(teacherNotifRef, {
                userId: booking.teacherId,
                message: teacherMessage,
                read: false,
                createdAt: firebase.firestore.Timestamp.now(),
                link: { type: 'booking' }
            });

            // Mark booking as reminder sent
            const bookingRef = db.collection('bookings').doc(booking.id);
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