
export interface AppConfig {
    apiKey: string;
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
        const response = await fetch('/api/config');
        if (!response.ok) {
            const errorText = await response.text();
            console.error("設定APIからのエラー:", errorText);
            throw new Error('アプリケーション設定の読み込みに失敗しました。サーバー側のログを確認してください。');
        }

        const config = await response.json();
        
        const firebaseConfig = config.firebase || {};
        const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);

        if (!isFirebaseConfigured || !config.apiKey) {
             throw new Error("設定情報が不完全です。Cloudflare Pagesの環境変数がすべて設定されているか確認してください。");
        }
        return config as AppConfig;
    })();

    return configPromise;
};
