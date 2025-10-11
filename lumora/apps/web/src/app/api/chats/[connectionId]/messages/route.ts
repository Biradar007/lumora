import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { ChatMessage, Connection } from '@/types/domain';

interface SendMessagePayload {
  content: string;
}

async function ensureConnection(connectionId: string, userId: string) {
  const db = getServerFirestore();
  const connectionRef = db.collection('connections').doc(connectionId);
  const snapshot = await connectionRef.get();
  if (!snapshot.exists) {
    return null;
  }
  const connection = snapshot.data() as Connection;
  if (connection.userId !== userId && connection.therapistId !== userId) {
    return null;
  }
  return connection;
}

export async function GET(request: Request, { params }: { params: { connectionId: string } }) {
  try {
    const auth = requireAuth(request, { roles: ['user', 'therapist'] });
    const connection = await ensureConnection(params.connectionId, auth.userId);
    if (!connection) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    const db = getServerFirestore();
    const messagesRef = db.collection('chats').doc(params.connectionId).collection('messages');
    const snapshot = await messagesRef.orderBy('createdAt', 'asc').get();
    const messages: ChatMessage[] = snapshot.docs.map((docSnapshot) => docSnapshot.data() as ChatMessage);
    return NextResponse.json({ messages });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request, { params }: { params: { connectionId: string } }) {
  try {
    const auth = requireAuth(request, { roles: ['user', 'therapist'] });
    const body = (await request.json()) as SendMessagePayload;
    if (!body?.content || body.content.trim().length === 0) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    const connection = await ensureConnection(params.connectionId, auth.userId);
    if (!connection) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (connection.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'connection_inactive' }, { status: 400 });
    }

    const db = getServerFirestore();
    const messagesRef = db.collection('chats').doc(params.connectionId).collection('messages');
    const messageRef = messagesRef.doc();
    const now = Date.now();
    const message: ChatMessage = {
      id: messageRef.id,
      chatId: params.connectionId,
      senderId: auth.userId,
      content: body.content,
      createdAt: now,
    };
    await messageRef.set(message);
    const chatRef = db.collection('chats').doc(params.connectionId);
    await chatRef.set(
      {
        id: params.connectionId,
        connectionId: params.connectionId,
        lastMessageAt: now,
      },
      { merge: true }
    );
    return NextResponse.json({ message });
  } catch (error) {
    return jsonError(error);
  }
}
