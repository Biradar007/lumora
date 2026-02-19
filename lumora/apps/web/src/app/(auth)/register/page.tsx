'use client';

import Link from 'next/link';
import { AuthForm } from '@/components/AuthForm';

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 px-4 py-10">
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-indigo-100 bg-white/80 shadow-xl backdrop-blur">
        <div className="flex justify-center">
          <div className="flex justify-center p-8">
            <AuthForm initialMode="register" />
          </div>
        </div>
      </div>
    </div>
  );
}
