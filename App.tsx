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
    // Only subscribe if auth is initialized
    if (auth) {
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
    } else {
      // If auth is not initialized, stop loading
      setLoading(false);
    }
  }, []);

  const handleLogout = async () => {
    // Check if auth is initialized before signing out
    if (auth) {
      await signOut(auth);
    }
  };

  // Display configuration error if Firebase initialization failed
  if (firebaseError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-full max-w-xl p-8 space-y-4 bg-white rounded-lg shadow-md text-center">
            <h1 className="text-2xl font-bold text-red-600">Application Configuration Error</h1>
            <p className="text-gray-700">{firebaseError}</p>
            <div className="text-left bg-gray-50 p-4 rounded-md text-sm text-gray-600">
              <p className="font-semibold mb-2">How to fix this:</p>
              <p>1. Create a file named <code>.env</code> in the root directory of the project.</p>
              <p>2. Add your Firebase project configuration to this file. It should look like this:</p>
              <pre className="mt-2 p-2 bg-gray-200 rounded text-xs overflow-x-auto">
                {`FIREBASE_API_KEY=YourApiKey\nFIREBASE_AUTH_DOMAIN=YourAuthDomain\nFIREBASE_PROJECT_ID=YourProjectId\n...etc`}
              </pre>
              <p className="mt-2">3. After saving the file, you may need to restart the development server.</p>
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