import React, { useState, useEffect } from 'react';
import { initializeFirebase, getUserProfile, createUserProfile } from './services/firebase';
import { User, UserRole } from './types';
import Login from './components/Login';
import Header from './components/Header';
import StudentPortal from './components/StudentPortal';
import TeacherPortal from './components/TeacherPortal';
import AdminPortal from './components/AdminPortal';
import Spinner from './components/Spinner';
// Fix: Use Firebase compat imports to resolve module resolution errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { ChevronDownIcon } from './components/icons';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializationError, setInitializationError] = useState<string | null>(null);
  const [authInstance, setAuthInstance] = useState<firebase.auth.Auth | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);

  const handleDevModeLogin = (role: UserRole) => {
    console.warn(`[開発モード] ${role}としてログインしています。表示されているデータはモックです。`);
    setUser({
        id: `dev-${role}-id`,
        name: `開発用${role === 'student' ? '学生' : role === 'teacher' ? '教師' : '管理者'}`,
        email: `${role}@example.com`,
        role: role as UserRole,
    });
    setInitializationError(null); // Clear error to render the portal
    setLoading(false);
  };


  useEffect(() => {
    const initializeApp = async () => {
      try {
        const { auth } = await initializeFirebase();
        setAuthInstance(auth);

        // --- DEV MODE (URL PARAM) ---
        // Keep this as a shortcut for developers
        const urlParams = new URLSearchParams(window.location.search);
        const devRole = urlParams.get('dev_role');
        if (devRole && ['student', 'teacher', 'admin'].includes(devRole)) {
            handleDevModeLogin(devRole as UserRole);
            return; // Skip real auth listener setup
        }
        // --- END DEV MODE ---

        const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: firebase.User | null) => {
          if (firebaseUser) {
            const userProfile = await getUserProfile(firebaseUser.uid);
            if (userProfile) {
              setUser(userProfile);
            } else {
              console.log("Firestoreにユーザープロファイルが見つかりません。新規作成します:", firebaseUser.uid);
              // An admin user is identified if their email contains 'admin@'
              const isAdmin = firebaseUser.email?.includes('admin@') ?? false;
              const role = isAdmin ? 'admin' : 'student';

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
      await authInstance.signOut();
    }
  };

  if (initializationError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-2xl p-8 space-y-6 bg-white rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold text-orange-600">開発用モード</h1>
            <p className="text-gray-700">
                アプリケーションの初期化に失敗しました。
                <br />
                UIをテストするために、表示したい役割を選択してください。
            </p>
            <div className="flex justify-center space-x-4 pt-4">
                 <button onClick={() => handleDevModeLogin('student')} className="px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700">
                    学生として表示
                </button>
                 <button onClick={() => handleDevModeLogin('teacher')} className="px-6 py-3 font-semibold text-white bg-green-600 rounded-lg shadow-md hover:bg-green-700">
                    教師として表示
                </button>
                 <button onClick={() => handleDevModeLogin('admin')} className="px-6 py-3 font-semibold text-white bg-gray-700 rounded-lg shadow-md hover:bg-gray-800">
                    管理者として表示
                </button>
            </div>
            <div className="text-left bg-gray-50 p-4 rounded-md text-sm text-gray-600 mt-6">
              <button onClick={() => setShowErrorDetails(!showErrorDetails)} className="font-semibold mb-2 text-base flex items-center justify-between w-full">
                <span>技術的な詳細 (デバッグ用)</span>
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${showErrorDetails ? 'rotate-180' : ''}`} />
              </button>
              {showErrorDetails && (
                <div className="mt-2 pt-2 border-t">
                  <p className="mb-2 text-red-600 font-medium">エラーメッセージ: {initializationError}</p>
                  <p className="mb-2">このエラーは通常、Cloudflare Pagesの環境変数が正しく設定されていない場合に発生します。</p>
                  <pre className="mt-3 p-3 bg-gray-200 rounded text-xs overflow-x-auto">
                    {`FIREBASE_API_KEY\nFIREBASE_AUTH_DOMAIN\nFIREBASE_PROJECT_ID\n...`}
                  </pre>
                </div>
              )}
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
    <div className="h-full bg-gray-100 flex flex-col">
      {user ? (
        <>
          <Header user={user} onLogout={handleLogout} onToggleSidebar={() => setIsSidebarOpen(prev => !prev)} />
          <div className="flex-1 flex overflow-hidden">
            {user.role === 'student' && <StudentPortal user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />}
            {user.role === 'teacher' && <TeacherPortal user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />}
            {user.role === 'admin' && <AdminPortal user={user} isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />}
          </div>
        </>
      ) : (
        <Login />
      )}
    </div>
  );
};

export default App;