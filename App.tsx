import React, { useState, useEffect } from 'react';
import { auth, firebaseError, getUserProfile } from './services/firebase';
import { User } from './types';
import Login from './components/Login';
import Header from './components/Header';
import StudentPortal from './components/StudentPortal';
import TeacherPortal from './components/TeacherPortal';
import AdminPortal from './components/AdminPortal';
import Spinner from './components/Spinner';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentFirebaseError, setFirebaseError] = useState<string | null>(firebaseError);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    // 同期的な初期化エラーが既に存在する場合は、ここで処理を停止
    if (firebaseError) {
      setLoading(false);
      return;
    }

    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        try {
          if (firebaseUser) {
            const userProfile = await getUserProfile(firebaseUser.uid);
            if (userProfile) {
              setUser(userProfile);
            } else {
              console.error("Firestoreにユーザープロファイルが見つかりません:", firebaseUser.uid);
              setUser({
                id: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '新規ユーザー',
                email: firebaseUser.email || '',
                role: 'student'
              });
            }
          } else {
            setUser(null);
          }
        } catch (error: any) {
          console.error("Firebase Auth State Error:", error);
          if (error.code === 'auth/network-request-failed' || error.code === 'auth/api-key-not-valid') {
              setRuntimeError("Firebase APIキーが無効か、ネットワークに問題があります。設定を確認してください。");
          } else {
              setRuntimeError("ユーザー情報の取得中に予期せぬエラーが発生しました。");
          }
        } finally {
          setLoading(false);
        }
      });

      return () => unsubscribe();
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  const finalError = currentFirebaseError || runtimeError;

  if (finalError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-2xl p-8 space-y-4 bg-white rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold text-red-600">アプリケーション設定エラー</h1>
            <p className="text-gray-700">{finalError}</p>
            <div className="text-left bg-gray-50 p-6 rounded-md text-sm text-gray-600">
              <p className="font-semibold mb-2 text-base">修正方法:</p>
              <p className="mb-2">このエラーは、アプリケーションの実行に必要な設定（APIキーなど）が不足しているか、無効な場合に発生します。</p>
              
              <h4 className="font-semibold mt-4 mb-2">ローカル開発環境の場合:</h4>
              <p>1. プロジェクトの `public` フォルダにある `.env.example` ファイルをコピーして、`.env` という名前の新しいファイルを作成します。</p>
              <p>2. `.env` ファイルを開き、あなたのFirebaseプロジェクトとGemini APIのキーを正しく設定してください。</p>
              <p>3. 変更を保存した後、開発サーバーを再起動してください。</p>

              <h4 className="font-semibold mt-4 mb-2">デプロイ環境（本番環境）の場合:</h4>
              <p>1. ご利用のホスティングプロバイダー（例: Cloudflare Pages, Vercel）のダッシュボードに移動します。</p>
              <p>2. このプロジェクトの「環境変数」または「シークレットキー」の設定を探します。</p>
              <p>3. 以下の変数がFirebaseプロジェクトの正しい値で設定されていることを確認してください:</p>
              <pre className="mt-3 p-3 bg-gray-200 rounded text-xs overflow-x-auto">
                {`API_KEY\nFIREBASE_API_KEY\nFIREBASE_AUTH_DOMAIN\nFIREBASE_PROJECT_ID\nFIREBASE_STORAGE_BUCKET\nFIREBASE_MESSAGING_SENDER_ID\nFIREBASE_APP_ID\nFIREBASE_MEASUREMENT_ID`}
              </pre>
              <p className="mt-3">4. 変数を追加または更新した後、アプリケーションを再デプロイしてください。</p>
            </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {user ? (
        <>
          <Header user={user} onLogout={handleLogout} />
          <main className="p-4 md:p-8">
            {user.role === 'student' && <StudentPortal user={user} />}
            {user.role === 'teacher' && <TeacherPortal user={user} />}
            {user.role === 'admin' && <AdminPortal />}
          </main>
        </>
      ) : (
        <Login />
      )}
    </div>
  );
};

export default App;