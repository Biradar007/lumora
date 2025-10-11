import { NextResponse } from 'next/server';
import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { Connection } from '@/types/domain';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, { roles: ['user', 'therapist'] });
    const db = getServerFirestore();
    const connectionRef = db.collection('connections').doc(params.id);
    const snapshot = await connectionRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'connection_not_found' }, { status: 404 });
    }
    const connection = snapshot.data() as Connection;
    const isParty = connection.userId === auth.userId || connection.therapistId === auth.userId;
    if (!isParty) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
    if (connection.status === 'ENDED') {
      return NextResponse.json({ connection });
    }
    const now = Date.now();
    await connectionRef.set(
      sanitizeForFirestore({
        status: 'ENDED',
        endedAt: now,
      }),
      { merge: true }
    );

    const consentSnapshot = await db.collection('consents').where('connectionId', '==', connection.id).get();
    await Promise.all(
      consentSnapshot.docs.map((docSnapshot) =>
        docSnapshot.ref.set({ revokedAt: now }, { merge: true })
      )
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
