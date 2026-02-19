import { NextResponse } from 'next/server';
import { getServerFirestore } from '@/lib/firestoreServer';
import { getStripeClient } from '@/lib/stripeServer';

type Plan = 'free' | 'pro';

type StripeEvent = {
  id: string;
  type: string;
  data?: {
    object?: unknown;
  };
};

type StripeSubscriptionObject = {
  id?: string;
  status?: string;
  customer?: unknown;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
  metadata?: Record<string, unknown>;
};

const PRO_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);
const FREE_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'unpaid',
  'past_due',
  'incomplete_expired',
]);

function readString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function extractCustomerId(customer: unknown): string | null {
  if (typeof customer === 'string') {
    return customer.trim().length > 0 ? customer.trim() : null;
  }
  const objectValue = asObject(customer);
  return readString(objectValue.id);
}

function extractSubscriptionDetails(subscription: StripeSubscriptionObject | null): {
  subscriptionId: string | null;
  stripePriceId: string | null;
  status: string | null;
} {
  if (!subscription) {
    return {
      subscriptionId: null,
      stripePriceId: null,
      status: null,
    };
  }

  const firstItem = Array.isArray(subscription.items?.data) ? subscription.items?.data[0] : undefined;
  const priceId = readString(firstItem?.price?.id);
  const subscriptionId = readString(subscription.id);
  const status = readString(subscription.status);

  return {
    subscriptionId,
    stripePriceId: priceId,
    status,
  };
}

async function resolveUidFromCustomerMetadata(
  customerId: string | null
): Promise<string | null> {
  if (!customerId) {
    return null;
  }
  try {
    const stripe = getStripeClient();
    const customer = await stripe.customers.retrieve(customerId);
    const metadata = asObject(asObject(customer).metadata);
    return readString(metadata.uid);
  } catch {
    return null;
  }
}

async function resolveUidFromCustomerLookup(customerId: string | null): Promise<string | null> {
  if (!customerId) {
    return null;
  }
  const db = getServerFirestore();
  const snapshot = await db.collection('users').where('stripeCustomerId', '==', customerId).limit(1).get();
  if (snapshot.empty) {
    return null;
  }
  return snapshot.docs[0]?.id ?? null;
}

async function resolveUid(params: {
  eventType: string;
  eventObject: Record<string, unknown>;
  customerId: string | null;
}): Promise<string | null> {
  const { eventType, eventObject, customerId } = params;

  const uidFromCustomerMetadata = await resolveUidFromCustomerMetadata(customerId);
  if (uidFromCustomerMetadata) {
    return uidFromCustomerMetadata;
  }

  if (eventType === 'checkout.session.completed') {
    const metadata = asObject(eventObject.metadata);
    const uidFromCheckoutMetadata = readString(metadata.uid);
    if (uidFromCheckoutMetadata) {
      return uidFromCheckoutMetadata;
    }
  }

  const metadata = asObject(eventObject.metadata);
  const uidFromObjectMetadata = readString(metadata.uid);
  if (uidFromObjectMetadata) {
    return uidFromObjectMetadata;
  }

  return resolveUidFromCustomerLookup(customerId);
}

async function loadSubscriptionFromEvent(params: {
  eventType: string;
  eventObject: Record<string, unknown>;
}): Promise<StripeSubscriptionObject | null> {
  const { eventType, eventObject } = params;
  const stripe = getStripeClient();

  if (
    eventType === 'customer.subscription.created' ||
    eventType === 'customer.subscription.updated' ||
    eventType === 'customer.subscription.deleted'
  ) {
    return eventObject as StripeSubscriptionObject;
  }

  const subscriptionId = readString(eventObject.subscription);
  if (!subscriptionId) {
    return null;
  }

  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription as StripeSubscriptionObject;
  } catch {
    return {
      id: subscriptionId,
    };
  }
}

function resolvePlanFromSubscriptionStatus(status: string | null): Plan | null {
  if (!status) {
    return null;
  }
  if (PRO_SUBSCRIPTION_STATUSES.has(status)) {
    return 'pro';
  }
  if (FREE_SUBSCRIPTION_STATUSES.has(status)) {
    return 'free';
  }
  return null;
}

function buildUserUpdate(params: {
  eventType: string;
  customerId: string | null;
  subscription: StripeSubscriptionObject | null;
}): Record<string, unknown> {
  const { eventType, customerId, subscription } = params;
  const details = extractSubscriptionDetails(subscription);

  const update: Record<string, unknown> = {
    planUpdatedAt: new Date(),
  };

  if (customerId) {
    update.stripeCustomerId = customerId;
  }
  if (details.subscriptionId) {
    update.stripeSubscriptionId = details.subscriptionId;
  }
  if (details.stripePriceId) {
    update.stripePriceId = details.stripePriceId;
  }

  const planFromStatus = resolvePlanFromSubscriptionStatus(details.status);
  if (planFromStatus) {
    update.plan = planFromStatus;
  }

  if (eventType === 'invoice.payment_failed') {
    update.plan = 'free';
  }

  return update;
}

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json({ error: 'stripe_webhook_secret_not_configured' }, { status: 500 });
  }

  let stripe;
  try {
    stripe = getStripeClient();
  } catch (error) {
    console.error('[stripe/webhook] failed to initialize stripe client', error);
    return NextResponse.json({ error: 'stripe_init_failed' }, { status: 500 });
  }
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'missing_signature' }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: StripeEvent;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret) as StripeEvent;
  } catch (error) {
    console.error('[stripe/webhook] signature verification failed', error);
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  const supportedEventTypes = new Set([
    'checkout.session.completed',
    'customer.subscription.created',
    'customer.subscription.updated',
    'customer.subscription.deleted',
    'invoice.payment_succeeded',
    'invoice.payment_failed',
  ]);

  if (!supportedEventTypes.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true });
  }

  const eventObject = asObject(event.data?.object);
  const customerId = extractCustomerId(eventObject.customer);
  const uid = await resolveUid({
    eventType: event.type,
    eventObject,
    customerId,
  });

  if (!uid) {
    console.warn('[stripe/webhook] unable to resolve uid', { eventId: event.id, type: event.type, customerId });
    return NextResponse.json({ received: true, skipped: 'uid_not_found' });
  }

  const db = getServerFirestore();
  const eventRef = db.collection('payments').doc(uid).collection('events').doc(event.id);
  const userRef = db.collection('users').doc(uid);

  const existingEventSnapshot = await eventRef.get();
  if (existingEventSnapshot.exists) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    const subscription = await loadSubscriptionFromEvent({
      eventType: event.type,
      eventObject,
    });

    const userUpdate = buildUserUpdate({
      eventType: event.type,
      customerId,
      subscription,
    });

    const processed = await db.runTransaction(async (tx) => {
      const existingEvent = await tx.get(eventRef);
      if (existingEvent.exists) {
        return false;
      }

      tx.set(eventRef, {
        type: event.type,
        createdAt: new Date(),
      });

      tx.set(userRef, userUpdate, { merge: true });
      return true;
    });

    return NextResponse.json({ received: true, processed });
  } catch (error) {
    console.error('[stripe/webhook] processing failed', {
      eventId: event.id,
      type: event.type,
      uid,
      error,
    });
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 });
  }
}
