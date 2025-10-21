import { NextResponse } from 'next/server';
import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { TherapistProfile } from '@/types/domain';

export const runtime = 'nodejs';

interface UpdatePayload {
  action: 'approve' | 'reject';
  reason?: string;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    requireAuth(request, { roles: ['admin'] });
    const { id } = await context.params;
    const payload = (await request.json()) as UpdatePayload;
    if (payload.action !== 'approve' && payload.action !== 'reject') {
      return NextResponse.json({ error: 'invalid_action' }, { status: 400 });
    }

    const db = getServerFirestore();
    const profileRef = db.collection('therapistProfiles').doc(id);
    const snapshot = await profileRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'profile_not_found' }, { status: 404 });
    }

    const profile = snapshot.data() as TherapistProfile;
    const now = Date.now();

    if (payload.action === 'approve') {
      await profileRef.set(
        sanitizeForFirestore({
          status: 'VERIFIED',
          rejectionReason: null,
          visible: true,
          license: {
            ...profile.license,
            verified: true,
          },
          updatedAt: now,
        }),
        { merge: true }
      );
      return NextResponse.json({ status: 'VERIFIED', visible: true });
    }

    await profileRef.set(
      sanitizeForFirestore({
        status: 'REJECTED',
        rejectionReason: payload.reason ?? null,
        visible: false,
        license: {
          ...profile.license,
          verified: false,
        },
        updatedAt: now,
      }),
      { merge: true }
    );
    return NextResponse.json({ status: 'REJECTED', visible: false, rejectionReason: payload.reason ?? null });
  } catch (error) {
    return jsonError(error);
  }
}
