'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/components/AuthGate';
import { useAuth } from '@/contexts/AuthContext';
import { createCheckoutSessionUrl, getBillingErrorMessage } from '@/lib/billingClient';

function BillingUpgradeContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(async () => {
    if (!user) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const checkoutUrl = await createCheckoutSessionUrl({
        idToken: token,
        returnPath: '/user/dashboard',
      });
      window.location.assign(checkoutUrl);
    } catch (checkoutError) {
      console.error('Failed to start checkout from upgrade page', checkoutError);
      const errorCode = checkoutError instanceof Error ? checkoutError.message : 'billing_session_failed';
      setError(getBillingErrorMessage(errorCode));
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void startCheckout();
  }, [startCheckout]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Redirecting to secure checkout…</h1>
        <p className="mt-2 text-sm text-slate-600">
          {loading ? 'Please wait while we open Stripe Checkout.' : 'We could not start checkout.'}
        </p>

        {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {!loading ? (
            <button
              type="button"
              onClick={() => void startCheckout()}
              className="inline-flex items-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Try again
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.push('/user/dashboard')}
            className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to dashboard
          </button>
          <Link
            href="/#pricing"
            className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to pricing
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function BillingUpgradePage() {
  return (
    <AuthGate>
      <div className="min-h-screen bg-slate-50">
        <BillingUpgradeContent />
      </div>
    </AuthGate>
  );
}
