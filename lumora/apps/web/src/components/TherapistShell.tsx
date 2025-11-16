'use client';

import type { ReactNode } from 'react';
import { Menu } from 'lucide-react';
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        variant="desktop"
      />
      <div className="flex h-screen flex-col transition-[margin] duration-300 ease-in-out md:ml-64 lg:ml-72">
        <header className="border-b border-slate-200 bg-white/90 backdrop-blur fixed inset-x-0 top-0 z-40 md:static">
          <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="border-slate-200 p-2 text-slate-600 md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <p className="text-xl font-semibold uppercase tracking-wide text-slate-500 sm:text-2xl">
                Therapist workspace
              </p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pt-20 md:pt-0">
          {onboardingPending && (
            <div className="border-b border-indigo-100 bg-indigo-50/80 px-4 py-4 sm:px-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-indigo-900">Finish onboarding to unlock the full experience.</p>
                  <p className="text-xs text-indigo-700/80">
                    {progress.completed} of {progress.total} steps completed • {progress.percent}% done
                  </p>
                </div>
                <Link
                  href="/therapist/onboarding"
                  className="inline-flex w-full items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:text-indigo-900 sm:w-auto"
                >
                  Continue onboarding
                </Link>
              </div>
            </div>
          )}

          <main className="px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
      {sidebarOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-full bg-white shadow-2xl transition-transform md:hidden">
            <TherapistSidebar
              therapistName={therapistName}
              progress={progress}
              onboardingPending={onboardingPending}
              status={profile?.status}
              onLogout={async () => {
                await handleLogout();
                setSidebarOpen(false);
              }}
              signingOut={signingOut}
              variant="mobile"
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}
