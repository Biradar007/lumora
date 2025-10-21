import { NextResponse } from 'next/server';
import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { ProfileStatus, TherapistProfile } from '@/types/domain';

export const runtime = 'nodejs';

type UpsertPayload = Partial<
  Pick<
    TherapistProfile,
    | 'bio'
    | 'languages'
    | 'specialties'
    | 'credentials'
    | 'yearsExperience'
    | 'license'
    | 'modality'
    | 'timezone'
    | 'sessionLengthMinutes'
    | 'availability'
    | 'visible'
  >
> & { tenantId?: string };

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['therapist'] });
    const payload = (await request.json()) as UpsertPayload;
    const db = getServerFirestore();
    const profileRef = db.collection('therapistProfiles').doc(auth.userId);
    const snapshot = await profileRef.get();
    const now = Date.now();
    const existing = snapshot.exists ? (snapshot.data() as TherapistProfile) : null;

    const nextStatus: ProfileStatus = existing?.status ?? 'INCOMPLETE';

    const profile: TherapistProfile = {
      id: auth.userId,
      tenantId: payload.tenantId ?? auth.tenantId ?? existing?.tenantId,
      status: nextStatus,
      rejectionReason: existing?.rejectionReason,
      visible: payload.visible ?? existing?.visible ?? false,
      bio: payload.bio ?? existing?.bio,
      languages: payload.languages ?? existing?.languages ?? [],
      specialties: payload.specialties ?? existing?.specialties ?? [],
      credentials: payload.credentials ?? existing?.credentials ?? [],
      yearsExperience: payload.yearsExperience ?? existing?.yearsExperience,
      license: {
        number: payload.license?.number ?? existing?.license?.number,
        region: payload.license?.region ?? existing?.license?.region,
        docUrl: payload.license?.docUrl ?? existing?.license?.docUrl,
        verified: payload.license?.verified ?? existing?.license?.verified ?? false,
      },
      modality: {
        telehealth: payload.modality?.telehealth ?? existing?.modality?.telehealth ?? false,
        inPerson: payload.modality?.inPerson ?? existing?.modality?.inPerson ?? false,
      },
      timezone: payload.timezone ?? existing?.timezone,
      sessionLengthMinutes: payload.sessionLengthMinutes ?? existing?.sessionLengthMinutes,
      availability: payload.availability ?? existing?.availability ?? [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const sanitizedProfile = sanitizeForFirestore(profile);
    await profileRef.set(sanitizedProfile, { merge: true });

    return NextResponse.json({ profile: sanitizedProfile });
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['therapist'] });
    const db = getServerFirestore();
    const snapshot = await db.collection('therapistProfiles').doc(auth.userId).get();
    if (!snapshot.exists) {
      return NextResponse.json({ profile: null });
    }
    const profile = snapshot.data() as TherapistProfile;
    return NextResponse.json({ profile });
  } catch (error) {
    return jsonError(error);
  }
}
