import { NextResponse } from 'next/server';
import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { ConnectionRequest } from '@/types/domain';

interface CreateRequestPayload {
  therapistId: string;
  message?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const EXPIRY_MS = 14 * DAY_MS;

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['user'] });
    const body = (await request.json()) as CreateRequestPayload;
    if (!body?.therapistId) {
      return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
    }

    const db = getServerFirestore();
    const requestsRef = db.collection('connectionRequests');

    const duplicateSnapshot = await requestsRef
      .where('userId', '==', auth.userId)
      .where('therapistId', '==', body.therapistId)
      .where('status', '==', 'PENDING')
      .get();
    let hasActiveDuplicate = false;
    const now = Date.now();
    await Promise.all(
      duplicateSnapshot.docs.map(async (docSnapshot) => {
        const existing = docSnapshot.data() as ConnectionRequest;
        if (now - existing.createdAt > EXPIRY_MS) {
          await docSnapshot.ref.set(
            {
              status: 'EXPIRED',
              respondedAt: now,
            },
            { merge: true }
          );
          return;
        }
        hasActiveDuplicate = true;
      })
    );
    if (hasActiveDuplicate) {
      return NextResponse.json({ error: 'duplicate_request' }, { status: 409 });
    }

    const since = now - DAY_MS;
    const rateSnapshot = await requestsRef
      .where('userId', '==', auth.userId)
      .where('createdAt', '>=', since)
      .get();
    if (rateSnapshot.size >= 5) {
      return NextResponse.json({ error: 'rate_limit' }, { status: 429 });
    }

    const newRequestRef = requestsRef.doc();
    const newRequest: ConnectionRequest = {
      id: newRequestRef.id,
      tenantId: auth.tenantId,
      userId: auth.userId,
      therapistId: body.therapistId,
      message: body.message,
      status: 'PENDING',
      createdAt: Date.now(),
    };

    await newRequestRef.set(sanitizeForFirestore(newRequest));

    return NextResponse.json({ request: newRequest });
  } catch (error) {
    return jsonError(error);
  }
}
