'use client';

import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { AuthUIProvider } from '@/contexts/AuthUIContext';

export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const nextPath = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const loginPath = useMemo(() => `/login?next=${encodeURIComponent(nextPath)}`, [nextPath]);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      router.replace(loginPath);
    }
  }, [loading, loginPath, router, user]);

  const requestLogin = useCallback(() => {
    router.replace(loginPath);
  }, [loginPath, router]);

  const providerValue = useMemo(
    () => ({
      requestLogin,
    }),
    [requestLogin]
  );

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-600">
        Checking your session...
      </div>
    );
  }

  return (
    <AuthUIProvider value={providerValue}>
      <div className="relative min-h-screen">{children}</div>
    </AuthUIProvider>
  );
}
