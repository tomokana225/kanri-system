import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getConfig } from './config';

let supabase: SupabaseClient | null = null;

export const getSupabase = async (): Promise<SupabaseClient> => {
    if (supabase) return supabase;

    const config = await getConfig();
    // 設定が存在しない、またはモックデータ（開発用ダミー）のままの場合はエラーにする
    if (!config.supabase || !config.supabase.url || !config.supabase.anonKey || config.supabase.url.includes('mock-supabase')) {
        throw new Error('Supabaseが正しく設定されていません。Cloudflare Pagesの環境変数 SUPABASE_URL と SUPABASE_ANON_KEY を設定してください。');
    }

    supabase = createClient(config.supabase.url, config.supabase.anonKey);
    return supabase;
};

/**
 * クライアントサイドで画像を圧縮・リサイズするヘルパー関数
 * 長辺を最大1920px、JPEG品質0.7に圧縮します。
 */
const compressImage = async (file: File): Promise<File> => {
    // 画像以外はそのまま返す
    if (!file.type.startsWith('image/')) {
        return file;
    }
    
    // 1MB以下の小さい画像は圧縮しない
    if (file.size < 1024 * 1024) {
        return file;
    }

    return new Promise((resolve) => {
        const img = new Image();
        // メモリ効率の良い createObjectURL を使用
        const objectUrl = URL.createObjectURL(file);
        
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            
            const MAX_WIDTH = 1920;
            const MAX_HEIGHT = 1920;
            let width = img.width;
            let height = img.height;
            
            // アスペクト比を維持してリサイズサイズを計算
            if (width > height) {
                if (width > MAX_WIDTH) {
                    height = Math.round(height * (MAX_WIDTH / width));
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width = Math.round(width * (MAX_HEIGHT / height));
                    height = MAX_HEIGHT;
                }
            }
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(file); // 失敗した場合は元のファイルを返す
                return;
            }
            
            // 画像を描画
            ctx.drawImage(img, 0, 0, width, height);
            
            // JPEGとして圧縮（品質0.7）
            canvas.toBlob((blob) => {
                if (!blob) {
                    resolve(file);
                    return;
                }
                // 拡張子を.jpgに統一
                const newName = file.name.replace(/\.[^/.]+$/, "") + ".jpg";
                const compressedFile = new File([blob], newName, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                });
                console.log(`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
                resolve(compressedFile);
            }, 'image/jpeg', 0.7);
        };
        
        img.onerror = (error) => {
            URL.revokeObjectURL(objectUrl);
            console.error("Image compression error:", error);
            resolve(file); // エラー時は元のファイルを返す
        };
        
        img.src = objectUrl;
    });
};

export const uploadFileToSupabase = async (
  file: File, 
  onStatusChange?: (status: string, progress: number) => void
): Promise<string> => {
    const client = await getSupabase();
    
    if (onStatusChange) onStatusChange('準備中...', 5);

    // 画像の場合は圧縮処理を試みる
    let fileToUpload = file;
    if (file.type.startsWith('image/')) {
        if (onStatusChange) {
            onStatusChange('画像の圧縮中...', 15);
            // UI描画のために少し待つ
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        try {
            fileToUpload = await compressImage(file);
        } catch (e) {
            console.error("Compression logic failed unexpectedly", e);
        }
    }

    if (onStatusChange) onStatusChange('サーバーへアップロード中...', 40);

    // ファイル名のサニタイズ（日本語ファイル名などのトラブル防止）
    const timestamp = Date.now();
    const cleanFileName = fileToUpload.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    // フォルダを作らずルートに保存することで、ポリシー設定をシンプルにします
    const filePath = `${timestamp}_${cleanFileName}`;
    const bucketName = 'chat-files';

    // ファイルをアップロード
    const { error } = await client.storage
        .from(bucketName)
        .upload(filePath, fileToUpload, {
            cacheControl: '3600',
            upsert: false
        });

    if (error) {
        console.error('Supabase Upload Error:', error);
        throw new Error(`アップロード失敗: ${error.message}`);
    }
    
    if (onStatusChange) onStatusChange('完了処理中...', 90);

    // 公開URLを取得（バケットがPublic設定である必要があります）
    const { data: { publicUrl } } = client.storage
        .from(bucketName)
        .getPublicUrl(filePath);

    if (onStatusChange) onStatusChange('完了', 100);

    return publicUrl;
};

export const deleteFileFromSupabase = async (publicUrl: string): Promise<void> => {
    const client = await getSupabase();
    const bucketName = 'chat-files';

    // URLからファイルパスを抽出する
    // 例: https://.../storage/v1/object/public/chat-files/TIMESTAMP_FILENAME
    // バケット名直後のパスを取得する必要がある
    const urlParts = publicUrl.split(`/${bucketName}/`);
    if (urlParts.length < 2) {
        console.warn('Invalid Supabase URL format, skipping file deletion:', publicUrl);
        return;
    }
    
    // URLデコードして正しいファイル名を取得
    const filePath = decodeURIComponent(urlParts[1]);

    const { error } = await client.storage
        .from(bucketName)
        .remove([filePath]);

    if (error) {
        console.error('Supabase File Deletion Error:', error);
        throw new Error(`ファイル削除失敗: ${error.message}`);
    }
};