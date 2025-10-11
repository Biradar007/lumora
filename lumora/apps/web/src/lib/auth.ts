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
import { doc, getFirestore, setDoc } from 'firebase/firestore';

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

  const db = getFirestore(getFirebaseApp());
  const userDoc = doc(db, 'users', credential.user.uid);
  const createdAt = Date.now();

  await setDoc(userDoc, {
    uid: credential.user.uid,
    email: payload.email,
    id: credential.user.uid,
    role: payload.accountType,
    displayName: payload.name,
    name: payload.name,
    age: payload.age,
    gender: payload.gender,
    accountType: payload.accountType,
    createdAt,
    createdAtIso: new Date(createdAt).toISOString(),
  });

  return credential;
}

export async function loginUser(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}
