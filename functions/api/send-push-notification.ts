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
  // New environment variables for Service Account
  FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL: string;
  FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: string;
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

/**
 * Creates a JWT and exchanges it for a Google OAuth2 access token.
 * This is required for the FCM v1 API.
 */
async function getAccessToken(clientEmail: string, privateKey: string): Promise<string> {
    // 1. Prepare the private key for the Web Crypto API
    const key = privateKey.replace(/\\n/g, '\n');
    const pemHeader = '-----BEGIN PRIVATE KEY-----';
    const pemFooter = '-----END PRIVATE KEY-----';
    const pemContents = key.substring(pemHeader.length, key.length - pemFooter.length).replace(/\s/g, '');
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));

    const importedKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryDer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    // 2. Create the JWT
    const header = { alg: 'RS256', typ: 'JWT' };
    const iat = Math.floor(Date.now() / 1000);
    const exp = iat + 3600; // Expires in 1 hour
    const payload = {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp: exp,
        iat: iat
    };
    
    const base64UrlEncode = (str: string) => btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const toSign = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(payload))}`;
    
    const textEncoder = new TextEncoder();
    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        importedKey,
        textEncoder.encode(toSign)
    );
    
    const jwt = `${toSign}.${base64UrlEncode(String.fromCharCode(...new Uint8Array(signature)))}`;

    // 3. Exchange JWT for an access token
    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
    });

    const tokenData = await response.json() as { access_token?: string, error?: any };
    if (!response.ok || !tokenData.access_token) {
        throw new Error(`アクセストークンの取得に失敗しました: ${JSON.stringify(tokenData.error || tokenData)}`);
    }
    return tokenData.access_token;
}


interface PushNotificationRequestBody {
  userId: string;
  title: string;
  body: string;
}

export const onRequestPost: (context: { request: Request, env: Env }) => Promise<Response> = async ({ request, env }) => {
    try {
        initializeFirebaseInWorker(env);
        
        if (!env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL || !env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY) {
            const availableVars = Object.keys(env).filter(key => key.startsWith('FIREBASE_')).join(', ') || '見つかりません';
            const errorMessage = `Firebaseサービスアカウントが設定されていません。FCM v1 APIにはサービスアカウント認証が必要です。

**デバッグ情報:**
現在サーバーで認識されているFirebase関連の環境変数:
[${availableVars}]

**確認事項:**
- 'FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL' と 'FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY' の名前が正しいか確認してください。
- Cloudflare Pagesで変数を設定した後、プロジェクトを再デプロイしましたか？

**設定手順:**
1. Google Cloud Consoleであなたのプロジェクトにアクセスします。
2. 「IAMと管理」>「サービスアカウント」に移動します。
3. 「+ サービスアカウントを作成」をクリックします。
4. 名前（例: "firebase-push-sender"）を付け、「作成して続行」をクリックします。
5. ロールとして「Firebase Cloud Messaging API 管理者」を付与し、「続行」>「完了」をクリックします。
6. 作成したサービスアカウントのアクション（⋮）メニューから「鍵を管理」を選択します。
7. 「鍵を追加」>「新しい鍵を作成」を選択し、「JSON」を選んで「作成」をクリックします。JSONファイルがダウンロードされます。
8. JSONファイルを開き、'client_email' と 'private_key' の値を見つけます。
9. Cloudflare Pagesプロジェクト設定の「環境変数」で、以下の2つの変数を追加します:
   - FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL: 'client_email' の値を貼り付けます。
   - FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY: 'private_key' の値全体（"-----BEGIN..." と "-----END..." の行を含む）を貼り付けます。

変数を設定した後、変更を適用するためにアプリケーションを再デプロイしてください。`;
            throw new Error(errorMessage);
        }

        const { userId, title, body } = await request.json() as PushNotificationRequestBody;

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
        
        const accessToken = await getAccessToken(env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL, env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY);
        const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`;
        
        const sendPromises = tokens.map(token => {
            const fcmPayload = {
                message: {
                    token: token,
                    notification: { title, body },
                },
            };
            return fetch(fcmEndpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(fcmPayload),
            });
        });

        const results = await Promise.allSettled(sendPromises);
        let successCount = 0;
        let failureCount = 0;
        
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value.ok) {
                successCount++;
            } else {
                failureCount++;
                console.error('FCM送信失敗:', result.status === 'rejected' ? result.reason : 'API error');
            }
        });

        return new Response(JSON.stringify({ 
            success: true, 
            fcmResult: {
                success: successCount,
                failure: failureCount
            } 
        }), {
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

// Handle all HTTP methods, but only POST is implemented
export const onRequest = onRequestPost;