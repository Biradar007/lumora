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

    const db = getServerFirestore();
    const docRef = db.collection('users').doc(uid);
    const snapshot = await docRef.get();
    const now = Date.now();

    if (snapshot.exists) {
      const data = snapshot.data() ?? {};
      const role = typeof data.role === 'string' ? data.role : 'user';
      const update = sanitizeForFirestore({
        email,
        emailLower: email,
        displayName,
        photoUrl,
        photoURL: photoUrl,
        provider: 'google',
        updatedAt: now,
        updatedAtIso: new Date(now).toISOString(),
      });

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
    const profile = sanitizeForFirestore({
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
    });

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
