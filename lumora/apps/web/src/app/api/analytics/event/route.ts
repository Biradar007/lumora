import { NextResponse } from 'next/server';
import { z } from 'zod';
// import { connectToDatabase, AnalyticsEvent } from '@lumora/db';

const schema = z.object({
  sessionId: z.string().min(6),
  type: z.enum(['SELF_HELP_USED', 'RESOURCES_VIEWED', 'OUTREACH_REQUESTED', 'MESSAGE_SENT']),
  meta: z.record(z.any()).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId, type, meta } = schema.parse(body);
    // await connectToDatabase();
    // await AnalyticsEvent.create({ sessionId, type, meta });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}


