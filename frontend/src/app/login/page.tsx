"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const body = mode === 'login'
        ? { username_or_email: usernameOrEmail, password }
        : { username, email, password };

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Authentication failed');
      }

      const data = await response.json();
      
      // Store auth data
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify({
        id: data.user_id,
        username: data.username,
        email: data.email,
        displayName: data.display_name,
        xp: data.xp,
        streak: data.streak,
      }));
      localStorage.setItem('isGuest', 'false');

      // Redirect to main app
      router.push('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    // Set guest mode
    localStorage.setItem('isGuest', 'true');
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="duo-card p-8 w-full max-w-md anim-bounce-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-500 to-blue-600 mb-2">
            💰 Moneta
          </div>
          <p className="text-gray-600 dark:text-gray-400 font-semibold">Master Your Money</p>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-3 rounded-lg font-extrabold transition-all ${
              mode === 'login'
                ? 'bg-blue-500 text-white shadow-md border-b-4 border-blue-700 hover:bg-blue-600'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
            }`}
            style={mode === 'login' ? { boxShadow: '0 4px 0 #1d4ed8' } : {}}
          >
            Login
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-3 rounded-lg font-extrabold transition-all ${
              mode === 'signup'
                ? 'bg-blue-500 text-white shadow-md border-b-4 border-blue-700 hover:bg-blue-600'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100'
            }`}
            style={mode === 'signup' ? { boxShadow: '0 4px 0 #1d4ed8' } : {}}
          >
            Sign Up
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 border-2 border-red-300 dark:border-red-700 rounded-xl text-red-700 dark:text-red-200 font-semibold text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'login' ? (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                Username or Email
              </label>
              <input
                type="text"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
                placeholder="Enter username or email"
              />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Choose a username"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
                  placeholder="Enter your email"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-blue-500 font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="Enter your password"
            />
            {mode === 'login' && (
              <div className="text-right mt-2">
                <button
                  type="button"
                  onClick={() => router.push('/reset-password')}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-semibold"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="duo-btn w-full py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-semibold">OR</span>
          </div>
        </div>

        {/* Guest Mode */}
        <button
          onClick={handleGuestMode}
          className="w-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all border-b-4 border-gray-400 dark:border-gray-800 shadow-md"
          style={{ boxShadow: '0 4px 0 #9ca3af, 0 6px 12px rgba(0, 0, 0, 0.1)' }}
        >
          Continue as Guest
        </button>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-2 font-semibold">
          Guest mode: Progress won&apos;t be saved
        </p>
      </div>
    </div>
  );
}
