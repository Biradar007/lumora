'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function useApiHeaders(): Record<string, string> {
  const { user, profile } = useAuth();
  return useMemo(() => {
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    if (user?.uid) {
      headers['x-user-id'] = user.uid;
    }
    if (profile?.role) {
      headers['x-user-role'] = profile.role;
    }
    return headers;
  }, [profile?.role, user?.uid]);
}
