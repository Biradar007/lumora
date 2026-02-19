import { NextResponse } from 'next/server';
import { getServerAuth, getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';

interface UpsertResponse {
  profile: {
    uid: string;
    email: string;
    role: string;
    displayName?: string | null;
    photoUrl?: string | null;
    provider: string;
  };
  created: boolean;
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    let payload: { age?: number; gender?: string } = {};
    if (rawBody) {
      try {
        payload = JSON.parse(rawBody) as typeof payload;
      } catch (error) {
        console.warn('Failed to parse auth upsert payload', error);
      }
    }

    const authHeader = request.headers.get('authorization') ?? '';
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      return NextResponse.json({ error: 'missing_token' }, { status: 401 });
    }

    const token = match[1];
    const adminAuth = getServerAuth();
    const decoded = await adminAuth.verifyIdToken(token, true);

    const uid = decoded.uid;
    const emailRaw = decoded.email ?? '';
    if (!emailRaw) {
      return NextResponse.json({ error: 'email_required' }, { status: 400 });
    }

    const email = emailRaw.toLowerCase();
    const displayName = decoded.name ?? null;
    const photoUrl = decoded.picture ?? null;

    const requestedAge =
      typeof payload.age === 'number' && Number.isFinite(payload.age) ? Math.round(payload.age) : undefined;
    const requestedGender =
      typeof payload.gender === 'string' && payload.gender.trim().length > 0 ? payload.gender.trim() : undefined;

    const db = getServerFirestore();
    const docRef = db.collection('users').doc(uid);
    const snapshot = await docRef.get();
    const now = Date.now();

    if (snapshot.exists) {
      const data = snapshot.data() ?? {};
      const role = typeof data.role === 'string' ? data.role : 'user';
      const updatePayload: Record<string, unknown> = {
        email,
        emailLower: email,
        displayName,
        photoUrl,
        photoURL: photoUrl,
        provider: 'google',
        updatedAt: now,
        updatedAtIso: new Date(now).toISOString(),
      };
      if (requestedAge !== undefined) {
        updatePayload.age = requestedAge;
      }
      if (requestedGender) {
        updatePayload.gender = requestedGender;
      }

      const update = sanitizeForFirestore(updatePayload);

      await docRef.set(update, { merge: true });

      const response: UpsertResponse = {
        profile: {
          uid,
          email,
          role,
          displayName,
          photoUrl,
          provider: 'google',
        },
        created: false,
      };

      return NextResponse.json(response);
    }

    const role = 'user';
    const profilePayload: Record<string, unknown> = {
      uid,
      id: uid,
      email,
      emailLower: email,
      role,
      displayName,
      name: displayName,
      photoUrl,
      photoURL: photoUrl,
      provider: 'google',
      createdAt: now,
      createdAtIso: new Date(now).toISOString(),
      updatedAt: now,
      updatedAtIso: new Date(now).toISOString(),
    };
    if (requestedAge !== undefined) {
      profilePayload.age = requestedAge;
    }
    if (requestedGender) {
      profilePayload.gender = requestedGender;
    }

    const profile = sanitizeForFirestore(profilePayload);

    await docRef.set(profile);

    const response: UpsertResponse = {
      profile: {
        uid,
        email,
        role,
        displayName,
        photoUrl,
        provider: 'google',
      },
      created: true,
    };
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Failed to upsert Google auth profile', error);
    return NextResponse.json({ error: 'upsert_failed' }, { status: 500 });
  }
}
