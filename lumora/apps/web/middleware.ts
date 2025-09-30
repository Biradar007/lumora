import { NextRequest, NextResponse } from 'next/server';

function generateSessionId(): string {
  const random = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(random).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const hasSession = request.cookies.get('lumora_session');
  if (!hasSession) {
    const sessionId = generateSessionId();
    // 90 days cookie, httpOnly
    response.cookies.set('lumora_session', sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 90,
      path: '/',
    });
  }
  return response;
}

export const config = {
  matcher: ['/((?!api/health).*)'],
};


