import React, { useState, useEffect } from 'react';
import { auth } from './services/firebase';
import { User, UserRole } from './types';
import Login from './components/Login';
import Header from './components/Header';
import StudentPortal from './components/StudentPortal';
import TeacherPortal from './components/TeacherPortal';
import AdminPortal from './components/AdminPortal';
import Spinner from './components/Spinner';
import { onAuthStateChanged, signOut } from 'firebase/auth';

// Mock function to get user role, in a real app this would come from Firestore
const getUserRole = (email: string | null): UserRole => {
  if (email?.includes('student')) return 'student';
  if (email?.includes('teacher')) return 'teacher';
  if (email?.includes('admin')) return 'admin';
  return 'student'; // default
}

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, firebaseUser => {
      if (firebaseUser) {
        const currentUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
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
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

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
            {user.role === 'admin' && <AdminPortal user={user} />}
          </main>
        </>
      ) : (
        <Login />
      )}
    </div>
  );
};

export default App;