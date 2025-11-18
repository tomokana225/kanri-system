
interface Env {
  FIREBASE_API_KEY: string;
  FIREBASE_AUTH_DOMAIN: string;
  FIREBASE_PROJECT_ID: string;
  FIREBASE_STORAGE_BUCKET: string;
  FIREBASE_MESSAGING_SENDER_ID: string;
  FIREBASE_APP_ID: string;
  FIREBASE_MEASUREMENT_ID: string;
}

interface PagesFunctionContext {
    env: Env;
}

export const onRequest: (context: PagesFunctionContext) => Response | Promise<Response> = (context) => {
    const { env } = context;

    const config = {
        apiKey: env.FIREBASE_API_KEY,
        authDomain: env.FIREBASE_AUTH_DOMAIN,
        projectId: env.FIREBASE_PROJECT_ID,
        storageBucket: env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
        appId: env.FIREBASE_APP_ID,
        measurementId: env.FIREBASE_MEASUREMENT_ID,
    };
    
    // Check if all config values are present
    const isConfigured = Object.values(config).every(val => val && typeof val === 'string');

    if (!isConfigured) {
        // Return an empty script with an error to avoid breaking the service worker
        console.error("Firebase config for SW is incomplete. Check environment variables.");
        const errorScript = `console.error('Firebase Service Worker config is missing.');`;
        return new Response(errorScript, {
            status: 500,
            headers: { 'Content-Type': 'application/javascript;charset=UTF-8' },
        });
    }

    const script = `const firebaseConfig = ${JSON.stringify(config)};`;

    return new Response(script, {
        headers: {
            'Content-Type': 'application/javascript;charset=UTF-8',
        },
    });
};
