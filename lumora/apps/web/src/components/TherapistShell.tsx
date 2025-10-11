'use client';

import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTherapistProfile } from '@/hooks/useTherapistProfile';
import { computeTherapistProgress } from '@/lib/therapistOnboarding';

interface TherapistShellProps {
  children: ReactNode;
}

export function TherapistShell({ children }: TherapistShellProps) {
  const { user, profile: userProfile, logout } = useAuth();
  const { profile } = useTherapistProfile(user?.uid);
  const showBanner = !profile || profile.status !== 'VERIFIED';
  const router = useRouter();
  const progress = computeTherapistProgress(profile ?? null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (user && userProfile && userProfile.role !== 'therapist') {
      router.replace('/home');
    }
  }, [router, user, userProfile]);

  const therapistName = useMemo(
    () =>
      userProfile?.displayName ??
      userProfile?.name ??
      user?.displayName ??
      user?.email ??
      'Therapist workspace',
    [user, userProfile]
  );

  const statusBadge = useMemo(() => {
    if (profile?.status === 'VERIFIED') {
      return {
        text: 'Verified therapist',
        classes: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
    }
    if (profile?.status === 'PENDING_REVIEW') {
      return {
        text: 'Pending Lumora review',
        classes: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    }
    if (!profile) {
      return {
        text: 'Complete your onboarding',
        classes: 'border-indigo-200 bg-indigo-50 text-indigo-700',
      };
    }
    return {
      text: 'Onboarding in progress',
      classes: 'border-indigo-200 bg-indigo-50 text-indigo-700',
    };
  }, [profile]);

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await logout();
      router.replace('/');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-12 rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_25px_10px_rgba(147,112,219,0.25)]" />
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Lumora
                </span>
                <span className="text-xs font-semibold text-slate-500">(Beta)</span>
              </div>
              <p className="text-sm text-slate-500">Clinical workspace</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-slate-900">{therapistName}</span>
              <span
                className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge.classes}`}
              >
                {statusBadge.text}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              disabled={signingOut}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-75"
            >
              <LogOut className="h-4 w-4" />
              {signingOut ? 'Signing out…' : 'Log out'}
            </button>
          </div>
        </div>
      </header>

      {showBanner && (
        <div className="border-b border-indigo-100 bg-indigo-50/80">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-900">
                Finish onboarding to unlock the full therapist experience.
              </p>
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

      <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
    </div>
  );
}
