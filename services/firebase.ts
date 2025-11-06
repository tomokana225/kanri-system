// FIX: The triple-slash directive for "vite/client" was not working due to a project
// configuration issue. Switched to using `process.env` to resolve TypeScript errors.
import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// In a Vite project, environment variables are exposed to the client via vite.config.ts.
const firebaseConfig = {
  // FIX: Switched from `import.meta.env` to `process.env` to align with the `vite.config.ts` define block.
  // This resolves the TypeScript error "Property 'env' does not exist on type 'ImportMeta'".
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

export { auth, db, firebaseError };
