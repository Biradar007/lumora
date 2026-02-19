import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { FirebaseAuthError, requireVerifiedFirebaseUser } from '@/lib/firebaseAdminAuth';
import { getStripeClient } from '@/lib/stripeServer';

type UserDoc = {
  stripeCustomerId?: string;
};

function getAppUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return new URL(request.url).origin;
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const identity = await requireVerifiedFirebaseUser(request);
    const db = getServerFirestore();
    const stripe = getStripeClient();
    const appUrl = getAppUrl(request);

    const userSnapshot = await db.collection('users').doc(identity.uid).get();
    const userData = (userSnapshot.data() ?? {}) as UserDoc;
    const stripeCustomerId =
      typeof userData.stripeCustomerId === 'string' ? userData.stripeCustomerId.trim() : '';

    if (!stripeCustomerId) {
      return NextResponse.json({ error: 'stripe_customer_not_found' }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/user/dashboard`,
    });

    const url = typeof session.url === 'string' ? session.url : '';
    if (!url) {
      throw new Error('stripe_portal_session_missing_url');
    }

    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof FirebaseAuthError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof Error) {
      const knownErrorCodes = new Set([
        'stripe_secret_key_not_configured',
        'stripe_package_not_installed',
        'stripe_portal_session_missing_url',
      ]);
      if (knownErrorCodes.has(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    console.error('[billing/create-portal-session] failed', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
