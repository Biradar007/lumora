'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/AuthForm';
import { AuthUIProvider } from '@/contexts/AuthUIContext';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, guestMode, enableGuestMode, profileCompletionPending } = useAuth();
  const [promptVisible, setPromptVisible] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(true);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (profileCompletionPending) {
      setPromptVisible(true);
      setShowLoginForm(true);
      return;
    }

    if (user) {
      setPromptVisible(false);
      setShowLoginForm(false);
      return;
    }

    if (!guestMode && !promptVisible) {
      setPromptVisible(true);
      setShowLoginForm(true);
    }
  }, [guestMode, loading, profileCompletionPending, promptVisible, user]);

  const handleContinueAsGuest = useCallback(() => {
    enableGuestMode();
    setPromptVisible(false);
    setShowLoginForm(false);
  }, [enableGuestMode]);

  const requestLogin = useCallback(() => {
    setPromptVisible(true);
    setShowLoginForm(true);
  }, []);

  const providerValue = useMemo(
    () => ({
      requestLogin,
    }),
    [requestLogin]
  );

  return (
    <AuthUIProvider value={providerValue}>
      <div className="relative min-h-screen">
        {children}

        {promptVisible && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 px-4 py-8 backdrop-blur-sm">
            <div className="rounded-2xl bg-white shadow-2xl border border-indigo-100">
              {showLoginForm ? <AuthForm onContinueAsGuest={handleContinueAsGuest} /> : null}
            </div>
          </div>
        )}
      </div>
    </AuthUIProvider>
  );
}
