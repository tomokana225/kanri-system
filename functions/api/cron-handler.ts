// functions/api/cron-handler.ts
/**
 * This is a Cloudflare Pages Function designed to be triggered by a cron job.
 * It checks for upcoming bookings and sends reminder notifications based on user settings.
 */

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
        const nowMillis = now.toMillis();
        
        // Look ahead 25 hours to catch "1 day before" reminders plus a buffer
        // This allows us to fetch relevant bookings and process their offsets in memory
        const twentyFiveHoursFromNow = new firebase.firestore.Timestamp(now.seconds + 25 * 60 * 60, now.nanoseconds);

        const bookingsRef = db.collection('bookings');
        const q = bookingsRef
            .where('status', '==', 'confirmed')
            .where('startTime', '>=', now)
            .where('startTime', '<=', twentyFiveHoursFromNow);

        const querySnapshot = await q.get();
        const bookings = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Booking));

        if (bookings.length === 0) {
            return new Response(JSON.stringify({ success: true, message: "No upcoming bookings to check." }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        const batch = db.batch();
        let notificationCount = 0;
        let bookingsUpdatedCount = 0;

        for (const booking of bookings) {
            const startMillis = booking.startTime.toMillis();
            const minutesUntilStart = (startMillis - nowMillis) / (1000 * 60);
            
            let shouldUpdate = false;
            let offsetsToSend: number[] = [];

            // Check Legacy Logic (if no settings present)
            if (!booking.reminderSettings) {
                // Default legacy behavior: send if ~24h before and not sent yet
                const isWithin24h = minutesUntilStart <= 1440;
                if (isWithin24h && !booking.reminderSent) {
                    offsetsToSend.push(1440); // Treat as 24h reminder
                }
            } else {
                // New Logic with flexible settings
                const settings = booking.reminderSettings;
                const sentOffsets = settings.sentOffsets || [];
                
                for (const offset of settings.offsets) {
                    // Trigger if we are passed the offset time (e.g. 60 mins before start)
                    // and we haven't sent it yet.
                    if (minutesUntilStart <= offset && !sentOffsets.includes(offset)) {
                        offsetsToSend.push(offset);
                    }
                }
            }

            if (offsetsToSend.length > 0) {
                const startTimeStr = booking.startTime.toDate().toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                
                // Send notifications
                const studentMessage = `リマインダー: ${booking.courseTitle} の授業がまもなく始まります (${startTimeStr})。`;
                const teacherMessage = `リマインダー: ${booking.studentName}さんとの ${booking.courseTitle} の授業がまもなく始まります (${startTimeStr})。`;
                
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
                
                notificationCount += 2;
                shouldUpdate = true;

                // Prepare update data
                const bookingDocRef = db.collection('bookings').doc(booking.id);
                if (!booking.reminderSettings) {
                    // Legacy update
                    batch.update(bookingDocRef, { reminderSent: true });
                } else {
                    // New update
                    const updatedSentOffsets = [...(booking.reminderSettings.sentOffsets || []), ...offsetsToSend];
                    // Remove duplicates just in case
                    const uniqueSentOffsets = [...new Set(updatedSentOffsets)];
                    
                    batch.update(bookingDocRef, {
                        'reminderSettings.sentOffsets': uniqueSentOffsets
                    });
                }
            }
            
            if (shouldUpdate) bookingsUpdatedCount++;
        }

        if (notificationCount > 0) {
            await batch.commit();
        }

        return new Response(JSON.stringify({ 
            success: true, 
            notificationsSent: notificationCount, 
            bookingsChecked: bookings.length,
            bookingsUpdated: bookingsUpdatedCount 
        }), {
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