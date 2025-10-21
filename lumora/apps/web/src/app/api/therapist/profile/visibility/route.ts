import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { TherapistProfile } from '@/types/domain';

export const runtime = 'nodejs';

interface VisibilityPayload {
  visible: boolean;
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['therapist'] });
    const body = (await request.json()) as VisibilityPayload;
    const db = getServerFirestore();
    const profileRef = db.collection('therapistProfiles').doc(auth.userId);
    const snapshot = await profileRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'profile_missing' }, { status: 400 });
    }
    const profile = snapshot.data() as TherapistProfile;
    if (body.visible && profile.status !== 'VERIFIED') {
      return NextResponse.json({ error: 'profile_not_verified' }, { status: 400 });
    }
    await profileRef.set(
      {
        visible: body.visible,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
