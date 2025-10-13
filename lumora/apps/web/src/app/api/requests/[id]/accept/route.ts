import { NextResponse } from 'next/server';
import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { Connection, ConnectionRequest, Consent } from '@/types/domain';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = requireAuth(request, { roles: ['therapist'] });
    const db = getServerFirestore();
    const { id } = await context.params;
    const requestRef = db.collection('connectionRequests').doc(id);
    const snapshot = await requestRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'request_not_found' }, { status: 404 });
    }

    const requestData = snapshot.data() as ConnectionRequest;

    if (requestData.therapistId !== auth.userId) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    if (requestData.status !== 'PENDING') {
      return NextResponse.json({ error: 'request_not_pending' }, { status: 400 });
    }

    const connectionsRef = db.collection('connections');
    const connectionRef = connectionsRef.doc();
    const now = Date.now();

    const connection: Connection = {
      id: connectionRef.id,
      tenantId: requestData.tenantId ?? auth.tenantId,
      userId: requestData.userId,
      therapistId: auth.userId,
      status: 'ACTIVE',
      startedAt: now,
    };

    const consentRef = db.collection('consents').doc();
    const consent: Consent = {
      id: consentRef.id,
      connectionId: connection.id,
      userId: connection.userId,
      therapistId: connection.therapistId,
      scopes: {
        chatSummary: false,
        moodTrends: false,
        journals: false,
      },
      createdAt: now,
    };

    const chatRef = db.collection('chats').doc(connection.id);

    await Promise.all([
      connectionRef.set(sanitizeForFirestore(connection)),
      consentRef.set(consent),
      chatRef.set({ id: connection.id, connectionId: connection.id, lastMessageAt: null }),
      requestRef.set(sanitizeForFirestore({ status: 'ACCEPTED', respondedAt: now }), { merge: true }),
    ]);

    return NextResponse.json({ connection, consent });
  } catch (error) {
    return jsonError(error);
  }
}
