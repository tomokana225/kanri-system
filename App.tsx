
import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { User, UserRole } from './types';
import { api } from './services/api';

import Login from './components/Login';
import Header from './components/Header';
import StudentPortal from './components/StudentPortal';
import TeacherPortal from './components/TeacherPortal';
import AdminPortal from './components/AdminPortal';
import Spinner from './components/Spinner';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    useEffect(() => {
        setIsLoading(true);
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    const userProfile = await api.getUserProfile(firebaseUser.uid);
                    if (userProfile) {
                        setUser(userProfile);
                        setAuthError(null); // Clear previous errors on successful load
                    } else {
                        // This handles the case where auth is valid but profile is missing
                        setUser(null);
                        setAuthError('認証に成功しましたが、ユーザープロファイルがデータベースに見つかりません。管理者にご連絡ください。');
                        await api.logout(); // Log out from auth to prevent a stuck state
                    }
                } catch (error) {
                    console.error("Failed to fetch user profile:", error);
                    setUser(null);
                    setAuthError('ユーザープロファイルの取得に失敗しました。');
                }
            } else {
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleLogin = async (email: string, password: string) => {
        setAuthError(null);
        setIsLoading(true);
        try {
            await api.login(email, password);
            // onAuthStateChanged will handle setting the user state and turning off loading
        } catch (err) {
            setAuthError('ログインに失敗しました。メールアドレスまたはパスワードを確認してください。');
            setIsLoading(false); // Ensure loading stops on direct login failure
        }
    };

    const handleLogout = async () => {
        await api.logout();
        setUser(null);
    };

    const renderPortal = () => {
        if (!user) return null;

        switch (user.role) {
            case UserRole.STUDENT:
                return <StudentPortal student={user} />;
            case UserRole.TEACHER:
                return <TeacherPortal teacher={user} />;
            case UserRole.ADMIN:
                return <AdminPortal />;
            default:
                return <p>未定義の役割です。</p>;
        }
    };

    if (isLoading && !user && !authError) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <Spinner />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {user ? (
                <>
                    <Header user={user} onLogout={handleLogout} />
                    <main className="py-8">
                        <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                            {renderPortal()}
                        </div>
                    </main>
                </>
            ) : (
                <Login onLogin={handleLogin} isLoading={isLoading} error={authError} />
            )}
        </div>
    );
};

export default App;
