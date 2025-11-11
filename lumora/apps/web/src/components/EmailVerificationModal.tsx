'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, MailCheck, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getFirebaseAuth, linkGoogleAccount } from '@/lib/auth';

type ManualState = 'idle' | 'sending' | 'codeSent' | 'verifying' | 'success';

interface EmailVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailVerificationModal({ isOpen, onClose }: EmailVerificationModalProps) {
  const { user, profile, refreshProfile } = useAuth();
  const [isClient, setIsClient] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [manualState, setManualState] = useState<ManualState>('idle');
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setLinkSuccess(null);
      setLinkError(null);
      setManualState('idle');
      setManualMessage(null);
      setManualError(null);
      setManualCode('');
      setLinkingGoogle(false);
    }
  }, [isOpen]);

  const closeWithDelay = () => {
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  const handleSendManualCode = async () => {
    if (manualState === 'sending') {
      return;
    }
    const email = user?.email ?? profile?.email ?? '';
    if (!email) {
      setManualError('Your account email is missing. Please contact support.');
      return;
    }
    setManualError(null);
    setManualMessage(null);
    setManualState('sending');
    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to send verification code.');
      }
      setManualState('codeSent');
      setManualMessage('Verification code sent! Please check your email.');
    } catch (error) {
      console.error('Failed to send manual verification code', error);
      setManualState('idle');
      setManualError(
        error instanceof Error ? error.message : 'We could not send the verification code. Please try again.'
      );
    }
  };

  const handleConfirmManualCode = async () => {
    if (manualState === 'verifying') {
      return;
    }
    const email = user?.email ?? profile?.email ?? '';
    if (!email) {
      setManualError('Your account email is missing. Please contact support.');
      return;
    }
    const trimmedCode = manualCode.trim();
    if (!/^[0-9]{6}$/.test(trimmedCode)) {
      setManualError('Enter the 6-digit verification code you received.');
      return;
    }
    setManualError(null);
    setManualMessage(null);
    setManualState('verifying');
    try {
      const response = await fetch('/api/auth/manual-verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, code: trimmedCode }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? 'Verification failed. Please try again.');
      }
      const authInstance = getFirebaseAuth();
      await authInstance.currentUser?.reload().catch(() => undefined);
      await refreshProfile();
      setManualState('success');
      setManualMessage('Email verified successfully!');
      closeWithDelay();
    } catch (error) {
      console.error('Manual verification failed', error);
      setManualState('codeSent');
      setManualError(error instanceof Error ? error.message : 'Verification failed. Please try again.');
    }
  };

  const handleLinkGoogle = async () => {
    const hasGoogleProvider = Boolean(
      user?.providerData?.some((provider) => provider.providerId === 'google.com')
    );
    const hasPasswordProvider = Boolean(
      user?.providerData?.some((provider) => provider.providerId === 'password')
    );
    const emailVerified = Boolean(user?.emailVerified);
    if (!hasPasswordProvider || hasGoogleProvider || emailVerified) {
      return;
    }
    setLinkError(null);
    setLinkSuccess(null);
    setLinkingGoogle(true);
    try {
      const expectedEmail = (profile?.email ?? user?.email ?? '').toLowerCase();
      await linkGoogleAccount(expectedEmail);
      const authInstance = getFirebaseAuth();
      await authInstance.currentUser?.reload().catch(() => undefined);
      await refreshProfile();
      setLinkSuccess('Google account linked successfully.');
      closeWithDelay();
    } catch (error) {
      console.error('Failed to link Google account', error);
      if (error instanceof Error) {
        setLinkError(error.message || 'Unable to link Google right now.');
      } else {
        setLinkError('Unable to link Google right now.');
      }
    } finally {
      setLinkingGoogle(false);
    }
  };

  if (!isClient || !isOpen) {
    return null;
  }

  const hasGoogleProvider = Boolean(user?.providerData?.some((provider) => provider.providerId === 'google.com'));
  const hasPasswordProvider = Boolean(user?.providerData?.some((provider) => provider.providerId === 'password'));

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-indigo-100 bg-white p-6 shadow-xl relative">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h3 className="text-xl font-semibold text-indigo-900">Verify your account</h3>
            <p className="text-sm text-indigo-700/80">
              Choose how you’d like to verify {user?.email ?? profile?.email ?? 'your email address'}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-indigo-600 text-sm font-semibold hover:underline"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <button
              type="button"
              onClick={handleLinkGoogle}
              disabled={linkingGoogle || !hasPasswordProvider || hasGoogleProvider}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60"
            >
              {linkingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
              {linkingGoogle ? 'Linking Google…' : 'Verify with Google'}
            </button>
            {linkSuccess && (
              <p className="mt-2 text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-2 py-1">
                {linkSuccess}
              </p>
            )}
            {linkError && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1">
                {linkError}
              </p>
            )}
          </div>
           <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-indigo-400">or with email code</span>
            </div>
          <div>
            <p className="text-xs text-indigo-700/80 mb-3">
              We’ll send a one-time verification code to your email. Enter it here to verify.
            </p>
            {manualState === 'codeSent' || manualState === 'verifying' || manualState === 'success' ? (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-indigo-900">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={manualCode}
                  onChange={(event) => setManualCode(event.target.value.replace(/\D+/g, ''))}
                  className="w-full rounded-lg border border-indigo-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  placeholder="Enter 6-digit code"
                  disabled={manualState === 'verifying' || manualState === 'success'}
                />
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={handleSendManualCode}
                    disabled={manualState === 'verifying' || manualState === 'success'}
                    className="text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-50"
                  >
                    Resend code
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmManualCode}
                    disabled={manualState === 'verifying'}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {manualState === 'verifying' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Verify code
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleSendManualCode}
                disabled={manualState === 'sending'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50 disabled:opacity-60"
              >
                {manualState === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
                Send verification code
              </button>
            )}
            {manualMessage && (
              <p className="mt-2 text-xs text-green-600 bg-green-50 border border-green-100 rounded-lg px-2 py-1">
                {manualMessage}
              </p>
            )}
            {manualError && (
              <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-2 py-1">
                {manualError}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
