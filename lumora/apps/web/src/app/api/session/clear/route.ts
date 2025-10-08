import { NextResponse } from 'next/server';
import { z } from 'zod';
// import { connectToDatabase, MessageLog } from '@lumora/db';

const schema = z.object({ sessionId: z.string().min(6) });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = schema.parse(body);
    // await connectToDatabase();
    // await MessageLog.deleteMany({ sessionId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }
}


