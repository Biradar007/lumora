'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { markTherapistVerified } from '../actions';
import { useAuth } from '@/contexts/AuthContext';

export default function TherapistVerifyPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleVerify = () => {
    if (!user?.uid) {
      return;
    }
    startTransition(async () => {
      await markTherapistVerified(user.uid);
      router.push('/therapist/dashboard');
    });
  };

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center gap-4 p-10 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Manual verification</h1>
      <p className="text-sm text-slate-600">
        For the MVP, you can verify your profile instantly. This will mark your profile as verified so it can appear in
        the directory once visibility is enabled.
      </p>
      <button
        type="button"
        onClick={handleVerify}
        disabled={pending || !user}
        className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Verifying…' : 'Verify profile'}
      </button>
    </main>
  );
}
