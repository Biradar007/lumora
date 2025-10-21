import { NextResponse } from 'next/server';
import { generateGoogleAuthUrl } from '@/lib/googleCalendar';
import { jsonError, requireAuth } from '@/lib/apiAuth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['therapist'] });
    const url = await generateGoogleAuthUrl(auth.userId);
    return NextResponse.json({ url });
  } catch (error) {
    return jsonError(error);
  }
}
