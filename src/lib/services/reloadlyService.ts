import "server-only";

/**
 * ReloadlyService — Airtime top-ups today; Gift Cards and Utility Payments
 * are planned later phases with their own OAuth audience/host each (see
 * https://developers.reloadly.com), not covered by this file.
 *
 * `MockReloadlyProvider` simulates an instant successful top-up when
 * RELOADLY_CLIENT_ID/SECRET aren't set, matching the same mock-fallback
 * pattern paymentService/notificationService already use — so local dev and
 * demos work without real credentials. `LiveReloadlyProvider` takes over
 * once both are configured.
 *
 * Reloadly maintains its OWN prepaid wallet per environment (sandbox vs
 * production are separate credentials, separate balances) — every top-up
 * here draws down that balance, checked via /accounts/balance. That's an
 * operational float the business funds via Reloadly's own dashboard,
 * entirely separate from ATG's own customer-facing Wallet.
 */

export interface AirtimeOperator {
  operatorId: number;
  name: string;
  logoUrl?: string;
  denominationType: "FIXED" | "RANGE";
  // Local-currency amounts (major units) — only meaningful for countries ATG
  // also models as a first-class Currency (Nigeria/Gambia today).
  localCurrencyCode?: string;
  localFixedAmounts?: number[];
  localMinAmount?: number;
  localMaxAmount?: number;
  // International (USD) amounts — used for every other country, since ATG
  // doesn't model most of Reloadly's 170+ local currencies.
  internationalFixedAmounts?: number[];
  internationalMinAmount?: number;
  internationalMaxAmount?: number;
}

export interface TopupParams {
  operatorId: number;
  countryIso: string;
  recipientPhone: string;
  useLocalAmount: boolean;
  amount: number; // major units, in whichever currency useLocalAmount implies
}

export interface TopupResult {
  ok: boolean;
  providerRef?: string;
  deliveredAmount?: number;
  deliveredCurrencyCode?: string;
  costMinor?: number; // USD minor units, from Reloadly's own balanceInfo.cost
  failureReason?: string;
}

interface ReloadlyProvider {
  name: string;
  getOperators(countryIso: string): Promise<AirtimeOperator[]>;
  submitTopup(params: TopupParams): Promise<TopupResult>;
}

const AUTH_URL = "https://auth.reloadly.com/oauth/token";

function topupsHost(): string {
  return process.env.RELOADLY_ENVIRONMENT === "production"
    ? "https://topups.reloadly.com"
    : "https://topups-sandbox.reloadly.com";
}

// Tokens last 24h (sandbox) / 60 days (production) per Reloadly's own docs —
// caching per audience avoids re-authenticating on every request within a
// warm serverless instance. Module-level, so it only helps within one
// instance's lifetime, which is still a meaningful reduction in practice.
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

async function getAccessToken(audience: string, clientId: string, clientSecret: string): Promise<string> {
  const cached = tokenCache.get(audience);
  if (cached && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
      audience,
    }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.access_token) {
    throw new Error(body?.message || "Could not authenticate with Reloadly.");
  }

  const expiresAt = Date.now() + (typeof body.expires_in === "number" ? body.expires_in : 3600) * 1000;
  tokenCache.set(audience, { token: body.access_token, expiresAt });
  return body.access_token;
}

class LiveReloadlyProvider implements ReloadlyProvider {
  name = "RELOADLY";
  constructor(
    private clientId: string,
    private clientSecret: string,
  ) {}

