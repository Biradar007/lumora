import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { TherapistProfile } from '@/types/domain';

export const runtime = 'nodejs';

type DirectoryTherapist = TherapistProfile & {
  displayName?: string | null;
  email?: string | null;
  photoUrl?: string | null;
};

export async function GET(request: Request) {
  try {
    requireAuth(request, { roles: ['user', 'therapist'] });
    const db = getServerFirestore();
    const snapshot = await db
      .collection('therapistProfiles')
      .where('status', '==', 'VERIFIED')
      .where('visible', '==', true)
      .get();
    const therapists: DirectoryTherapist[] = await Promise.all(
      snapshot.docs.map(async (docSnapshot) => {
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
