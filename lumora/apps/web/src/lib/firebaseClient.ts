import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth as getFirebaseAuth } from 'firebase/auth';
import { getFirestore as getFirebaseFirestore } from 'firebase/firestore';
import type { Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: 'AIzaSyBZjiyeNy0UHZzh6ZtjGM2QWzl7-FdJRSA',
  authDomain: 'lumoradb.firebaseapp.com',
  databaseURL: 'https://lumoradb-default-rtdb.firebaseio.com',
  projectId: 'lumoradb',
  storageBucket: 'lumoradb.firebasestorage.app',
  messagingSenderId: '218715484711',
  appId: '1:218715484711:web:c92a57404e49032a81d402',
  measurementId: 'G-6Z1JKRQ0HF',
};

let firebaseApp: FirebaseApp | undefined;
let analyticsInstance: Analytics | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (!firebaseApp) {
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return firebaseApp;
}

export function getFirebaseAuthClient() {
  return getFirebaseAuth(getFirebaseApp());
}

export function getFirebaseFirestoreClient() {
  return getFirebaseFirestore(getFirebaseApp());
}

export async function getFirebaseAnalytics(): Promise<Analytics | undefined> {
  if (analyticsInstance) {
    return analyticsInstance;
  }

  if (typeof window === 'undefined') {
    return undefined;
  }

  const { getAnalytics, isSupported } = await import('firebase/analytics');

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    return undefined;
  }

  analyticsInstance = getAnalytics(getFirebaseApp());
  return analyticsInstance;
}
