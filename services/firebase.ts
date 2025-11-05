// FIX: Removed `/// <reference types="vite/client" />` as it was causing a TypeScript error and is not needed because the application uses `process.env` for environment variables.
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// These environment variables are now read from `process.env`.
// The build system (like Vite on Cloudflare) will replace these with your secrets.
// You no longer need the `VITE_` prefix in your Cloudflare settings.
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

if (!firebaseConfig.apiKey) {
  console.error("Firebase API Key is missing. Make sure FIREBASE_API_KEY is set in your environment variables.");
}


// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
