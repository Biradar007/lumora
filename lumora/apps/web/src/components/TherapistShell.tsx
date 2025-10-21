'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { computeTherapistProgress } from '@/lib/therapistOnboarding';
import { TherapistSidebar } from './TherapistSidebar';

interface TherapistShellProps {
  children: ReactNode;
}

export function TherapistShell({ children }: TherapistShellProps) {
  const { user, profile: userProfile, logout, loading } = useAuth();
  const { profile } = useTherapistProfile(user?.uid);
  const router = useRouter();
  const pathname = usePathname();
  const progress = computeTherapistProgress(profile ?? null);
  const onboardingPending = progress.percent < 100;
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (!user) {
      router.replace('/');
      return;
    }
    if (userProfile?.role !== 'therapist') {
      if (userProfile?.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/home');
      }
    }
  }, [loading, router, user, userProfile?.role]);

  const therapistName = useMemo(
    () =>
      userProfile?.displayName ??
      userProfile?.name ??
      user?.displayName ??
      user?.email ??
      'Therapist workspace',
    [user, userProfile]
  );

  const handleEditProfile = () => {
    router.push('/therapist/onboarding');
  };

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await logout();
      router.replace('/');
    } finally {
      setSigningOut(false);
    }
  };

  if (loading || !user || userProfile?.role !== 'therapist') {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <TherapistSidebar
        therapistName={therapistName}
        progress={progress}
        onboardingPending={onboardingPending}
        status={profile?.status}
        onLogout={handleLogout}
        signingOut={signingOut}
      />
      <div className="flex h-screen flex-col transition-[margin] duration-300 ease-in-out md:ml-64 lg:ml-72">
        <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="flex items-center justify-between gap-4 px-6 py-4">
            <div>
              <p className="text-3xl font-semibold uppercase tracking-wide text-slate-500">Therapist workspace</p>
            </div>
            <div className="flex flex-1 justify-center gap-2 md:hidden">
              <Link
                href="/therapist/dashboard"
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  pathname.startsWith('/therapist/dashboard')
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/therapist/profile"
                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                  pathname.startsWith('/therapist/profile')
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                Profile
              </Link>
            </div>
          </div>
        </header>

        {onboardingPending && (
          <div className="border-b border-indigo-100 bg-indigo-50/80">
            <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-indigo-900">Finish onboarding to unlock the full experience.</p>
                <p className="text-xs text-indigo-700/80">
                  {progress.completed} of {progress.total} steps completed • {progress.percent}% done
                </p>
              </div>
              <Link
                href="/therapist/onboarding"
                className="inline-flex items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-900"
              >
                Continue onboarding
              </Link>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
