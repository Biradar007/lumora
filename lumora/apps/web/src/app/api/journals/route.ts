import { NextResponse } from 'next/server';
import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import { jsonError, requireAuth } from '@/lib/apiAuth';
import type { JournalEntry } from '@/types/domain';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['user'] });
    const db = getServerFirestore();
    const snapshot = await db.collection('journals').where('userId', '==', auth.userId).get();
    const entries: JournalEntry[] = snapshot.docs
      .map((docSnapshot) => docSnapshot.data() as JournalEntry)
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
    const payload = (await request.json()) as Partial<JournalEntry> & { content?: string };

    const content = payload.content?.trim() ?? '';
    if (!content) {
      return NextResponse.json({ error: 'content_required' }, { status: 400 });
    }

    const now = Date.now();
    const docRef = db.collection('journals').doc();
    const entry: JournalEntry = {
      id: docRef.id,
      userId: auth.userId,
      tenantId: auth.tenantId,
      content,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(sanitizeForFirestore(entry));
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
