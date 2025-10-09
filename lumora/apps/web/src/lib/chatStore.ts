'use client';

import { getFirebaseApp } from '@/lib/firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  type DocumentData,
  type DocumentReference,
  type QueryDocumentSnapshot,
  type Unsubscribe,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

export type ChatMessageRole = 'user' | 'assistant' | 'system';

export interface SessionRecord {
  id: string;
  title: string | null;
  createdAt?: Date;
  updatedAt?: Date;
  model?: string;
  meta?: Record<string, unknown> | null;
  lastMessagePreview?: string | null;
}

export interface MessageRecord {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt?: Date;
  tokensIn?: number;
  tokensOut?: number;
}

export interface ListSessionsOptions {
  limit?: number;
  startAfter?: QueryDocumentSnapshot<DocumentData>;
  onError?: (error: unknown) => void;
}

export interface SubscribeMessagesOptions {
  limit?: number;
  startAfter?: QueryDocumentSnapshot<DocumentData>;
  onError?: (error: unknown) => void;
}

function getUserSessionsCollection(uid: string) {
  const db = getFirestore(getFirebaseApp());
  return collection(db, 'users', uid, 'sessions');
}

function buildSessionRef(uid: string, sessionId: string): DocumentReference<DocumentData> {
  const db = getFirestore(getFirebaseApp());
  return doc(db, 'users', uid, 'sessions', sessionId);
}

function sessionDataFromSnapshot(snapshot: QueryDocumentSnapshot<DocumentData>): SessionRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: (data.title ?? null) as string | null,
    createdAt: data.createdAt?.toDate?.() ?? undefined,
    updatedAt: data.updatedAt?.toDate?.() ?? undefined,
    model: data.model ?? undefined,
    meta: data.meta ?? null,
    lastMessagePreview: data.lastMessagePreview ?? null,
  };
}

function messageDataFromSnapshot(snapshot: QueryDocumentSnapshot<DocumentData>): MessageRecord {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    role: data.role as ChatMessageRole,
    content: data.content ?? '',
    createdAt: data.createdAt?.toDate?.() ?? undefined,
    tokensIn: data.tokensIn ?? undefined,
    tokensOut: data.tokensOut ?? undefined,
  };
}

function generateTitleFromContent(content: string): string {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'New conversation';
  return cleaned.length > 60 ? `${cleaned.slice(0, 57)}…` : cleaned;
}

function previewFromContent(content: string): string {
  const cleaned = content.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return '';
  }
  return cleaned.length > 160 ? `${cleaned.slice(0, 157)}…` : cleaned;
}

export async function createSession(
  uid: string,
  options: { title?: string; model?: string; meta?: Record<string, unknown> } = {}
): Promise<string> {
  const sessionsCollection = getUserSessionsCollection(uid);
  const sessionRef = doc(sessionsCollection);
  const payload: Record<string, unknown> = {
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (options.title) {
    payload.title = options.title;
  }
  if (options.model) {
    payload.model = options.model;
  }
  if (options.meta) {
    payload.meta = options.meta;
  }

  await setDoc(sessionRef, payload);
  return sessionRef.id;
}

export interface AddMessageOptions {
  tokensIn?: number;
  tokensOut?: number;
  model?: string;
}

export async function addMessage(
  uid: string,
  sessionId: string,
  role: ChatMessageRole,
  content: string,
  options: AddMessageOptions = {}
): Promise<string> {
  if (!content.trim()) {
    throw new Error('Message content is required');
  }

  const db = getFirestore(getFirebaseApp());
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);

  const messageRef = doc(collection(sessionRef, 'messages'));
  await setDoc(messageRef, {
    role,
    content,
    createdAt: serverTimestamp(),
    ...(options.tokensIn !== undefined ? { tokensIn: options.tokensIn } : {}),
    ...(options.tokensOut !== undefined ? { tokensOut: options.tokensOut } : {}),
  });

  const updates: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
    lastMessagePreview: previewFromContent(content),
  };

  if (options.model) {
    updates.model = options.model;
  }

  if (role === 'user') {
    const snapshot = await getDoc(sessionRef);
    const existingTitle = snapshot.exists() ? snapshot.data()?.title : undefined;
    if (!existingTitle) {
      updates.title = generateTitleFromContent(content);
    }
  }

  await updateDoc(sessionRef, updates);
  return messageRef.id;
}

