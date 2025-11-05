import React, { useState } from 'react';
import { api } from '../services/api';
import { LoginIcon } from './icons';

const LoginComponent: React.FC = () => {
  const [email, setEmail] = useState('admin@admin.com');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('メールアドレスとパスワードを入力してください。');
      return;
    }
    setIsLoading(true);
    try {
      await api.login(email, password);
      // onAuthStateChanged in App.tsx will handle the redirect
    } catch (err: any) {
        if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
            setError('メールアドレスまたはパスワードが正しくありません。');
        } else {
            setError('ログイン中にエラーが発生しました。後でもう一度お試しください。');
        }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-xl shadow-2xl">
      <div className="text-center">
         <div className="inline-block p-3 rounded-full bg-brand-light">
           <LoginIcon className="w-8 h-8 text-brand-primary"/>
        </div>
        <h2 className="mt-4 text-3xl font-extrabold text-gray-900">授業予約システム</h2>
        <p className="mt-2 text-sm text-gray-600">アカウントにサインインしてください</p>
      </div>
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="email" className="sr-only">メールアドレス</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="relative block w-full px-4 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
            placeholder="メールアドレス"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        
        <div>
           <label htmlFor="password" className="sr-only">パスワード</label>
           <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="relative block w-full px-4 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
            placeholder="パスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-center text-red-600">{error}</p>}

        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-white border border-transparent rounded-md group bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'サインイン中...' : 'サインイン'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LoginComponent;