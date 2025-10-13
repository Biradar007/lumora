import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { TherapistProfile } from '@/types/domain';

export const runtime = 'nodejs';

interface AdminTherapistListing {
  id: string;
  profile: TherapistProfile;
  user: {
    email?: string;
    displayName?: string;
    role?: string;
    createdAt?: number;
  };
}

export async function GET(request: Request) {
  try {
    requireAuth(request, { roles: ['admin'] });
    const db = getServerFirestore();
    const snapshot = await db.collection('therapistProfiles').orderBy('updatedAt', 'desc').get();

    const therapists: AdminTherapistListing[] = await Promise.all(
      snapshot.docs.map(async (docSnapshot) => {
        const profile = docSnapshot.data() as TherapistProfile;
        const userSnapshot = await db.collection('users').doc(profile.id).get();
        const userData = userSnapshot.data() ?? {};
        return {
          id: profile.id,
          profile,
          user: {
            email: userData.email,
            displayName: userData.displayName ?? userData.name,
            role: userData.role ?? userData.accountType,
            createdAt: typeof userData.createdAt === 'number' ? userData.createdAt : undefined,
          },
        } satisfies AdminTherapistListing;
      })
    );

    return NextResponse.json({ therapists });
  } catch (error) {
    return jsonError(error);
  }
}
