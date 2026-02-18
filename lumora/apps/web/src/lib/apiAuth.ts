import { NextResponse } from 'next/server';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { Role } from '@/types/domain';
import { getServerAuth } from '@/lib/firestoreServer';

export interface RequestAuth {
  userId: string;
  role: Role;
  tenantId?: string;
}

export interface FirebaseRequestAuth {
  userId: string;
  token: string;
  decodedToken: DecodedIdToken;
}

export class UnauthorizedError extends Error {
  status = 401;
}

export class ForbiddenError extends Error {
  status = 403;
}

function normalizeRole(value: string | null): Role | null {
  if (!value) {
    return null;
  }
  if (value === 'therapist' || value === 'user' || value === 'admin') {
    return value;
  }
  return null;
}

export function requireAuth(request: Request, options?: { roles?: Role[] }): RequestAuth {
  const userId = request.headers.get('x-user-id')?.trim();
  const roleHeader = request.headers.get('x-user-role');
  const tenantId = request.headers.get('x-tenant-id')?.trim() || undefined;
  const role = normalizeRole(roleHeader);

  if (!userId || !role) {
    throw new UnauthorizedError('Authentication required');
  }

  if (options?.roles && !options.roles.includes(role)) {
    throw new ForbiddenError('Insufficient permissions');
  }

  return { userId, role, tenantId };
}

function resolveBearerToken(request: Request): string {
  const authHeader = request.headers.get('authorization') ?? '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match || !match[1]?.trim()) {
    throw new UnauthorizedError('Authentication required');
  }
  return match[1].trim();
}

export async function requireFirebaseAuth(request: Request): Promise<FirebaseRequestAuth> {
  const token = resolveBearerToken(request);
  try {
    const decodedToken = await getServerAuth().verifyIdToken(token, true);
    return {
      userId: decodedToken.uid,
      token,
      decodedToken,
    };
  } catch {
    throw new UnauthorizedError('Authentication required');
  }
}

export function jsonError(error: unknown, fallbackStatus = 500) {
  if (error instanceof UnauthorizedError || error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: 'internal_error' }, { status: fallbackStatus });
}