  private async authedFetch(path: string, init?: RequestInit): Promise<Response> {
    const host = topupsHost();
    const token = await getAccessToken(host, this.clientId, this.clientSecret);
    return fetch(`${host}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  }

  async getOperators(countryIso: string): Promise<AirtimeOperator[]> {
    const res = await this.authedFetch(`/operators/countries/${encodeURIComponent(countryIso)}`);
    const body = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(body)) return [];

    return body
      .filter((op: Record<string, unknown>) => op?.data !== true) // airtime only — data-bundle operators are a later phase
      .map((op: Record<string, unknown>) => ({
        operatorId: op.operatorId as number,
        name: op.name as string,
        logoUrl: (op.logoUrls as string[] | undefined)?.[0],
        denominationType: op.denominationType === "RANGE" ? "RANGE" : "FIXED",
        localCurrencyCode: op.localTransactionCurrencyCode as string | undefined,
        localFixedAmounts: op.localFixedAmounts as number[] | undefined,
        localMinAmount: op.localMinAmount as number | undefined,
        localMaxAmount: op.localMaxAmount as number | undefined,
        internationalFixedAmounts: op.internationalFixedAmounts as number[] | undefined,
        internationalMinAmount: op.internationalMinAmount as number | undefined,
        internationalMaxAmount: op.internationalMaxAmount as number | undefined,
      }));
  }

  async submitTopup(params: TopupParams): Promise<TopupResult> {
    const res = await this.authedFetch("/topups", {
      method: "POST",
      body: JSON.stringify({
        operatorId: params.operatorId,
        amount: params.amount,
        useLocalAmount: params.useLocalAmount,
        customIdentifier: `ATG-${Date.now().toString(36).toUpperCase()}`,
        recipientPhone: { countryCode: params.countryIso, number: params.recipientPhone },
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.transactionId) {
      return { ok: false, failureReason: body?.message || "The top-up could not be completed. Please try again." };
    }
    return {
      ok: true,
      providerRef: String(body.transactionId),
      deliveredAmount: typeof body.deliveredAmount === "number" ? body.deliveredAmount : undefined,
      deliveredCurrencyCode: body.deliveredAmountCurrencyCode,
      costMinor: typeof body.balanceInfo?.cost === "number" ? Math.round(body.balanceInfo.cost * 100) : undefined,
    };
  }
}

class MockReloadlyProvider implements ReloadlyProvider {
  name = "MOCK";

  async getOperators(countryIso: string): Promise<AirtimeOperator[]> {
    const isNaira = countryIso === "NG";
    const isDalasi = countryIso === "GM";
    return [
      {
        operatorId: 999,
        name: "Demo Network",
        denominationType: "FIXED",
        localCurrencyCode: isNaira ? "NGN" : isDalasi ? "GMD" : undefined,
        localFixedAmounts: isNaira ? [500, 1000, 2000, 5000] : isDalasi ? [50, 100, 200] : undefined,
        internationalFixedAmounts: [1, 2, 5, 10],
      },
    ];
  }

  async submitTopup(params: TopupParams): Promise<TopupResult> {
    return {
      ok: true,
      providerRef: `MOCK-${Date.now().toString(36).toUpperCase()}`,
      deliveredAmount: params.amount,
      deliveredCurrencyCode: params.useLocalAmount ? undefined : "USD",
    };
  }
}

export interface DigitalServiceProvider {
  isLive(): boolean;
  getOperators(countryIso: string): Promise<AirtimeOperator[]>;
  submitTopup(params: TopupParams): Promise<TopupResult>;
}

class DefaultReloadlyService implements DigitalServiceProvider {
  private provider: ReloadlyProvider;

  constructor() {
    this.provider =
      process.env.RELOADLY_CLIENT_ID && process.env.RELOADLY_CLIENT_SECRET
        ? new LiveReloadlyProvider(process.env.RELOADLY_CLIENT_ID, process.env.RELOADLY_CLIENT_SECRET)
        : new MockReloadlyProvider();
  }

  isLive(): boolean {
    return this.provider.name !== "MOCK";
  }

  getOperators(countryIso: string): Promise<AirtimeOperator[]> {
    return this.provider.getOperators(countryIso);
  }

  submitTopup(params: TopupParams): Promise<TopupResult> {
    return this.provider.submitTopup(params);
  }
}

export const reloadlyService: DigitalServiceProvider = new DefaultReloadlyService();
