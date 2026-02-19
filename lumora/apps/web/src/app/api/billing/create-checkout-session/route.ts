import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { FirebaseAuthError, requireVerifiedFirebaseUser } from '@/lib/firebaseAdminAuth';
import { getStripeClient } from '@/lib/stripeServer';

type UserDoc = {
  plan?: 'free' | 'pro';
  stripeCustomerId?: string;
};

function getAppUrl(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, '');
  }
  return new URL(request.url).origin;
}

function getProPriceId(): string {
  const priceId = process.env.STRIPE_PRO_PRICE_ID?.trim();
  if (!priceId) {
    throw new Error('stripe_pro_price_id_not_configured');
  }
  return priceId;
}

export const runtime = 'nodejs';

function normalizeReturnPath(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }
  return trimmed;
}

export async function POST(request: Request) {
  try {
    const identity = await requireVerifiedFirebaseUser(request);
    const payload = (await request.json().catch(() => ({}))) as { returnPath?: unknown };
    const returnPath = normalizeReturnPath(payload.returnPath);
    const now = new Date();
    const db = getServerFirestore();
    const stripe = getStripeClient();
    const appUrl = getAppUrl(request);
    const priceId = getProPriceId();

    const userRef = db.collection('users').doc(identity.uid);
    const userSnapshot = await userRef.get();
    const userData = (userSnapshot.data() ?? {}) as UserDoc;

    if (!userSnapshot.exists) {
      await userRef.set(
        {
          plan: 'free',
          createdAt: now,
        },
        { merge: true }
      );
    }

    let stripeCustomerId =
      typeof userData.stripeCustomerId === 'string' && userData.stripeCustomerId.trim().length > 0
        ? userData.stripeCustomerId.trim()
        : '';

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: identity.email ?? undefined,
        metadata: {
          uid: identity.uid,
        },
      });

      const createdCustomerId =
        typeof customer.id === 'string' && customer.id.trim().length > 0 ? customer.id.trim() : '';
      if (!createdCustomerId) {
        throw new Error('stripe_customer_create_failed');
      }
      stripeCustomerId = createdCustomerId;

      await userRef.set(
        {
          stripeCustomerId,
        },
        { merge: true }
      );
    }

    const successUrlBase = `${appUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const successUrl = returnPath
      ? `${successUrlBase}&next=${encodeURIComponent(returnPath)}`
      : successUrlBase;
    const cancelUrl = `${appUrl}${returnPath ?? '/#pricing'}`;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      metadata: {
        uid: identity.uid,
        returnPath: returnPath ?? '',
      },
      subscription_data: {
        metadata: {
          uid: identity.uid,
        },
      },
    });

    const url = typeof session.url === 'string' ? session.url : '';
    if (!url) {
      throw new Error('stripe_checkout_session_missing_url');
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
        'stripe_pro_price_id_not_configured',
        'stripe_customer_create_failed',
        'stripe_checkout_session_missing_url',
      ]);
      if (knownErrorCodes.has(error.message)) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
    console.error('[billing/create-checkout-session] failed', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
