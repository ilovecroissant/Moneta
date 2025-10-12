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
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-2 border-gray-100">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-black text-gray-800 mb-2">Check Your Email</h1>
            <p className="text-gray-600">
              If an account exists with <strong>{email}</strong>, we&apos;ve sent a password reset link.
            </p>
          </div>

          {resetToken && (
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
              <p className="text-sm font-semibold text-yellow-800 mb-2">
                🔧 Development Mode - Reset Token:
              </p>
              <p className="text-xs font-mono bg-white p-2 rounded border border-yellow-300 break-all">
                {resetToken}
              </p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(resetToken);
                  alert('Token copied to clipboard!');
                }}
                className="mt-2 text-xs text-yellow-700 hover:text-yellow-900 font-semibold"
              >
                📋 Copy Token
              </button>
            </div>
          )}

          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-2 border-gray-100">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🔑</div>
          <h1 className="text-3xl font-black text-gray-800 mb-2">Reset Password</h1>
          <p className="text-gray-600">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        <form onSubmit={handleRequestReset} className="space-y-6">
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-700 font-semibold text-sm">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="your.email@example.com"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <button
            type="button"
            onClick={() => router.push('/login')}
            className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-all"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
}
