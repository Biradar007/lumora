'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LogOut, UserCircle } from 'lucide-react';
import type { TherapistOnboardingProgress } from '@/lib/therapistOnboarding';

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
  const pathname = usePathname();
  const statusBadge =
    status === 'VERIFIED'
      ? {
          text: 'Verified',
          classes: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        }
      : null;

  return (
    <aside className="hidden md:flex md:w-64 lg:w-72 flex-col border-r border-slate-200 bg-white">
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
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Therapist</p>
          <p className="mt-1 text-sm font-semibold text-slate-900">{therapistName}</p>
          {statusBadge ? (
            <span
              className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${statusBadge.classes}`}
            >
              {statusBadge.text}
            </span>
          ) : null}
          {typeof status === 'string' && !statusBadge && (
            <p className="mt-0.5 text-xs text-slate-500">Status: {status}</p>
          )}
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
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-900">Onboarding complete</p>
            <p className="text-xs text-emerald-700">Keep your profile fresh to stay visible to Lumora members.</p>
          </div>
        )}

        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-900">Emergency?</p>
          <p className="text-xs text-rose-700">
            If you or a client is in crisis, call 988 (Suicide &amp; Crisis Lifeline) or contact emergency services.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void onLogout();
          }}
          disabled={signingOut}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-75"
        >
          <LogOut className="h-4 w-4" />
          {signingOut ? 'Signing out…' : 'Log out'}
        </button>
      </div>
    </aside>
  );
}
