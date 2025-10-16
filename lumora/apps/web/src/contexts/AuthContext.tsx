'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getFirebaseApp } from '@/lib/firebaseClient';
import { getAuth, onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import type { AppUser, Role } from '@/types/domain';

export interface UserProfile extends AppUser {
  uid: string;
  name?: string;
  age?: number;
  gender?: string;
  createdAtIso?: string;
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
    const db = getFirestore(getFirebaseApp());
    const snapshot = await getDoc(doc(db, 'users', uid));
    if (!snapshot.exists()) {
      return null;
    }
    const value = snapshot.data() ?? {};
    const rawRole: string | undefined =
      typeof value.role === 'string' ? value.role : typeof value.accountType === 'string' ? value.accountType : undefined;
    let role: Role = 'user';
    if (rawRole === 'admin') {
      role = 'admin';
    } else if (rawRole === 'therapist') {
      role = 'therapist';
    }
    const createdAtNumber =
      typeof value.createdAt === 'number'
        ? value.createdAt
        : typeof value.createdAt === 'string'
          ? Date.parse(value.createdAt) || Date.now()
          : Date.now();

    return {
      id: uid,
      uid,
      email: value.email ?? '',
      role,
      displayName: value.displayName ?? value.name ?? undefined,
      photoUrl: value.photoUrl ?? value.photoURL ?? undefined,
      tenantId: value.tenantId ?? undefined,
      createdAt: createdAtNumber,
      name: value.name ?? value.displayName ?? undefined,
      age: typeof value.age === 'number' ? value.age : Number(value.age) || undefined,
      gender: typeof value.gender === 'string' ? value.gender : undefined,
      createdAtIso: typeof value.createdAt === 'string' ? value.createdAt : undefined,
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
    setGuestMode(true);
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
