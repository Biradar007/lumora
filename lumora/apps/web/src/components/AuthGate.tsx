'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthForm } from '@/components/AuthForm';
import { AuthUIProvider } from '@/contexts/AuthUIContext';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading, guestMode, enableGuestMode } = useAuth();
  const [promptVisible, setPromptVisible] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(true);

  useEffect(() => {
    if (loading) {
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
  }, [guestMode, loading, promptVisible, user]);

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
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-indigo-100">
              {showLoginForm ? (
                <div className="p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-indigo-900 text-center">Sign in to save your progress</h2>
                      <p className="text-sm text-indigo-700/80 text-center">
                        Your conversations and tools stay synced when you create an account.
                      </p>
                    </div>
                  </div>
                  <AuthForm />
                  <div className="mt-6 flex flex-col items-center gap-3">
                    <button
                      type="button"
                      onClick={handleContinueAsGuest}
                      className="inline-flex justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      No Thanks, Just Browse
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </AuthUIProvider>
  );
}
