'use client';

export async function createCheckoutSessionUrl(params: {
  idToken: string;
  returnPath?: string;
}): Promise<string> {
  const response = await fetch('/api/billing/create-checkout-session', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${params.idToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      returnPath: params.returnPath,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error || 'billing_session_failed');
  }

  const payload = (await response.json()) as { url?: string };
  if (!payload.url || typeof payload.url !== 'string') {
    throw new Error('billing_session_missing_url');
  }

  return payload.url;
}

export function getBillingErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'authentication_required':
      return 'Your session expired. Please sign in again and retry.';
    case 'stripe_secret_key_not_configured':
      return 'Billing is not configured yet. Please try again later.';
    case 'stripe_pro_price_id_not_configured':
      return 'Billing plan is not configured yet. Please try again later.';
    case 'stripe_package_not_installed':
      return 'Billing service is unavailable. Please try again later.';
    case 'billing_session_missing_url':
    case 'stripe_checkout_session_missing_url':
      return 'Billing session could not be created. Please retry.';
    default:
      return 'Could not start checkout right now. Please try again.';
  }
}
