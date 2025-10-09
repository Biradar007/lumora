'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getFirebaseApp } from '@/lib/firebase';
import { getAuth, onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { getDatabase, ref, get } from 'firebase/database';

type AccountType = 'user' | 'therapist';

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  age: number;
  gender: string;
  accountType: AccountType;
  createdAt?: string;
}

interface AuthContextValue {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  guestMode: boolean;
  enableGuestMode: () => void;
  disableGuestMode: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const db = getDatabase(getFirebaseApp());
    const snapshot = await get(ref(db, `users/${uid}`));
    if (!snapshot.exists()) {
      return null;
    }
    const value = snapshot.val();
    return {
      uid,
      email: value.email ?? '',
      name: value.name ?? '',
      age: typeof value.age === 'number' ? value.age : Number(value.age) || 0,
      gender: value.gender ?? '',
      accountType: value.accountType === 'therapist' ? 'therapist' : 'user',
      createdAt: value.createdAt,
    };
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(false);

  const loadProfile = useCallback(
    async (firebaseUser: FirebaseUser | null) => {
      if (!firebaseUser) {
        setProfile(null);
        return;
      }
      const freshProfile = await fetchUserProfile(firebaseUser.uid);
      setProfile(freshProfile);
    },
    []
  );

  useEffect(() => {
    const app = getFirebaseApp();
    const auth = getAuth(app);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        setGuestMode(false);
      }
      await loadProfile(firebaseUser);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, [loadProfile]);

  const logout = useCallback(async () => {
    const auth = getAuth(getFirebaseApp());
    await signOut(auth);
    setGuestMode(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    const auth = getAuth(getFirebaseApp());
    const currentUser = auth.currentUser ?? user;
    if (currentUser && !user) {
      setUser(currentUser);
    }
    await loadProfile(currentUser);
  }, [loadProfile, user]);

  const enableGuestMode = useCallback(() => {
    setGuestMode(true);
  }, []);

  const disableGuestMode = useCallback(() => {
    setGuestMode(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      logout,
      refreshProfile,
      guestMode,
      enableGuestMode,
      disableGuestMode,
    }),
    [disableGuestMode, enableGuestMode, guestMode, loading, logout, profile, refreshProfile, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
