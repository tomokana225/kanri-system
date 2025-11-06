import React, { useState, useEffect } from 'react';
import { auth, firebaseError } from './services/firebase';
import { User, UserRole } from './types';
import Login from './components/Login';
import Header from './components/Header';
import StudentPortal from './components/StudentPortal';
import TeacherPortal from './components/TeacherPortal';
import AdminPortal from './components/AdminPortal';
import Spinner from './components/Spinner';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// モック関数：ユーザーの役割を取得します。実際のアプリではFirestoreなどから取得します。
const getUserRole = (email: string | null): UserRole => {
  if (email?.includes('student')) return 'student';
  if (email?.includes('teacher')) return 'teacher';
  if (email?.includes('admin')) return 'admin';
  return 'student'; // デフォルト
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // authが初期化されている場合のみ購読します
    if (auth) {
      const unsubscribe = onAuthStateChanged(auth, firebaseUser => {
        if (firebaseUser) {
          const currentUser: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'ユーザー',
            email: firebaseUser.email || '',
            role: getUserRole(firebaseUser.email)
          };
          setUser(currentUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      // authが初期化されていない場合はローディングを停止します
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    // サインアウトする前にauthが初期化されているか確認します
    if (auth) {
      await signOut(auth);
    }
  };

  // Firebaseの初期化に失敗した場合に設定エラーを表示します
  if (firebaseError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-2xl p-8 space-y-4 bg-white rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold text-red-600">アプリケーション設定エラー</h1>
            <p className="text-gray-700">{firebaseError}</p>
            <div className="text-left bg-gray-50 p-6 rounded-md text-sm text-gray-600">
              <p className="font-semibold mb-2 text-base">修正方法:</p>
              <p className="mb-2">このエラーは通常、Firebaseの環境変数がデプロイ環境で正しく設定されていないことを意味します。</p>
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
            {user.role === 'teacher' && <TeacherPortal />}
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
