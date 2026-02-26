import 'server-only';

type StripeClient = {
  customers: {
    create: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
    retrieve: (id: string) => Promise<Record<string, unknown>>;
  };
  checkout: {
    sessions: {
      create: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
      retrieve: (id: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };
  };
  billingPortal: {
    sessions: {
      create: (params: Record<string, unknown>) => Promise<Record<string, unknown>>;
    };
  };
  subscriptions: {
    retrieve: (id: string) => Promise<Record<string, unknown>>;
  };
  webhooks: {
    constructEvent: (payload: string, signature: string, secret: string) => Record<string, unknown>;
  };
};

type StripeConstructor = new (
  apiKey: string,
  config?: {
    appInfo?: {
      name?: string;
      version?: string;
    };
  }
) => StripeClient;

let stripeClient: StripeClient | null = null;

export function getStripeClient(): StripeClient {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    throw new Error('stripe_secret_key_not_configured');
  }

  if (!stripeClient) {
    const stripeModuleName = 'stripe';
    let Stripe: StripeConstructor;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Stripe = require(stripeModuleName) as StripeConstructor;
    } catch {
      throw new Error('stripe_package_not_installed');
    }
    stripeClient = new Stripe(secretKey, {
      appInfo: {
        name: 'Lumora',
        version: '0.1.0',
      },
    });
  }

  return stripeClient;
}
