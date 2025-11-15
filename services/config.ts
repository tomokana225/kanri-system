


export interface AppConfig {
    firebase: {
        apiKey: string;
        authDomain: string;
        projectId: string;
        storageBucket: string;
        messagingSenderId: string;
        appId: string;
        measurementId: string;
    };
}

let configPromise: Promise<AppConfig> | null = null;

export const getConfig = (): Promise<AppConfig> => {
    if (configPromise) {
        return configPromise;
    }
    
    configPromise = (async () => {
        try {
            const response = await fetch('/api/config');
            if (!response.ok) {
                const errorText = await response.text();
                // Throw an error to be caught below, falling back to mock config
                throw new Error(`設定APIからのエラー: ${errorText}`);
            }

            const config: any = await response.json();
            
            const firebaseConfig = config.firebase || {};
            const isFirebaseConfigured = Object.values(firebaseConfig).length === 7 && Object.values(firebaseConfig).every(val => typeof val === 'string' && val.length > 0);

            if (!isFirebaseConfigured) {
                 throw new Error("設定情報が不完全です。Cloudflare Pagesの環境変数がすべて設定されているか確認してください。");
            }
            return config as AppConfig;
        } catch (error) {
            // If API fails (e.g., in preview), use mock config to allow the app to run.
            console.warn(`[開発モード] ${error instanceof Error ? error.message : '設定の読み込みに失敗'}. モック設定を使用します。`);
            return {
                firebase: {
                    apiKey: "MOCK_API_KEY",
                    authDomain: "mock-project.firebaseapp.com",
                    projectId: "mock-project",
                    storageBucket: "mock-project.appspot.com",
                    messagingSenderId: "1234567890",
                    appId: "1:1234567890:web:mock123456",
                    measurementId: "G-MOCK12345"
                }
            };
        }
    })();

    return configPromise;
};