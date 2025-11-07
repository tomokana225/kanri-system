import React, { useState, useEffect } from 'react';
import { initializeFirebase, getUserProfile, createUserProfile } from './services/firebase';
import { User } from './types';
import Login from './components/Login';
import Header from './components/Header';
import StudentPortal from './components/StudentPortal';
import TeacherPortal from './components/TeacherPortal';
import AdminPortal from './components/AdminPortal';
import Spinner from './components/Spinner';
import { onAuthStateChanged, signOut, Auth } from 'firebase/auth';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [authInstance, setAuthInstance] = useState<Auth | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { auth } = await initializeFirebase();
        setAuthInstance(auth);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            const userProfile = await getUserProfile(firebaseUser.uid);
            if (userProfile) {
              setUser(userProfile);
            } else {
              console.log("Firestoreにユーザープロファイルが見つかりません。新規作成します:", firebaseUser.uid);
              const isHardcodedAdmin = firebaseUser.email === 'admin@test.com';
              const role = isHardcodedAdmin ? 'admin' : 'student';

              const newUser: User = {
                id: firebaseUser.uid,
                name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '新規ユーザー',
                email: firebaseUser.email || '',
                role: role,
              };
              
              try {
                await createUserProfile(firebaseUser.uid, {
                  name: newUser.name,
                  email: newUser.email,
                  role: newUser.role
                });
                setUser(newUser);
              } catch (profileError: any) {
                console.error("ユーザープロファイルの作成に失敗:", profileError);
                const errorCode = profileError.code ? ` (コード: ${profileError.code})` : '';
                setUser(null); 
                setInitializationError(`ユーザープロファイルの作成に失敗しました。${errorCode}`);
              }
            }
          } else {
            setUser(null);
          }
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error: any) {
        console.error("アプリケーションの初期化に失敗:", error);
        const errorCode = error.code ? ` (コード: ${error.code})` : '';
        setInitializationError((error.message || "予期せぬエラーが発生しました。") + errorCode);
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const handleLogout = async () => {
    if (authInstance) {
      await signOut(authInstance);
    }
  };

  if (initializationError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-2xl p-8 space-y-4 bg-white rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold text-red-600">アプリケーション設定エラー</h1>
            <p className="text-gray-700">{initializationError}</p>
            <div className="text-left bg-gray-50 p-6 rounded-md text-sm text-gray-600">
              <p className="font-semibold mb-2 text-base">修正方法:</p>
              <p className="mb-2">このエラーは、Cloudflare Pagesの環境変数（シークレットキー）が正しく設定されていない場合に発生します。</p>
              
              <p>1. Cloudflare Pagesのプロジェクト設定に移動します。</p>
              <p>2. 「環境変数」セクションで、以下の変数がすべて設定されていることを確認してください。</p>
              <pre className="mt-3 p-3 bg-gray-200 rounded text-xs overflow-x-auto">
                {`FIREBASE_API_KEY\nFIREBASE_AUTH_DOMAIN\nFIREBASE_PROJECT_ID\nFIREBASE_STORAGE_BUCKET\nFIREBASE_MESSAGING_SENDER_ID\nFIREBASE_APP_ID\nFIREBASE_MEASUREMENT_ID`}
              </pre>
              <p className="mt-3">3. 変数を追加または更新した後、アプリケーションを再デプロイしてください。</p>
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
