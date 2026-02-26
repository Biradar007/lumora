'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckCircle2, LayoutDashboard, LogOut, ShieldCheck, UserCircle, X } from 'lucide-react';
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
  variant?: 'desktop' | 'mobile';
  onClose?: () => void;
  className?: string;
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
  variant = 'desktop',
  onClose,
  className = '',
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

  const handleOpenVerification = () => setVerifyModalOpen(true);
  const handleCloseVerification = () => setVerifyModalOpen(false);

  const isMobile = variant === 'mobile';
  const containerClass = isMobile
    ? `flex h-full w-full flex-col border-r border-gray-200 bg-white ${className}`
    : `hidden md:flex md:fixed md:inset-y-0 md:left-0 md:z-40 md:w-64 lg:w-72 md:flex-col border-r border-gray-200 bg-white ${className}`;

  return (
    <>
      <aside className={containerClass}>
        <div className={`${isMobile ? 'p-4' : 'p-6'} border-b border-gray-200`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-gradient-to-b from-yellow-300 via-purple-400 to-blue-500 shadow-[0_0_40px_10px_rgba(147,112,219,0.3)]" />
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Lumora
                  </span>
                  {/* <span className="text-sm text-gray-500">(Beta)</span> */}
                </div>
                  {/* <p className="text-xs sm:text-sm font-bold text-muted-foreground mt-0.5">Light for the mind</p> */}
              </div>
            </div>
            {isMobile ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </div>

        <nav className={`flex-1 ${isMobile ? 'p-4 space-y-2 overflow-y-auto' : 'p-4 space-y-2'}`}>
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 border-l-4
                  ${isActive
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-500 text-blue-700'
                    : 'border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
                `}
                onClick={isMobile ? onClose : undefined}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${isActive ? 'text-blue-600' : 'text-indigo-500'}`} />
                  <span className="font-medium">{label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="space-y-4 border-t border-gray-200 p-4">
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
                <p className="flex items-center gap-2 text-sm font-medium text-indigo-900">
                  <span className="truncate">{therapistName}</span>
                    {statusBadge ? <CheckCircle2 className="h-4 w-4 text-blue-500" /> : null}
                </p>
                {therapistEmail && (
                  <p className="text-xs text-indigo-700/70 truncate" title={therapistEmail}>
                    {therapistEmail}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {!emailVerified && (
                <button
                  type="button"
                  onClick={handleOpenVerification}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Verify your account
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  void onLogout();
                  if (isMobile) {
                    onClose?.();
                  }
                }}
                disabled={signingOut}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
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
                onClick={isMobile ? onClose : undefined}
              >
                Continue onboarding
              </Link>
            </div>
          ) : null}

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800 font-medium mb-1">Emergency?</p>
              <p className="text-xs text-red-600">
                If you&apos;re in crisis, call 988 (Suicide & Crisis Lifeline) or go to your nearest emergency room.
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
