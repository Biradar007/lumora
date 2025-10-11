'use client';

import { useEffect, useState } from 'react';
import { doc, getFirestore, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { TherapistProfile } from '@/types/domain';
import { getFirebaseApp } from '@/lib/firebase';

interface TherapistProfileState {
  profile: TherapistProfile | null;
  loading: boolean;
}

export function useTherapistProfile(userId?: string): TherapistProfileState {
  const { user } = useAuth();
  const [state, setState] = useState<TherapistProfileState>({ profile: null, loading: true });

  useEffect(() => {
    const id = userId ?? user?.uid;
    if (!id) {
      setState({ profile: null, loading: false });
      return;
    }
    const db = getFirestore(getFirebaseApp());
    let unsubscribe: Unsubscribe | undefined;
    unsubscribe = onSnapshot(doc(db, 'therapistProfiles', id), (snapshot) => {
      setState({ profile: (snapshot.data() as TherapistProfile | undefined) ?? null, loading: false });
    });
    return () => {
      unsubscribe?.();
    };
  }, [user?.uid, userId]);

  return state;
}
