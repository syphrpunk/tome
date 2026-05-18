// ── PLAN DEFINITIONS ──────────────────────────────────

export interface Plan {
  annualPrice: number; // annual price in cents (per year)
  features: string[];
  id: string;
  limits: {
    deployments: number; // per month (-1 = unlimited)
    customDomains: number; // -1 = unlimited
    teamMembers: number; // -1 = unlimited
    storage: number; // MB
  };
  name: string;
  price: number; // monthly price in cents
}

export const PLANS: Record<string, Plan> = {
  community: {
    id: "community",
    name: "Community",
    price: 0,
    annualPrice: 0,
    features: ["Unlimited public docs", "Pagefind search", "Community support"],
    limits: {
      deployments: 10,
      customDomains: 0,
      teamMembers: 1,
      storage: 100,
    },
  },
  cloud: {
    id: "cloud",
    name: "Cloud",
    price: 1999, // $19.99/mo
    annualPrice: 19_990, // $199.90/yr (2 months free)
    features: [
      "Custom domain",
      "Algolia search",
      "Analytics",
      "Priority support",
    ],
    limits: {
      deployments: -1,
      customDomains: 1,
      teamMembers: 3,
      storage: 1000,
    },
  },
  team: {
    id: "team",
    name: "Team",
    price: 4999, // $49.99/mo
    annualPrice: 49_990, // $499.90/yr (2 months free)
    features: [
      "Everything in Cloud",
      "Unlimited custom domains",
      "Team collaboration",
      "AI chat",
      "SSO",
    ],
    limits: {
      deployments: -1,
      customDomains: -1,
      teamMembers: -1,
      storage: 10_000,
    },
  },
};

// ── BILLING TYPES ──────────────────────────────────────

export interface Subscription {
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date;
  id: string;
  planId: string;
  status: "active" | "trialing" | "past_due" | "canceled";
  trialEnd?: Date;
}

export interface BillingCustomer {
  email: string;
  id: string;
  subscription?: Subscription;
}

// ── API CONFIG ──────────────────────────────────────────

const API_URL = process.env.TOME_API_URL ?? "https://api.tome.center";

// ── PLAN HELPERS ────────────────────────────────────────

/**
 * Look up a plan by its ID.
 */
export function getPlan(planId: string): Plan | null {
  return PLANS[planId] ?? null;
}

/**
 * Returns the number of free trial days for new subscriptions.
 */
export function getTrialDays(): number {
  return 14;
}

/**
 * Calculate how much a customer saves per year by choosing annual billing.
 * Annual pricing gives 2 months free, so the discount equals 2x the monthly price.
 */
export function calculateAnnualDiscount(plan: Plan): number {
  const fullAnnualPrice = plan.price * 12;
  return fullAnnualPrice - plan.annualPrice;
}

/**
 * Format a price in cents to a dollar string (e.g. 1900 -> "$19.00").
 */
export function formatPrice(cents: number): string {
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars}`;
}

// ── STRIPE INTEGRATION ─────────────────────────────────

/**
 * Create a Stripe Checkout Session URL via Tome API.
 * Falls back to mock data when no token is provided (for tests/offline).
 */
export async function createCheckoutSession(options: {
  planId: string;
  email: string;
  annual?: boolean;
  successUrl: string;
  cancelUrl: string;
  token?: string;
  apiUrl?: string;
}): Promise<{ url: string; sessionId: string }> {
  const plan = getPlan(options.planId);
  if (!plan) {
    throw new Error(`Unknown plan: ${options.planId}`);
  }

  if (!options.token) {
    const sessionId = `cs_mock_${options.planId}_${Date.now()}`;
    return { url: "https://checkout.stripe.com/mock-session", sessionId };
  }

  const res = await fetch(`${options.apiUrl ?? API_URL}/api/billing/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.token}`,
    },
    body: JSON.stringify({
      planId: options.planId,
      successUrl: options.successUrl,
      cancelUrl: options.cancelUrl,
      annual: options.annual,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(`Checkout failed: ${(err as { error: string }).error}`);
  }

  return (await res.json()) as { url: string; sessionId: string };
}

/**
 * Create a Stripe Customer Portal URL via Tome API.
 * Falls back to mock data when no token is provided.
 */
export async function createPortalSession(options: {
  customerId: string;
  returnUrl: string;
  token?: string;
  apiUrl?: string;
}): Promise<{ url: string }> {
  if (!options.token) {
    return {
      url: `https://billing.stripe.com/mock-portal/${options.customerId}`,
    };
  }

  const res = await fetch(`${options.apiUrl ?? API_URL}/api/billing/portal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.token}`,
    },
    body: JSON.stringify({ returnUrl: options.returnUrl }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(
      `Portal session failed: ${(err as { error: string }).error}`
    );
  }

  return (await res.json()) as { url: string };
}
