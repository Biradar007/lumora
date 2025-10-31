import { NextResponse } from 'next/server';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { getServerAuth, getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import { hashOtpCode, normalizeEmail } from '@/lib/otp';

const MAX_ATTEMPTS = 5;
const VERIFY_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const VERIFY_RATE_LIMIT_MAX_ATTEMPTS = 10;

function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const [first] = forwarded.split(',');
    if (first?.trim()) {
      return first.trim();
    }
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return 'unknown';
}

function hashValue(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

async function updateVerifyRateLimit({
  db,
  ip,
  now,
}: {
  db: Firestore;
  ip: string;
  now: number;
}) {
  const docId = `verify_${hashValue(ip)}`;
  const ref = db.collection('email_verification_rate_limits').doc(docId);
  const snapshot = await ref.get();
  if (snapshot.exists) {
    const data = snapshot.data() ?? {};
    const windowStart = typeof data.windowStart === 'number' ? data.windowStart : now;
    const count = typeof data.count === 'number' ? data.count : 0;
    if (now - windowStart < VERIFY_RATE_LIMIT_WINDOW_MS) {
      if (count >= VERIFY_RATE_LIMIT_MAX_ATTEMPTS) {
        return false;
      }
      await ref.update({
        count: FieldValue.increment(1),
        updatedAt: now,
      });
      return true;
    }
  }
  await ref.set({
    ip,
    windowStart: now,
    count: 1,
    updatedAt: now,
  });
  return true;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      code?: string;
      password?: string;
      name?: string;
      role?: string;
      age?: number | string;
      gender?: string;
    };

    const emailRaw = body.email;
    const codeRaw = body.code;
    const password = body.password;
    const name = body.name?.trim() ?? '';
    const requestedRole = body.role === 'therapist' ? 'therapist' : 'user';
    const ageRaw = body.age;
    const genderRaw = body.gender;

    if (!emailRaw || !codeRaw || !password || password.length < 8) {
      return NextResponse.json({ error: 'invalid_payload' }, { status: 400 });
    }

    const email = normalizeEmail(emailRaw);
    const code = codeRaw.trim();
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: 'invalid_code' }, { status: 400 });
    }

    let parsedAge: number | undefined;
    if (typeof ageRaw === 'number' && Number.isFinite(ageRaw)) {
      parsedAge = ageRaw;
    } else if (typeof ageRaw === 'string' && ageRaw.trim()) {
      const maybeNumber = Number.parseInt(ageRaw, 10);
      if (Number.isFinite(maybeNumber)) {
        parsedAge = maybeNumber;
      }
    }
    if (!parsedAge || parsedAge <= 0 || parsedAge > 120) {
      return NextResponse.json({ error: 'invalid_age' }, { status: 400 });
    }

    const gender = typeof genderRaw === 'string' && genderRaw.trim().length > 0 ? genderRaw.trim() : null;
    if (!gender) {
      return NextResponse.json({ error: 'invalid_gender' }, { status: 400 });
    }

    const db = getServerFirestore();
    const ip = getClientIp(request);
    const now = Date.now();

    const rateLimitAllowed = await updateVerifyRateLimit({ db, ip, now });
    if (!rateLimitAllowed) {
      return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
    }

    const codeRef = db.collection('email_verification_codes').doc(hashValue(email));
    const snapshot = await codeRef.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'code_invalid' }, { status: 400 });
    }

    const data = snapshot.data() ?? {};
    const status = (data.status as string | undefined) ?? 'pending';
    const salt = typeof data.salt === 'string' ? data.salt : null;
    const storedHash = typeof data.codeHash === 'string' ? data.codeHash : null;
    const expiresAt = typeof data.expiresAt === 'number' ? data.expiresAt : 0;
    const attempts = typeof data.attempts === 'number' ? data.attempts : 0;

    if (status !== 'pending') {
      return NextResponse.json({ error: 'code_invalid' }, { status: 400 });
    }

    if (!salt || !storedHash) {
      return NextResponse.json({ error: 'code_invalid' }, { status: 400 });
    }

    if (expiresAt < now) {
      await codeRef.update({
        status: 'expired',
        updatedAt: now,
      });
      return NextResponse.json({ error: 'code_expired' }, { status: 400 });
    }

    if (attempts >= MAX_ATTEMPTS) {
      await codeRef.update({
        status: 'locked',
        updatedAt: now,
      });
      return NextResponse.json({ error: 'code_locked' }, { status: 400 });
    }

    const hashedInput = hashOtpCode(email, code, salt);
    if (hashedInput !== storedHash) {
      const nextAttempts = attempts + 1;
      await codeRef.update({
        attempts: FieldValue.increment(1),
        updatedAt: now,
        status: nextAttempts >= MAX_ATTEMPTS ? 'locked' : 'pending',
      });
      return NextResponse.json({ error: 'code_invalid' }, { status: 400 });
    }

    const adminAuth = getServerAuth();
    let userRecord;
    try {
      userRecord = await adminAuth.createUser({
        email,
        password,
        displayName: name || undefined,
        emailVerified: true,
      });
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const codeName = (error as { code?: string }).code;
        if (codeName === 'auth/email-already-exists') {
          return NextResponse.json({ error: 'email_exists' }, { status: 409 });
        }
      }
      throw error;
    }

    const uid = userRecord.uid;
    const profile = {
      uid,
      id: uid,
      email,
      emailLower: email,
      role: requestedRole,
      displayName: userRecord.displayName ?? name || null,
      name: userRecord.displayName ?? name || null,
      provider: 'password',
      age: parsedAge,
      gender,
      createdAt: now,
      createdAtIso: new Date(now).toISOString(),
      updatedAt: now,
      updatedAtIso: new Date(now).toISOString(),
    };

    const userDocRef = db.collection('users').doc(uid);
    await userDocRef.set(sanitizeForFirestore(profile), { merge: true });

    await codeRef.update({
      status: 'verified',
      verifiedAt: now,
      updatedAt: now,
      attempts: FieldValue.increment(1),
      consumedBy: uid,
    });

    return NextResponse.json({
      ok: true,
      user: {
        uid,
        email,
        role: requestedRole,
      },
    });
  } catch (error) {
    console.error('Failed to verify code', error);
    return NextResponse.json({ error: 'verification_failed' }, { status: 500 });
  }
}