export function listSessions(
  uid: string,
  options: ListSessionsOptions = {},
  onNext: (sessions: SessionRecord[], snapshot: QueryDocumentSnapshot<DocumentData>[]) => void
): Unsubscribe {
  const { limit: pageSize = 20, startAfter: startAfterDoc, onError } = options;
  const sessionsCollection = getUserSessionsCollection(uid);
  let sessionsQuery = query(sessionsCollection, orderBy('updatedAt', 'desc'), limit(pageSize));

  if (startAfterDoc) {
    sessionsQuery = query(sessionsQuery, startAfter(startAfterDoc));
  }

  return onSnapshot(
    sessionsQuery,
    (snapshot) => {
      const docs = snapshot.docs as QueryDocumentSnapshot<DocumentData>[];
      onNext(
        docs.map((docSnapshot) => sessionDataFromSnapshot(docSnapshot)),
        docs
      );
    },
    (error) => {
      console.error('Failed to list sessions:', error);
      onError?.(error);
    }
  );
}

export function subscribeMessages(
  uid: string,
  sessionId: string,
  options: SubscribeMessagesOptions = {},
  onNext: (messages: MessageRecord[], docs: QueryDocumentSnapshot<DocumentData>[]) => void
): Unsubscribe {
  const { limit: pageSize = 50, startAfter: startAfterDoc, onError } = options;
  const db = getFirestore(getFirebaseApp());
  const messagesCollection = collection(db, 'users', uid, 'sessions', sessionId, 'messages');

  let messagesQuery = query(messagesCollection, orderBy('createdAt', 'asc'), limit(pageSize));
  if (startAfterDoc) {
    messagesQuery = query(messagesQuery, startAfter(startAfterDoc));
  }

  return onSnapshot(
    messagesQuery,
    (snapshot) => {
      const docs = snapshot.docs as QueryDocumentSnapshot<DocumentData>[];
      onNext(
        docs.map((docSnapshot) => messageDataFromSnapshot(docSnapshot)),
        docs
      );
    },
    (error) => {
      console.error('Failed to subscribe to messages:', error);
      onError?.(error);
    }
  );
}

export async function renameSession(uid: string, sessionId: string, title: string): Promise<void> {
  const sessionRef = buildSessionRef(uid, sessionId);
  await updateDoc(sessionRef, {
    title,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSession(uid: string, sessionId: string): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const sessionRef = doc(db, 'users', uid, 'sessions', sessionId);
  const messagesCollection = collection(sessionRef, 'messages');

  const batchDelete = async () => {
    const snapshot = await getDocs(query(messagesCollection, limit(500)));
    if (snapshot.empty) {
      return false;
    }

    const batch = writeBatch(db);
    snapshot.docs.forEach((messageDoc) => {
      batch.delete(messageDoc.ref);
    });
    await batch.commit();
    return snapshot.size === 500;
  };

  let shouldContinue = true;
  while (shouldContinue) {
    shouldContinue = await batchDelete();
  }

  await deleteDoc(sessionRef);
}

export async function getOrCreateActiveSession(uid: string): Promise<string> {
  const sessionsCollection = getUserSessionsCollection(uid);
  const recentSessions = await getDocs(query(sessionsCollection, orderBy('updatedAt', 'desc'), limit(1)));
  if (!recentSessions.empty) {
    return recentSessions.docs[0].id;
  }
  return createSession(uid);
}
