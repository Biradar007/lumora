import { cert, getApp, getApps, initializeApp, applicationDefault, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

function resolveCredential() {
  const serviceAccount =
    process.env.FIREBASE_SERVICE_ACCOUNT ??
    process.env.FIREBASE_ADMIN_CREDENTIAL ??
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (serviceAccount) {
    try {
      const parsed =
        typeof serviceAccount === 'string' ? JSON.parse(serviceAccount) : serviceAccount;
      return cert(parsed);
    } catch (error) {
      console.warn('Failed to parse Firebase admin credentials, falling back to application default.', error);
    }
  }
  return applicationDefault();
}

let firebaseAdminApp: App | null = null;
let firestoreInstance: Firestore | null = null;
let authInstance: Auth | null = null;

export function getServerFirebaseApp(): App {
  if (firebaseAdminApp) {
    return firebaseAdminApp;
  }
  firebaseAdminApp =
    getApps().length > 0
      ? getApp()
      : initializeApp({
          credential: resolveCredential(),
          projectId: process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
  return firebaseAdminApp;
}

export function getServerFirestore(): Firestore {
  if (!firestoreInstance) {
    firestoreInstance = getFirestore(getServerFirebaseApp());
  }
  return firestoreInstance;
}

export function getServerAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getServerFirebaseApp());
  }
  return authInstance;
}

export function sanitizeForFirestore<T>(value: T): T {
  if (value === undefined || value === null) {
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined) as unknown as T;
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, sanitizeForFirestore(entryValue)]);
    return Object.fromEntries(entries) as T;
  }
  return value;
}
