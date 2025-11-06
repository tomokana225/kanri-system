import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Expose environment variables to the client
    'process.env': {
      'API_KEY': JSON.stringify(process.env.API_KEY),
      // FIX: Re-added Firebase environment variables to the define block.
      // The recommended `import.meta.env` approach is not working due to a TypeScript
      // configuration issue that prevents `vite/client` types from being found.
      // This change makes the variables available via `process.env` as a workaround.
      'FIREBASE_API_KEY': JSON.stringify(process.env.FIREBASE_API_KEY),
      'FIREBASE_AUTH_DOMAIN': JSON.stringify(process.env.FIREBASE_AUTH_DOMAIN),
      'FIREBASE_PROJECT_ID': JSON.stringify(process.env.FIREBASE_PROJECT_ID),
      'FIREBASE_STORAGE_BUCKET': JSON.stringify(process.env.FIREBASE_STORAGE_BUCKET),
      'FIREBASE_MESSAGING_SENDER_ID': JSON.stringify(process.env.FIREBASE_MESSAGING_SENDER_ID),
      'FIREBASE_APP_ID': JSON.stringify(process.env.FIREBASE_APP_ID),
      'FIREBASE_MEASUREMENT_ID': JSON.stringify(process.env.FIREBASE_MEASUREMENT_ID),
    }
  }
})