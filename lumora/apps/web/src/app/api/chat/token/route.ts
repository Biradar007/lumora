import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireAuth, jsonError } from '@/lib/apiAuth';
import { getServerFirestore } from '@/lib/firestoreServer';

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['user', 'therapist'] });
    const { sessionId } = (await request.json()) as { sessionId?: string };

    if (!sessionId) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    const db = getServerFirestore();
    const userRef = db.collection('users').doc(auth.userId);
    const sessionRef = userRef.collection('sessions').doc(sessionId);
    const sessionSnapshot = await sessionRef.get();

    if (!sessionSnapshot.exists) {
      return NextResponse.json({ error: 'session_not_found' }, { status: 404 });
    }

    const tokensRef = userRef.collection('sessionTokens');
    const existingTokensSnapshot = await tokensRef.get();
    await Promise.all(
      existingTokensSnapshot.docs.map(async (docSnapshot) => {
        const data = docSnapshot.data() as { expiresAt?: number };
        if (!data.expiresAt || data.expiresAt < Date.now()) {
          await docSnapshot.ref.delete().catch(() => undefined);
        }
      })
    );

    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + TOKEN_TTL_MS;

    await tokensRef
      .doc(token)
      .set({
        sessionId,
        createdAt: Date.now(),
        expiresAt,
      });

    return NextResponse.json({ token, expiresAt });
  } catch (error) {
    return jsonError(error);
  }
}
