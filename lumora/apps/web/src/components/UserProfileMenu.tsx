'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, LogIn, ShieldAlert, UserCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthUI } from '@/contexts/AuthUIContext';
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

export function UserProfileMenu() {
  const { user, profile, logout, guestMode } = useAuth();
  const { requestLogin } = useAuthUI();
  const [signingOut, setSigningOut] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const router = useRouter();

  if (!user) {
    return (
      <div className="rounded-xl border border-indigo-100 bg-white/70 p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-indigo-900">
              {guestMode ? "You're exploring in guest mode" : 'Welcome to Lumora'}
            </p>
            <p className="text-xs text-indigo-700/80">
              Sign in to save conversations and track your progress across visits. You can keep exploring without an
              account, too.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={requestLogin}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          <LogIn className="h-4 w-4" />
          Sign in
        </button>
      </div>
    );
  }

  const displayName =
    profile?.displayName || profile?.name || user?.displayName || user?.email || 'Welcome';
  const email = user?.email ?? profile?.email ?? '';
  const accountType = profile?.role ?? 'user';

  const initials = getInitials(profile?.displayName ?? profile?.name, user?.email ?? undefined);

  const handleLogout = async () => {
    try {
      setSigningOut(true);
      await logout();
      router.replace('/');
    } finally {
      setSigningOut(false);
    }
  };

  const handleOpenVerifyModal = () => {
    setVerifyModalOpen(true);
  };

  const handleCloseVerifyModal = () => {
    setVerifyModalOpen(false);
  };

  const emailVerified = Boolean(user?.emailVerified);

  return (
    <>
      <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 border border-indigo-100 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-lg font-semibold shadow-md">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt={displayName}
                className="h-full w-full rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-indigo-900 truncate">{displayName}</p>
            {email && (
              <p className="text-xs text-indigo-700/70 truncate" title={email}>
                {email}
              </p>
            )}
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-white/70 border border-indigo-100 px-2 py-0.5">
              <UserCircle2 className="h-3.5 w-3.5 text-indigo-500" />
              <span className="text-xs font-medium capitalize text-indigo-700">{accountType}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {!emailVerified && (
            <button
              type="button"
              onClick={handleOpenVerifyModal}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              <ShieldCheck className="h-4 w-4" />
              Verify your account
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            disabled={signingOut}
            className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2 rounded-lg transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? 'Signing out…' : 'Log out'}
          </button>
        </div>
      </div>

      {verifyModalOpen ? (
        <EmailVerificationModal isOpen={verifyModalOpen} onClose={handleCloseVerifyModal} />
      ) : null}
    </>
  );
}
