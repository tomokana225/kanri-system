
import React, { useState } from 'react';
import Spinner from './Spinner';
import { LoginIcon, LogoIcon, GoogleIcon } from './icons';

interface LoginProps {
    onLogin: (email: string, password: string) => Promise<void>;
    isLoading: boolean;
    error: string | null;
}

const Login: React.FC<LoginProps> = ({ onLogin, isLoading, error }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onLogin(email, password);
    };

    return (
        <div className="min-h-screen lg:grid lg:grid-cols-2">
            {/* Branding Panel */}
            <div className="relative flex-col items-center justify-center hidden h-full px-10 text-white bg-brand-dark lg:flex">
                 <div className="absolute inset-0 bg-brand-primary opacity-80"></div>
                 <div className="relative z-10 text-center">
                    <LogoIcon className="w-24 h-24 mx-auto mb-4 text-white" />
                    <h1 className="text-4xl font-bold">授業予約システムへようこそ</h1>
                    <p className="mt-4 text-lg text-indigo-200">学習スケジュールを、スマートに、シンプルに。</p>
                </div>
            </div>

            {/* Form Panel */}
            <div className="flex items-center justify-center h-full px-4 py-12 bg-gray-50 sm:px-6 lg:px-8">
                <div className="w-full max-w-md space-y-8">
                    <div>
                        <h2 className="text-3xl font-extrabold text-center text-gray-900">
                            アカウントにログイン
                        </h2>
                    </div>
                    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                        <div className="space-y-4 rounded-md shadow-sm">
                            <div>
                                <label htmlFor="email-address" className="sr-only">
                                    メールアドレス
                                </label>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="relative block w-full px-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-brand-primary focus:border-brand-primary focus:z-10 sm:text-sm"
                                    placeholder="メールアドレス"
                                />
                            </div>
                            <div>
                                <label htmlFor="password" className="sr-only">
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
                                    className="relative block w-full px-3 py-3 text-gray-900 placeholder-gray-500 border border-gray-300 rounded-md appearance-none focus:outline-none focus:ring-brand-primary focus:border-brand-primary focus:z-10 sm:text-sm"
                                    placeholder="パスワード"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-sm text-center text-red-600">{error}</p>
                        )}

                        <div className="flex items-center justify-between">
                            <div className="text-sm">
                                <a href="#" className="font-medium text-brand-primary hover:text-brand-secondary">
                                    パスワードをお忘れですか？
                                </a>
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-white border border-transparent rounded-md group bg-brand-primary hover:bg-brand-secondary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-dark disabled:bg-gray-400 disabled:cursor-wait"
                            >
                                {isLoading ? (
                                    <>
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                            <Spinner />
                                        </span>
                                        処理中...
                                    </>
                                ) : (
                                    <>
                                        <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                            <LoginIcon className="w-5 h-5" />
                                        </span>
                                        ログイン
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                    
                    <div className="relative mt-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 text-gray-500 bg-gray-50">または</span>
                        </div>
                    </div>

                    <div className="mt-6">
                         <button
                            type="button"
                            className="relative flex justify-center w-full px-4 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm group hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                            >
                            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                                <GoogleIcon className="w-5 h-5" />
                            </span>
                            Googleでログイン
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Login;
