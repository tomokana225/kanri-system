
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

    const requiredEnvVars: (keyof Env)[] = [
        'FIREBASE_API_KEY',
        'FIREBASE_AUTH_DOMAIN',
        'FIREBASE_PROJECT_ID',
        'FIREBASE_STORAGE_BUCKET',
        'FIREBASE_MESSAGING_SENDER_ID',
        'FIREBASE_APP_ID',
        'FIREBASE_MEASUREMENT_ID'
    ];

    const missingVars = requiredEnvVars.filter(varName => !env[varName] || env[varName] === '');

    if (missingVars.length > 0) {
        const errorResponse = {
            error: "サーバー側の設定エラー",
            message: `以下の環境変数がCloudflare Pagesで設定されていません: ${missingVars.join(', ')}`,
        };
        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        });
    }


    const config = {
        firebase: {
            apiKey: env.FIREBASE_API_KEY,
            authDomain: env.FIREBASE_AUTH_DOMAIN,
            projectId: env.FIREBASE_PROJECT_ID,
            storageBucket: env.FIREBASE_STORAGE_BUCKET,
            messagingSenderId: env.FIREBASE_MESSAGING_SENDER_ID,
            appId: env.FIREBASE_APP_ID,
            measurementId: env.FIREBASE_MEASUREMENT_ID,
        }
    };

    return new Response(JSON.stringify(config), {
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
        },
    });
};
