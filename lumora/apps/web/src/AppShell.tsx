'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import LandingPage from './components/LandingPage';
import { useAuth } from '@/contexts/AuthContext';

const DEFAULT_USER_ROUTE = '/user/chat';

export default function AppShell() {
  const [showLanding, setShowLanding] = useState(true);
  const { loading, profile } = useAuth();
  const router = useRouter();
  const wasAuthenticatedRef = useRef(false);

  useEffect(() => {
    if (!loading && profile) {
      wasAuthenticatedRef.current = true;
    }
  }, [loading, profile]);

  useEffect(() => {
    if (loading) {
      return;
    }
    if (wasAuthenticatedRef.current && !profile) {
      wasAuthenticatedRef.current = false;
      setShowLanding(true);
    }
  }, [loading, profile]);

  const navigateToWorkspace = useCallback(() => {
    if (profile?.role === 'therapist') {
      router.replace('/therapist/dashboard');
      return;
    }
    if (profile?.role === 'admin') {
      router.replace('/admin');
      return;
    }
    router.replace(DEFAULT_USER_ROUTE);
  }, [profile?.role, router]);

  const dismissLanding = useCallback(() => {
    setShowLanding(false);
    if (!loading) {
      navigateToWorkspace();
    }
  }, [loading, navigateToWorkspace]);

  useEffect(() => {
    if (showLanding || loading) {
      return;
    }
    navigateToWorkspace();
  }, [loading, navigateToWorkspace, showLanding]);

  if (showLanding) {
    return <LandingPage onEnterApp={dismissLanding} />;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100">
      <div className="text-indigo-700 font-medium">Loading your workspace…</div>
    </div>
  );
}
