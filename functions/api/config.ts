
interface Env {
  API_KEY: string;
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
        apiKey: env.API_KEY || '',
        firebase: {
            apiKey: env.FIREBASE_API_KEY || '',
            authDomain: env.FIREBASE_AUTH_DOMAIN || '',
            projectId: env.FIREBASE_PROJECT_ID || '',
            storageBucket: env.FIREBASE_STORAGE_BUCKET || '',
            messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID || '',
            appId: env.FIREBASE_APP_ID || '',
            measurementId: env.FIREBASE_MEASUREMENT_ID || '',
        }
    };

    return new Response(JSON.stringify(config), {
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
        },
    });
};
