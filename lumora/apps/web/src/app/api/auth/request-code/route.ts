import { NextResponse } from 'next/server';
import { FieldValue, type Firestore } from 'firebase-admin/firestore';
import { createHash } from 'crypto';
import { getServerFirestore } from '@/lib/firestoreServer';
import { generateOtpCode, generateOtpSalt, hashOtpCode, normalizeEmail } from '@/lib/otp';
import { sendMail } from '@/lib/mailer';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;

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

async function updateRateLimit({
  db,
  email,
  ip,
  now,
}: {
  db: Firestore;
  email: string;
  ip: string;
  now: number;
}): Promise<boolean> {
  const docId = `request_${hashValue(email)}_${hashValue(ip)}`;
  const ref = db.collection('email_verification_rate_limits').doc(docId);
  const snapshot = await ref.get();
  if (snapshot.exists) {
    const data = snapshot.data() ?? {};
    const windowStart = typeof data.windowStart === 'number' ? data.windowStart : now;
    const count = typeof data.count === 'number' ? data.count : 0;
    if (now - windowStart < RATE_LIMIT_WINDOW_MS) {
      if (count >= RATE_LIMIT_MAX_REQUESTS) {
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
    email,
    ip,
    windowStart: now,
    count: 1,
    updatedAt: now,
  });
  return true;
}

export async function POST(request: Request) {
  try {
    const { email: rawEmail } = (await request.json()) as { email?: string };
    if (!rawEmail) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const email = normalizeEmail(rawEmail);
    if (!/^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const db = getServerFirestore();
    const now = Date.now();

    const rateLimitAllowed = await updateRateLimit({ db, email, ip, now });
    if (!rateLimitAllowed) {
      return NextResponse.json({ ok: true });
    }

    const codeRef = db.collection('email_verification_codes').doc(hashValue(email));
    const snapshot = await codeRef.get();
    const previousVersion = (snapshot.data()?.version as number | undefined) ?? 0;

    const code = generateOtpCode();
    const salt = generateOtpSalt();
    const codeHash = hashOtpCode(email, code, salt);

    const payload = {
      email,
      salt,
      codeHash,
      expiresAt: now + CODE_TTL_MS,
      attempts: 0,
      maxAttempts: MAX_ATTEMPTS,
      status: 'pending' as const,
      version: previousVersion + 1,
      createdAt: now,
      updatedAt: now,
      lastRequestIp: ip,
    };

    await codeRef.set(payload);

    await sendMail({
      to: email,
      subject: 'Your Lumora verification code',
      text: `Your Lumora verification code is ${code}. It expires in 10 minutes. If you did not request this code, you can ignore this email.`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to request verification code', error);
    if (error instanceof Error && error.message === 'mail_not_configured') {
      return NextResponse.json({ error: 'mail_not_configured' }, { status: 500 });
    }
    return NextResponse.json({ error: 'request_failed' }, { status: 500 });
  }
}
