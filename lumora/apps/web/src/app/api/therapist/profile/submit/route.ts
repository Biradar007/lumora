import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { TherapistProfile } from '@/types/domain';

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['therapist'] });
    const db = getServerFirestore();
    const profileRef = db.collection('therapistProfiles').doc(auth.userId);
    const snapshot = await profileRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'profile_missing' }, { status: 400 });
    }
    const profile = snapshot.data() as TherapistProfile;
    const now = Date.now();
    await profileRef.set(
      {
        status: 'PENDING_REVIEW',
        updatedAt: now,
        createdAt: profile.createdAt ?? now,
        rejectionReason: null,
      },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
