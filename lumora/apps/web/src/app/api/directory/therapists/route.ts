import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { Connection, TherapistProfile } from '@/types/domain';

export const runtime = 'nodejs';

type DirectoryTherapist = TherapistProfile & {
  displayName?: string | null;
  email?: string | null;
  photoUrl?: string | null;
};

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['user', 'therapist'] });
    const db = getServerFirestore();
    const visibleSnapshot = await db
      .collection('therapistProfiles')
      .where('status', '==', 'VERIFIED')
      .where('visible', '==', true)
      .get();

    const connectedTherapistIds =
      auth.role === 'user'
        ? (
            await db.collection('connections').where('userId', '==', auth.userId).get()
          ).docs.map((docSnapshot) => (docSnapshot.data() as Connection).therapistId)
        : [];

    const profileIds = Array.from(
      new Set([
        ...visibleSnapshot.docs.map((docSnapshot) => docSnapshot.id),
        ...connectedTherapistIds.filter(Boolean),
      ])
    );

    const profileSnapshots = await Promise.all(
      profileIds.map(async (profileId) => {
        const visibleMatch = visibleSnapshot.docs.find((docSnapshot) => docSnapshot.id === profileId);
        if (visibleMatch) {
          return visibleMatch;
        }
        return db.collection('therapistProfiles').doc(profileId).get();
      })
    );

    const therapists: DirectoryTherapist[] = await Promise.all(
      profileSnapshots
        .filter((docSnapshot) => docSnapshot.exists)
        .map(async (docSnapshot) => {
        const profile = docSnapshot.data() as TherapistProfile;
        try {
          const userSnapshot = await db.collection('users').doc(profile.id).get();
          const userData = userSnapshot.data() ?? {};
          return {
            ...profile,
            displayName: userData.Name ?? userData.displayName ?? userData.name ?? userData.email ?? profile.id,
            email: userData.email ?? null,
            photoUrl: userData.photoURL ?? userData.photoUrl ?? null,
          } satisfies DirectoryTherapist;
        } catch (error) {
          console.warn('Failed to hydrate therapist user profile', profile.id, error);
          return {
            ...profile,
            displayName: profile.id,
            email: null,
            photoUrl: null,
          } satisfies DirectoryTherapist;
        }
      })
    );
    return NextResponse.json({ therapists });
  } catch (error) {
    return jsonError(error);
  }
}
