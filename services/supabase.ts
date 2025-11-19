import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config';

let supabase: SupabaseClient | null = null;

export const getSupabase = async (): Promise<SupabaseClient> => {
    if (supabase) return supabase;

    const config = await getConfig();
    if (!config.supabase || !config.supabase.url || !config.supabase.anonKey) {
        throw new Error('Supabaseの設定が見つかりません。環境変数 SUPABASE_URL と SUPABASE_ANON_KEY を設定してください。');
    }

    supabase = createClient(config.supabase.url, config.supabase.anonKey);
    return supabase;
};

export const uploadFileToSupabase = async (file: File): Promise<string> => {
    const client = await getSupabase();
    
    // Sanitize file name to avoid issues
    const timestamp = Date.now();
    // Only keep alphanumeric, dots, and dashes
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const filePath = `${timestamp}_${cleanFileName}`;
    const bucketName = 'chat-files';

    // Upload file
    const { error } = await client.storage
        .from(bucketName)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Supabase Upload Error:', error);
        throw new Error(`アップロード失敗: ${error.message}`);
    }

    // Get Public URL
    const { data: { publicUrl } } = client.storage
        .from(bucketName)
        .getPublicUrl(filePath);

    return publicUrl;
};