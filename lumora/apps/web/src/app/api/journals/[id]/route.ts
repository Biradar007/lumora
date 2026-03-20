import { NextResponse } from 'next/server';
import { getServerFirestore, sanitizeForFirestore } from '@/lib/firestoreServer';
import { ForbiddenError, jsonError, requireAuth } from '@/lib/apiAuth';
import type { JournalEntry } from '@/types/domain';

export const runtime = 'nodejs';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = requireAuth(request, { roles: ['user'] });
    const db = getServerFirestore();
    const ref = db.collection('journals').doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'journal_not_found' }, { status: 404 });
    }
    const dbEntry = snapshot.data() as JournalEntry;
    if (dbEntry.userId !== auth.userId) {
      throw new ForbiddenError('forbidden');
    }

    const payload = (await request.json()) as Partial<JournalEntry> & { content?: string };
    const content = payload.content?.trim() ?? '';

    if (!content) {
      return NextResponse.json({ error: 'content_required' }, { status: 400 });
    }

    const now = Date.now();

    const updatedEntry: JournalEntry = {
      ...dbEntry,
      content,
      updatedAt: now,
    };

    await ref.set(
      sanitizeForFirestore({
        content: updatedEntry.content,
        updatedAt: updatedEntry.updatedAt,
      }),
      { merge: true }
    );

    return NextResponse.json({ entry: updatedEntry });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = requireAuth(request, { roles: ['user'] });
    const db = getServerFirestore();
    const ref = db.collection('journals').doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      return NextResponse.json({ error: 'journal_not_found' }, { status: 404 });
    }
    const dbEntry = snapshot.data() as JournalEntry;
    if (dbEntry.userId !== auth.userId) {
      throw new ForbiddenError('forbidden');
    }

    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
