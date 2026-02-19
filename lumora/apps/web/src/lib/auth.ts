'use client';

import { getFirebaseApp } from '@/lib/firebaseClient';
import {
  GoogleAuthProvider,
  getAdditionalUserInfo,
  linkWithPopup,
  unlink,
  signInWithEmailAndPassword,
  signInWithPopup,
  type Auth,
  type UserCredential,
} from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import type { Role } from '@/types/domain';

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

async function postJson<T>(url: string, payload: unknown, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
    body: JSON.stringify(payload ?? {}),
    ...init,
  });
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    const error = (data as { error?: string }).error ?? 'request_failed';
    throw new Error(error);
  }
  return data;
}

function resolveRole(value: unknown): Role {
  if (value === 'therapist' || value === 'admin' || value === 'user') {
    return value;
  }
  return 'user';
}

export async function loginUser(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, normalizeEmail(email), password);
}

export async function requestSignupCode(email: string): Promise<void> {
  await postJson('/api/auth/request-code', {
    email: normalizeEmail(email),
  });
}

export interface VerifySignupCodeParams {
  email: string;
  code: string;
  password: string;
  name: string;
  age?: number;
  gender?: string;
}

export interface VerifySignupCodeResult {
  uid: string;
  role: Role;
}

export async function verifySignupCode(payload: VerifySignupCodeParams): Promise<VerifySignupCodeResult> {
  const normalizedEmail = normalizeEmail(payload.email);
  const body = {
    email: normalizedEmail,
    code: payload.code.trim(),
    password: payload.password,
    name: payload.name.trim(),
    age: typeof payload.age === 'number' ? payload.age : undefined,
    gender: payload.gender ?? undefined,
  };

  const data = await postJson<{ ok: boolean; user: { uid: string; email: string; role: Role } }>(
    '/api/auth/verify-code',
    body
  );
  return {
    uid: data.user.uid,
    role: resolveRole(data.user.role),
  };
}

export interface GoogleSignInResult {
  role: Role | null;
  created: boolean;
  idToken: string;
}

export async function signInWithGooglePopup(): Promise<GoogleSignInResult> {
  const auth = getFirebaseAuth();
  const credential = await signInWithPopup(auth, googleProvider);
  const idToken = await credential.user.getIdToken(true);
  const additionalInfo = getAdditionalUserInfo(credential);
  const isNewUser = Boolean(additionalInfo?.isNewUser);

  if (isNewUser) {
    return {
      role: null,
      created: true,
      idToken,
    };
  }

  const data = await postJson<{
    profile: { role: string };
    created: boolean;
  }>('/api/auth/upsert', {}, {
    headers: {
      authorization: `Bearer ${idToken}`,
    },
  });

  return {
    role: resolveRole(data.profile.role),
    created: Boolean(data.created),
    idToken,
  };
}

export async function linkGoogleAccount(expectedEmail?: string): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) {
    throw new Error('not_authenticated');
  }
  const credential = await linkWithPopup(user, googleProvider);
  const additionalInfo = getAdditionalUserInfo(credential);
  const additionalEmail =
    (typeof additionalInfo?.profile === 'object' && additionalInfo?.profile && 'email' in additionalInfo.profile
      ? ((additionalInfo.profile as { email?: string }).email ?? undefined)
      : undefined) ?? undefined;
  const providerEmail =
    credential.user.providerData.find((provider) => provider.providerId === 'google.com')?.email ?? additionalEmail;
  const googleEmail = providerEmail?.toLowerCase().trim() ?? null;
  const primaryEmail = expectedEmail?.toLowerCase()?.trim() ?? user.email?.toLowerCase()?.trim() ?? null;

  if (primaryEmail && googleEmail && primaryEmail !== googleEmail) {
    await unlink(user, 'google.com').catch(() => undefined);
    throw new Error(`Link the Google account that uses ${primaryEmail}. This account (${googleEmail}) does not match.`);
  }

  const idToken = await credential.user.getIdToken(true);
  await postJson('/api/auth/upsert', null, {
    headers: {
      authorization: `Bearer ${idToken}`,
    },
  });
}

export { getFirebaseAuth };

export async function completeGoogleSignup(
  idToken: string,
  payload: { age: number; gender: string }
): Promise<Role> {
  const data = await postJson<{
    profile: { role: string };
  }>('/api/auth/upsert', payload, {
    headers: {
      authorization: `Bearer ${idToken}`,
    },
  });
  return resolveRole(data.profile.role);
}
