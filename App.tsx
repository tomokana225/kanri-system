import React, { useState, useEffect } from 'react';
import { User, UserRole } from './types';
import { api } from './services/api';
import { auth } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import LoginComponent from './components/Login';
import StudentPortal from './components/StudentPortal';
import TeacherPortal from './components/TeacherPortal';
import AdminPortal from './components/AdminPortal';
import Header from './components/Header';
import Spinner from './components/Spinner';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in, get our custom user data from Firestore
        const userProfile = await api.getUserProfile(firebaseUser.uid);
        if (userProfile) {
          setCurrentUser(userProfile);
        } else {
          // Handle case where user exists in Auth but not in Firestore
          console.error("User profile not found in Firestore.");
          await api.logout();
          setCurrentUser(null);
        }
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      if(isInitializing) setIsInitializing(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [isInitializing]);

  const handleLogout = async () => {
    await api.logout();
  };

  const renderPortal = () => {
    if (!currentUser) return null;

    switch (currentUser.role) {
      case UserRole.STUDENT:
        return <StudentPortal student={currentUser} />;
      case UserRole.TEACHER:
        return <TeacherPortal teacher={currentUser} />;
      case UserRole.ADMIN:
        return <AdminPortal />;
      default:
        return <div className="text-center text-red-500">無効なユーザーロールです。</div>;
    }
  };

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {currentUser ? (
        <>
          <Header user={currentUser} onLogout={handleLogout} />
          <main className="p-4 mx-auto max-w-7xl sm:p-6 lg:p-8">
            {renderPortal()}
          </main>
        </>
      ) : (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-brand-light to-gray-200">
          <LoginComponent />
        </div>
      )}
    </div>
  );
};

export default App;
