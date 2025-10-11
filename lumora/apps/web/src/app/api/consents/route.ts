import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { Consent, ConsentScopes, Connection } from '@/types/domain';

interface ConsentPayload {
  connectionId: string;
  scopes: ConsentScopes;
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['user', 'therapist'] });
    const body = (await request.json()) as ConsentPayload;
    if (!body?.connectionId || !body?.scopes) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }
    const db = getServerFirestore();
    const connectionRef = db.collection('connections').doc(body.connectionId);
    const connectionSnapshot = await connectionRef.get();
    if (!connectionSnapshot.exists) {
      return NextResponse.json({ error: 'connection_not_found' }, { status: 404 });
    }
    const connection = connectionSnapshot.data() as Connection;
    const isUser = connection.userId === auth.userId;
    const isTherapist = connection.therapistId === auth.userId;
    if (!isUser && !isTherapist) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    const consentsRef = db.collection('consents');
    const existingSnapshot = await consentsRef
      .where('connectionId', '==', body.connectionId)
      .where('userId', '==', connection.userId)
      .get();
    const now = Date.now();

    if (existingSnapshot.empty) {
      const consentRef = consentsRef.doc();
      const consent: Consent = {
        id: consentRef.id,
        connectionId: body.connectionId,
        userId: connection.userId,
        therapistId: connection.therapistId,
        scopes: body.scopes,
        createdAt: now,
      };
      await consentRef.set(consent);
      return NextResponse.json({ consent });
    }

    const consentDoc = existingSnapshot.docs[0];
    await consentDoc.ref.set(
      {
        scopes: body.scopes,
        revokedAt: null,
      },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
