import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { ConnectionRequest } from '@/types/domain';

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['therapist'] });
    const db = getServerFirestore();
    const snapshot = await db
      .collection('connectionRequests')
      .where('therapistId', '==', auth.userId)
      .where('status', '==', 'PENDING')
      .get();
    const requests: ConnectionRequest[] = snapshot.docs.map((docSnapshot) => docSnapshot.data() as ConnectionRequest);
    return NextResponse.json({ requests });
  } catch (error) {
    return jsonError(error);
  }
}
