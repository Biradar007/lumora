'use client';

import { FormEvent, useState } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import Link from 'next/link';
import { getFirebaseApp } from '@/lib/firebaseClient';

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email) {
      setMessage('If an account exists for that email, you\'ll receive a reset link shortly.');
      return;
    }
    setSubmitting(true);
    const auth = getAuth(getFirebaseApp());
    const normalized = normalizeEmail(email);
    try {
      await sendPasswordResetEmail(auth, normalized);
    } catch (error) {
      console.error('Failed to send password reset email', error);
    } finally {
      setMessage("If an account exists for that email, you'll receive a reset link.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-indigo-100 bg-white/80 p-8 shadow-xl backdrop-blur">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold text-indigo-900">Reset your password</h1>
          <p className="mt-2 text-sm text-indigo-700/80">
            Enter the email linked to your Lumora account and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-indigo-900 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full rounded-lg border border-indigo-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {message && (
            <p className="text-sm text-indigo-700/80 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? 'Sending reset link…' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-indigo-700/80">
          Remembered your password?{' '}
          <Link href="/" className="font-semibold text-indigo-600 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
