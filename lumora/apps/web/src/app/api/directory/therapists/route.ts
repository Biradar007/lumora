import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { TherapistProfile } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    requireAuth(request, { roles: ['user', 'therapist'] });
    const db = getServerFirestore();
    const snapshot = await db
      .collection('therapistProfiles')
      .where('status', '==', 'VERIFIED')
      .where('visible', '==', true)
      .get();
    const therapists: TherapistProfile[] = snapshot.docs.map((docSnapshot) => docSnapshot.data() as TherapistProfile);
    return NextResponse.json({ therapists });
  } catch (error) {
    return jsonError(error);
  }
}
