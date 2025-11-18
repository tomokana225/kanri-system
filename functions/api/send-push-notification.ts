// functions/api/send-push-notification.ts
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { User } from '../../types';

interface Env {
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_MEASUREMENT_ID: string;
  FIREBASE_SERVER_KEY: string; // Firebaseコンソールから取得したサーバーキー（レガシー）
}

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

export const onRequestPost: (context: { request: Request, env: Env }) => Promise<Response> = async ({ request, env }) => {
    try {
        initializeFirebaseInWorker(env);

        if (!env.FIREBASE_SERVER_KEY || env.FIREBASE_SERVER_KEY.startsWith('MOCK_')) {
            throw new Error('Firebaseサーバーキーがサーバー上で設定されていません。');
        }

        const { userId, title, body } = await request.json();

        if (!userId || !title || !body) {
            return new Response(JSON.stringify({ success: false, error: 'userId, title, または body がありません' }), { status: 400 });
        }

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return new Response(JSON.stringify({ success: false, error: 'ユーザーが見つかりません' }), { status: 404 });
        }

        const user = userDoc.data() as User;
        const tokens = user.fcmTokens;

        if (!tokens || tokens.length === 0) {
            return new Response(JSON.stringify({ success: false, error: 'ユーザーはプッシュ通知用のデバイスを登録していません。' }), { status: 404 });
        }

        const fcmPayload = {
            registration_ids: tokens,
            notification: {
                title: title,
                body: body,
            },
        };

        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Authorization': `key=${env.FIREBASE_SERVER_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(fcmPayload),
        });

        if (!fcmResponse.ok) {
            const errorBody = await fcmResponse.text();
            throw new Error(`FCMリクエストに失敗しました: ${fcmResponse.status} ${errorBody}`);
        }

        const fcmResult = await fcmResponse.json();
        
        console.log('FCM応答:', fcmResult);

        return new Response(JSON.stringify({ success: true, fcmResult }), {
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        console.error("send-push-notification関数でエラーが発生しました:", error);
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
};
