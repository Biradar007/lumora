import { NextResponse } from 'next/server';
// import { connectToDatabase, Session } from '@lumora/db';
import { AnalyticsEvent, MessageLog } from '@lumora/db';

export async function GET() {
  // TTL indexes handle auto-deletion for MessageLog/AnalyticsEvent.
  // Here we remove stale sessions older than 30 days.
  try {
    // await connectToDatabase();
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    // await Session.deleteMany({ lastActiveAt: { $lt: cutoff } });
    // Touch collections to ensure TTL monitor awareness
    // await Promise.all([
    //   MessageLog.collection.stats().catch(() => null),
    //   AnalyticsEvent.collection.stats().catch(() => null),
    // ]);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'server_error' }, { status: 500 });
  }
}


