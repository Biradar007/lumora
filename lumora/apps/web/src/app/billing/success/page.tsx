'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthGate } from '@/components/AuthGate';
import { useAuth } from '@/contexts/AuthContext';

type Plan = 'free' | 'pro';

type MeResponse = {
  user?: {
    plan?: Plan;
  };
};

function BillingSuccessContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionId = searchParams.get('session_id')?.trim() ?? '';
  const nextPath = useMemo(() => {
    const value = searchParams.get('next');
    if (!value) {
      return '/user/dashboard';
    }
    if (!value.startsWith('/') || value.startsWith('//')) {
      return '/user/dashboard';
    }
    return value;
  }, [searchParams]);

  const refreshStatus = useCallback(async () => {
    if (!user) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = await user.getIdToken();

      if (sessionId) {
        await fetch('/api/billing/confirm-session', {
          method: 'POST',
          headers: {
            authorization: `Bearer ${token}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
          }),
        });
      }

      const response = await fetch('/api/me', {
        method: 'GET',
        headers: {
          authorization: `Bearer ${token}`,
        },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error('plan_refresh_failed');
      }

      const payload = (await response.json()) as MeResponse;
      setPlan(payload.user?.plan === 'pro' ? 'pro' : 'free');
    } catch (refreshError) {
      console.error('Failed to refresh billing status', refreshError);
      setError('Could not refresh your status right now.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, user]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    if (!user || plan === 'pro') {
      return;
    }
    const interval = window.setInterval(() => {
      void refreshStatus();
    }, 4000);
    return () => {
      window.clearInterval(interval);
    };
  }, [plan, refreshStatus, user]);

  useEffect(() => {
    if (plan !== 'pro') {
      return;
    }
    const timeout = window.setTimeout(() => {
      router.replace(nextPath);
    }, 700);
    return () => {
      window.clearTimeout(timeout);
    };
  }, [nextPath, plan, router]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Payment received. Activating Pro…</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your plan will update after Stripe webhook processing finishes.
        </p>

        <p className="mt-4 text-sm text-slate-700">
          Current plan:{' '}
          <span className="font-semibold text-slate-900">
            {plan ? (plan === 'pro' ? 'Pro' : 'Free') : 'Checking…'}
          </span>
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void refreshStatus()}
            disabled={loading}
            className="inline-flex items-center rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Refreshing…' : 'Refresh status'}
          </button>
          <Link
            href={nextPath}
            className="inline-flex items-center rounded-full border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Continue
          </Link>
        </div>

        {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <AuthGate>
      <div className="min-h-screen bg-slate-50">
        <BillingSuccessContent />
      </div>
    </AuthGate>
  );
}
