'use client';

import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-10">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-indigo-100 bg-white/80 shadow-xl backdrop-blur">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="hidden flex-col gap-4 bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 p-10 text-white md:flex">
            <h1 className="text-3xl font-semibold">Join Lumora</h1>
            <p className="text-sm text-indigo-50/90">
              Create an account to connect with therapists, track your progress, and receive personalised support.
            </p>
            <div className="mt-auto space-y-1 text-xs text-indigo-100/80">
              <p>✔ Choose between user or therapist roles</p>
              <p>✔ Secure messaging and scheduling</p>
              <p>✔ Privacy-first data sharing controls</p>
            </div>
          </div>
          <div className="p-8">
            <AuthForm initialMode="register" />
            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-indigo-600">
                Log in instead
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
