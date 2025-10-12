'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resetToken, setResetToken] = useState(''); // For dev mode

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8000/auth/password-reset/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to request password reset');
      }

      setSuccess(true);
      
      // In development, the API returns the token and email
      if (data.email) {
        setResetToken(data.token);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center p-6">
        <div className="duo-card p-8 w-full max-w-md anim-bounce-in">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4 anim-success-burst">✅</div>
            <h1 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">Check Your Email</h1>
            <p className="text-gray-600 dark:text-gray-400">
              If an account exists with <strong>{email}</strong>, we&apos;ve sent a password reset link.
            </p>
          </div>

          {resetToken && (
            <div className="bg-yellow-50 dark:bg-yellow-900 border-2 border-yellow-200 dark:border-yellow-700 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                🔧 Development Mode - Reset Token:
              </p>
              <p className="text-xs font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded border border-yellow-300 dark:border-yellow-600 break-all">
                {resetToken}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetToken);
                  alert('Token copied to clipboard!');
                }}
                className="mt-2 text-xs text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 font-semibold"
              >
                📋 Copy Token
              </button>
            </div>
          )}

          <button
            onClick={() => router.push('/login')}
            className="duo-btn w-full py-3 text-lg"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-slate-900 flex items-center justify-center p-6">
      <div className="duo-card p-8 w-full max-w-md anim-bounce-in">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4 anim-float">🔑</div>
          <h1 className="text-3xl font-black text-gray-800 dark:text-gray-100 mb-2">Reset Password</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleRequestReset} className="space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900 border-2 border-red-200 dark:border-red-700 rounded-xl p-4">
              <p className="text-red-700 dark:text-red-200 font-semibold text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl font-semibold text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="your.email@example.com"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="duo-btn w-full py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-all border-b-4 border-gray-400 dark:border-gray-800"
            style={{ boxShadow: '0 4px 0 #9ca3af, 0 6px 12px rgba(0, 0, 0, 0.1)' }}
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
