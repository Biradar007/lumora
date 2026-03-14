import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { Connection, Consent, MoodEntry } from '@/types/domain';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

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
    if (connection.clientRecordId && !connection.linkedUserId) {
      return NextResponse.json({ error: 'client_not_registered' }, { status: 403 });
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
    if (!consent.scopes?.moodTrends || consent.revokedAt) {
      return NextResponse.json({ error: 'consent_required' }, { status: 403 });
    }

    const moodsSnapshot = await db
      .collection('moodEntries')
      .where('userId', '==', connection.linkedUserId ?? connection.userId)
      .get();

    const entries: MoodEntry[] = moodsSnapshot.docs
      .map((docSnapshot) => docSnapshot.data() as MoodEntry)
      .sort((left, right) => right.createdAt - left.createdAt);

    return NextResponse.json({ entries });
  } catch (error) {
    return jsonError(error);
  }
}
