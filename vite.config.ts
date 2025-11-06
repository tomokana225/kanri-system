import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Expose environment variables to the client
    'process.env': {
      'API_KEY': JSON.stringify(process.env.API_KEY || ''),
      // FIX: Provide a fallback to an empty string for all environment variables.
      // This ensures that if a variable is not set during the build, it becomes an empty string
      // in the client code, rather than the string "undefined". This allows our configuration
      // check in `firebase.ts` to correctly detect missing variables and show the user a
      // helpful error message instead of crashing with a cryptic Firebase error.
      'FIREBASE_API_KEY': JSON.stringify(process.env.FIREBASE_API_KEY || ''),
      'FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN || ''),
      'FIREBASE_PROJECT_ID': JSON.stringify(process.env.FIREBASE_PROJECT_ID || ''),
      'FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.FIREBASE_STORAGE_BUCKET || ''),
      'FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.FIREBASE_MESSAGING_SENDER_ID || ''),
      'FIREBASE_APP_ID': JSON.stringify(process.env.FIREBASE_APP_ID || ''),
      'FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.FIREBASE_MEASUREMENT_ID || ''),
    }
  }
})