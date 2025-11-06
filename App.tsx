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
              // サインアップ直後などでプロファイルがまだない場合、一時的なユーザー情報を設定
              setUser({
                id: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '新規ユーザー',
                email: firebaseUser.email || '',
                role: 'student' // デフォルト
              });
            }
          } else {
            setUser(null);
          }
        } catch (error: any) {
          console.error("Firebase Auth State Error:", error);
          if (error.code === 'auth/network-request-failed' || error.code === 'auth/api-key-not-valid') {
              setFirebaseError("Firebase APIキーが無効か、ネットワークに問題があります。デプロイ環境のシークレットキー設定を確認してください。");
          } else {
              setFirebaseError("ユーザー情報の取得中にエラーが発生しました。");
          }
        } finally {
          setLoading(false);
        }
      });

      return () => unsubscribe();
    } else {
      // authがnullの場合 (設定不備で初期化されなかったケース)
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  if (currentFirebaseError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-2xl p-8 space-y-4 bg-white rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold text-red-600">アプリケーション設定エラー</h1>
            <p className="text-gray-700">{currentFirebaseError}</p>
            <div className="text-left bg-gray-50 p-6 rounded-md text-sm text-gray-600">
              <p className="font-semibold mb-2 text-base">修正方法:</p>
              <p className="mb-2">このエラーは、FirebaseのAPIキーが無効であるか、デプロイ環境で正しく設定されていない場合に発生します。</p>
              <p>1. ご利用のホスティングプロバイダー（例: Cloudflare Pages, Vercel, Netlify）のダッシュボードに移動します。</p>
              <p>2. このプロジェクトの「環境変数」または「シークレットキー」の設定を探します。</p>
              <p>3. 以下の変数がFirebaseプロジェクトの正しい値で設定されていることを確認してください:</p>
              <pre className="mt-3 p-3 bg-gray-200 rounded text-xs overflow-x-auto">
                {`FIREBASE_API_KEY\nFIREBASE_AUTH_DOMAIN\nFIREBASE_PROJECT_ID\nFIREBASE_STORAGE_BUCKET\nFIREBASE_MESSAGING_SENDER_ID\nFIREBASE_APP_ID\nFIREBASE_MEASUREMENT_ID`}
              </pre>
              <p className="mt-3">4. 変数を追加または更新した後、変更を有効にするためにアプリケーションを再デプロイする必要がある場合があります。</p>
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