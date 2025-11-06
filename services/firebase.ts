// FIX: Added a triple-slash directive to include Vite's client types, which are necessary for `import.meta.env` to be recognized by TypeScript.
/// <reference types="vite/client" />

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// In a Vite project, environment variables prefixed with VITE_ are exposed to the client.
const firebaseConfig = {
  // FIX: Switched back to import.meta.env, which is the standard and secure way to
  // handle client-side environment variables in Vite. The tsconfig.json has been
  // updated to include "vite/client" types to resolve any TypeScript errors.
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
