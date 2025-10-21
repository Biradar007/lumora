import { NextResponse } from 'next/server';
import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { ConnectionRequest } from '@/types/domain';

export const runtime = 'nodejs';

interface DeclinePayload {
  reason?: string;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  try {
    const auth = requireAuth(request, { roles: ['therapist'] });
    const { id } = await context.params;
    const body = (await request.json()) as DeclinePayload;
    const db = getServerFirestore();
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
    await requestRef.set(
      sanitizeForFirestore({
        status: 'DECLINED',
        respondedAt: Date.now(),
        declineReason: body?.reason,
      }),
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
