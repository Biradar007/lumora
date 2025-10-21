import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { AiChatMessage, Connection, Consent } from '@/types/domain';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string; sessionId: string }> };

function toMillis(value: unknown): number | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'object' && value !== null && typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis();
  }
  return undefined;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const auth = requireAuth(request, { roles: ['therapist'] });
    const { id, sessionId } = await context.params;
    const db = getServerFirestore();

    const connectionRef = db.collection('connections').doc(id);
    const connectionSnapshot = await connectionRef.get();
    if (!connectionSnapshot.exists) {
      return NextResponse.json({ error: 'connection_not_found' }, { status: 404 });
    }
    const connection = connectionSnapshot.data() as Connection;
    if (connection.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const consentSnapshot = await db
      .collection('consents')
      .where('connectionId', '==', id)
      .where('therapistId', '==', auth.userId)
      .limit(1)
      .get();

    if (
      consentSnapshot.empty ||
      !(consentSnapshot.docs[0].data() as Consent).scopes?.chatSummary
    ) {
      return NextResponse.json({ error: 'consent_required' }, { status: 403 });
    }

    const sessionRef = db.collection('users').doc(connection.userId).collection('sessions').doc(sessionId);
    const sessionSnapshot = await sessionRef.get();
    if (!sessionSnapshot.exists) {
      return NextResponse.json({ error: 'session_not_found' }, { status: 404 });
    }

    const messagesSnapshot = await sessionRef.collection('messages').orderBy('createdAt', 'asc').get();
    const messages: AiChatMessage[] = messagesSnapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        role: data.role ?? 'assistant',
        content: data.content ?? '',
        createdAt: toMillis(data.createdAt),
      };
    });

    return NextResponse.json({ messages });
  } catch (error) {
    return jsonError(error);
  }
}
