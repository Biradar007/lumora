import { NextResponse } from 'next/server';
import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { MoodEntry } from '@/types/domain';

export const runtime = 'nodejs';

function normalizeActivities(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

function formatDateParts(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveEntryDate(raw: unknown): string {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  return formatDateParts(new Date());
}

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['user'] });
    const db = getServerFirestore();
    const snapshot = await db.collection('moodEntries').where('userId', '==', auth.userId).get();
    const entries: MoodEntry[] = snapshot.docs
      .map((docSnapshot) => docSnapshot.data() as MoodEntry)
      .sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json({ entries });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['user'] });
    const db = getServerFirestore();
    const payload = (await request.json()) as Partial<MoodEntry>;

    if (typeof payload.mood !== 'number' || Number.isNaN(payload.mood)) {
      return NextResponse.json({ error: 'mood_required' }, { status: 400 });
    }

    const mood = Math.round(payload.mood);
    if (mood < 0 || mood > 4) {
      return NextResponse.json({ error: 'mood_out_of_range' }, { status: 400 });
    }

    const noteCandidate = typeof payload.note === 'string' ? payload.note.trim().slice(0, 500) : undefined;
    const note = noteCandidate && noteCandidate.length > 0 ? noteCandidate : undefined;
    const activities = normalizeActivities(payload.activities);
    const entryDate = resolveEntryDate(payload.entryDate);

    const now = Date.now();
    const docRef = db.collection('moodEntries').doc();
    const entry: MoodEntry = {
      id: docRef.id,
      userId: auth.userId,
      tenantId: auth.tenantId,
      mood,
      note,
      activities,
      entryDate,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(sanitizeForFirestore(entry));
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
