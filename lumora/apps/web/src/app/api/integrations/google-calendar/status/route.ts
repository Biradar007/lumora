import { NextResponse } from 'next/server';
import { getTherapistGoogleIntegration } from '@/lib/googleCalendar';
import { jsonError, requireAuth } from '@/lib/apiAuth';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, { roles: ['therapist'] });
    const integration = await getTherapistGoogleIntegration(auth.userId);
    return NextResponse.json({
      connected: Boolean(integration),
      calendarId: integration?.calendarId ?? 'primary',
      connectedAt: integration?.connectedAt ?? null,
      updatedAt: integration?.updatedAt ?? null,
    });
  } catch (error) {
    return jsonError(error);
  }
}
