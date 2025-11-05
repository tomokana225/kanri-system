import React, { useState } from 'react';
import { api } from '../services/api';
import Spinner from './Spinner';
import { LoginIcon } from './icons';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            await api.login(email, password);
            // The onAuthStateChanged listener in App.tsx will handle the state change after login.
        } catch (err) {
            setError('ログインに失敗しました。メールアドレスまたはパスワードを確認してください。');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-brand-primary">授業予約システム</h1>
                    <p className="mt-2 text-sm text-gray-600">ログインしてください</p>
                </div>
                <form className="space-y-6" onSubmit={handleLogin}>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            メールアドレス
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                        />
                    </div>
                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700"
                        >
                            パスワード
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm appearance-none focus:outline-none focus:ring-brand-primary focus:border-brand-primary"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600">{error}</p>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="relative flex justify-center w-full px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md group bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark disabled:bg-gray-400"
                        >
                            {isLoading ? (
                                <Spinner />
                            ) : (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                  <LoginIcon className="w-5 h-5" />
                                </span>
                            )}
                            {isLoading ? 'ログイン中...' : 'ログイン'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
