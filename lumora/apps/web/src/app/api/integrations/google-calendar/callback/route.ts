import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, getTherapistGoogleIntegration } from '@/lib/googleCalendar';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  try {
    const { therapistId } = await exchangeCodeForTokens(state, code);
    const integration = await getTherapistGoogleIntegration(therapistId);
    const redirect = new URL('/therapist/profile', url.origin);
    redirect.searchParams.set('calendar', integration ? 'connected' : 'missing');
    return NextResponse.redirect(redirect, { status: 302 });
  } catch (error) {
    const redirect = new URL('/therapist/profile', url.origin);
    redirect.searchParams.set('calendar', 'error');
    if (error instanceof Error) {
      redirect.searchParams.set('message', error.message);
    }
    return NextResponse.redirect(redirect, { status: 302 });
  }
}
