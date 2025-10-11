'use server';

import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import type { ProfileStatus, TherapistProfile } from '@/types/domain';

export interface UpsertTherapistProfileParams {
  userId: string;
  data: Partial<
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
      | 'tenantId'
    >
  >;
}

function mergeProfile(existing: TherapistProfile | null, userId: string, data: UpsertTherapistProfileParams['data']): TherapistProfile {
  const now = Date.now();
  const nextStatus: ProfileStatus = existing?.status ?? 'INCOMPLETE';
  return {
    id: userId,
    tenantId: data.tenantId ?? existing?.tenantId,
    status: nextStatus,
    visible: data.visible ?? existing?.visible ?? false,
    bio: data.bio ?? existing?.bio,
    languages: data.languages ?? existing?.languages ?? [],
    specialties: data.specialties ?? existing?.specialties ?? [],
    credentials: data.credentials ?? existing?.credentials ?? [],
    yearsExperience: data.yearsExperience ?? existing?.yearsExperience,
    license: {
      number: data.license?.number ?? existing?.license?.number,
      region: data.license?.region ?? existing?.license?.region,
      docUrl: data.license?.docUrl ?? existing?.license?.docUrl,
      verified: data.license?.verified ?? existing?.license?.verified ?? false,
    },
    modality: {
      telehealth: data.modality?.telehealth ?? existing?.modality?.telehealth ?? false,
      inPerson: data.modality?.inPerson ?? existing?.modality?.inPerson ?? false,
    },
    timezone: data.timezone ?? existing?.timezone,
    sessionLengthMinutes: data.sessionLengthMinutes ?? existing?.sessionLengthMinutes,
    availability: data.availability ?? existing?.availability ?? [],
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

export async function upsertTherapistProfile(params: UpsertTherapistProfileParams) {
  const db = getServerFirestore();
  const profileRef = db.collection('therapistProfiles').doc(params.userId);
  const snapshot = await profileRef.get();
  const existing = snapshot.exists ? (snapshot.data() as TherapistProfile) : null;
  const profile = mergeProfile(existing, params.userId, params.data);
  await profileRef.set(sanitizeForFirestore(profile), { merge: true });
  return profile;
}

export async function submitTherapistProfile(userId: string) {
  const db = getServerFirestore();
  const profileRef = db.collection('therapistProfiles').doc(userId);
  const snapshot = await profileRef.get();
  if (!snapshot.exists) {
    throw new Error('Profile not found');
  }
  const profile = snapshot.data() as TherapistProfile;
  const now = Date.now();
  await profileRef.set(
    {
      status: 'PENDING_REVIEW',
      updatedAt: now,
      createdAt: profile.createdAt ?? now,
    },
    { merge: true }
  );
}

export async function setTherapistVisibility(userId: string, visible: boolean) {
  const db = getServerFirestore();
  const profileRef = db.collection('therapistProfiles').doc(userId);
  const snapshot = await profileRef.get();
  if (!snapshot.exists) {
    throw new Error('Profile not found');
  }
  const profile = snapshot.data() as TherapistProfile;
  if (visible && profile.status !== 'VERIFIED') {
    throw new Error('Profile must be verified before becoming visible');
  }
  await profileRef.set(
    {
      visible,
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}

export async function markTherapistVerified(userId: string) {
  const db = getServerFirestore();
  const profileRef = db.collection('therapistProfiles').doc(userId);
  const snapshot = await profileRef.get();
  if (!snapshot.exists) {
    throw new Error('Profile not found');
  }
  await profileRef.set(
    {
      status: 'VERIFIED',
      updatedAt: Date.now(),
    },
    { merge: true }
  );
}
