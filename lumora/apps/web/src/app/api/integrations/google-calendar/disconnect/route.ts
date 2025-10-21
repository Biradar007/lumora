import { NextResponse } from 'next/server';
import { disconnectTherapistGoogleCalendar } from '@/lib/googleCalendar';
import { jsonError, requireAuth } from '@/lib/apiAuth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['therapist'] });
    await disconnectTherapistGoogleCalendar(auth.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
