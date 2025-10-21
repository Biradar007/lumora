import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { AiChatSession, Connection, Consent } from '@/types/domain';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

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
    const { id } = await context.params;
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
    if (connection.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'connection_inactive' }, { status: 403 });
    }

    const consentSnapshot = await db
      .collection('consents')
      .where('connectionId', '==', id)
      .where('therapistId', '==', auth.userId)
      .limit(1)
      .get();

    if (consentSnapshot.empty) {
      return NextResponse.json({ error: 'consent_required' }, { status: 403 });
    }
    const consent = consentSnapshot.docs[0].data() as Consent;
    if (!consent.scopes?.chatSummary || consent.revokedAt) {
      return NextResponse.json({ error: 'consent_required' }, { status: 403 });
    }

    const sessionsSnapshot = await db
      .collection('users')
      .doc(connection.userId)
      .collection('sessions')
      .orderBy('updatedAt', 'desc')
      .get();

    const sessions: AiChatSession[] = sessionsSnapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        title: data.title ?? null,
        createdAt: toMillis(data.createdAt),
        updatedAt: toMillis(data.updatedAt),
        lastMessagePreview: data.lastMessagePreview ?? null,
        model: data.model ?? undefined,
      };
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    return jsonError(error);
  }
}
