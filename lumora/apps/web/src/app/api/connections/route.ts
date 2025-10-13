import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { Connection } from '@/types/domain';

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['user', 'therapist'] });
    const db = getServerFirestore();
    const connectionsRef = db.collection('connections');
    const field = auth.role === 'therapist' ? 'therapistId' : 'userId';
    const snapshot = await connectionsRef.where(field, '==', auth.userId).get();
    const connections: Connection[] = snapshot.docs.map((docSnapshot) => docSnapshot.data() as Connection);
    return NextResponse.json({ connections });
  } catch (error) {
    return jsonError(error);
  }
}
