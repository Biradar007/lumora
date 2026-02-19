import 'server-only';

import { getServerAuth } from '@/lib/firestoreServer';

export interface VerifiedFirebaseUser {
  uid: string;
  email: string | null;
}

export class FirebaseAuthError extends Error {
  status = 401;
}

export function getBearerTokenFromRequest(request: Request): string {
  const authHeader = request.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  if (!token) {
    throw new FirebaseAuthError('authentication_required');
  }
  return token;
}

export async function verifyIdToken(token: string): Promise<VerifiedFirebaseUser> {
  if (!token.trim()) {
    throw new FirebaseAuthError('authentication_required');
  }

  try {
    const decoded = await getServerAuth().verifyIdToken(token, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
    };
  } catch {
    throw new FirebaseAuthError('authentication_required');
  }
}

export async function requireVerifiedFirebaseUser(request: Request): Promise<VerifiedFirebaseUser> {
  const token = getBearerTokenFromRequest(request);
  return verifyIdToken(token);
}
