'use client';

import { getFirebaseApp } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  type Auth,
  type UserCredential,
} from 'firebase/auth';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';

export type RegistrationPayload = {
  email: string;
  password: string;
  name: string;
  age: number;
  gender: string;
  accountType: 'user' | 'therapist';
};

function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

export async function registerUser(payload: RegistrationPayload): Promise<UserCredential> {
  const auth = getFirebaseAuth();

  const credential = await createUserWithEmailAndPassword(auth, payload.email, payload.password);

  if (payload.name) {
    await updateProfile(credential.user, { displayName: payload.name });
  }

  const db = getDatabase(getFirebaseApp());
  const userRef = ref(db, `users/${credential.user.uid}`);

  await set(userRef, {
    uid: credential.user.uid,
    email: payload.email,
    name: payload.name,
    age: payload.age,
    gender: payload.gender,
    accountType: payload.accountType,
    createdAt: new Date().toISOString(),
  });

  return credential;
}

export async function loginUser(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}
