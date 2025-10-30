'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LogOut, ShieldCheck, UserCircle } from 'lucide-react';
import type { TherapistOnboardingProgress } from '@/lib/therapistOnboarding';
import { useAuth } from '@/contexts/AuthContext';
import { EmailVerificationModal } from './EmailVerificationModal';

function getInitials(name?: string, fallback?: string) {
  if (name) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    if (parts.length > 0) {
      return parts.map((part) => part[0]?.toUpperCase() ?? '').join('') || fallback?.[0]?.toUpperCase() || 'U';
    }
  }
  return fallback?.[0]?.toUpperCase() ?? 'U';
}
interface TherapistSidebarProps {
  therapistName: string;
  progress: TherapistOnboardingProgress;
  onboardingPending: boolean;
  status?: string;
  onLogout: () => Promise<void>;
  signingOut: boolean;
}

const NAV_ITEMS = [
  {
    href: '/therapist/dashboard',
    label: 'Dashboard',
    Icon: LayoutDashboard,
  },
  {
    href: '/therapist/profile',
    label: 'Profile',
    Icon: UserCircle,
  },
];

export function TherapistSidebar({
  therapistName,
  progress,
  onboardingPending,
  status,
  onLogout,
  signingOut,
}: TherapistSidebarProps) {
  const { user, profile } = useAuth();
  const pathname = usePathname();
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const statusBadge =
    status === 'VERIFIED'
      ? {
          text: 'Verified',
          classes: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        }
      : null;
  const emailVerified = Boolean(user?.emailVerified);
  const therapistEmail = user?.email ?? profile?.email ?? undefined;
  const initials = getInitials(profile?.displayName ?? therapistName, therapistEmail);

  const handleOpenVerification = () => {
    setVerifyModalOpen(true);
  };

  const handleCloseVerification = () => {
    setVerifyModalOpen(false);
  };

  return (
    <>
      <aside className="hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-64 lg:w-72 md:flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_40px_10px_rgba(147,112,219,0.3)]" />
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Lumora
              </span>
              <span className="text-xs font-semibold text-slate-500">(Beta)</span>
            </div>
            <p className="text-sm font-bold text-gray-500 hidden sm:block">Light for the mind</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition
                ${isActive ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-600 hover:bg-slate-50'}
              `}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="space-y-4 border-t border-slate-200 px-6 py-6">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-semibold shadow-md">
              {user?.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt={therapistName}
                  className="h-full w-full rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0">
              <p className="mt-1 text-sm font-semibold text-slate-900 truncate">{therapistName}</p>
              {therapistEmail && (
                <p className="text-xs text-indigo-700/70 truncate" title={therapistEmail}>
                  {therapistEmail}
                </p>
              )}
            </div>
          </div>
          {statusBadge ? (
            <span
              className={`mt-3 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge.classes}`}
            >
              {statusBadge.text}
            </span>
          ) : null}
          {typeof status === 'string' && !statusBadge && (
            <p className="mt-2 text-xs text-slate-500">Status: {status}</p>
          )}
        <div className="mt-4 space-y-3">
          {!emailVerified && (
            <button
              type="button"
              onClick={handleOpenVerification}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Verify your account
            </button>
          )}
           <button
          type="button"
          onClick={() => {
            void onLogout();
          }}
          disabled={signingOut}
            className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? 'Signing out…' : 'Log out'}
        </button>
        </div>
        </div>

        {onboardingPending ? (
          <div className="space-y-3 rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-indigo-900">Onboarding in progress</p>
            <div className="space-y-1.5">
              <div className="h-2 overflow-hidden rounded-full bg-indigo-100">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-xs text-indigo-700">
                {progress.completed} of {progress.total} steps • {progress.percent}% complete
              </p>
            </div>
            <Link
              href="/therapist/onboarding"
              className="inline-flex items-center justify-center rounded-lg border border-indigo-200 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:text-indigo-900"
            >
              Continue onboarding
            </Link>
          </div>
        ) : (
         null
        )}

        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">Emergency?</p>
          <p className="text-xs text-rose-700">
            If you or a client is in crisis, call 988 (Suicide &amp; Crisis Lifeline) or contact emergency services.
          </p>
        </div>
      </div>
    </aside>
      {verifyModalOpen ? (
        <EmailVerificationModal isOpen={verifyModalOpen} onClose={handleCloseVerification} />
      ) : null}
    </>
  );
}
