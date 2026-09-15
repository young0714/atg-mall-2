import "server-only";
import { getReloadlyAccessToken } from "./reloadlyAuth";

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
  // Reloadly's operator pricing is always in that operator's own country's
  // local currency — confirmed live, this endpoint returns no currency-code
  // field and no separate USD-equivalent amounts. Callers must map
  // countryIso -> Currency themselves (see AIRTIME_COUNTRIES) and only offer
  // a purchase when that mapping exists.
  localFixedAmounts?: number[];
  localMinAmount?: number;
  localMaxAmount?: number;
}

export interface TopupParams {
  operatorId: number;
  countryIso: string;
  recipientPhone: string;
  amount: number; // major units, in the operator's own local currency
}

export interface TopupResult {
  ok: boolean;
  providerRef?: string;
  deliveredAmount?: number;
  deliveredCurrencyCode?: string;
  costMinor?: number; // USD minor units, from Reloadly's own balanceInfo.cost
  failureReason?: string;
}

export interface ReloadlyBalance {
  balanceMinor: number;
  currencyCode: string;
  updatedAt?: string;
}

interface ReloadlyProvider {
  name: string;
  getOperators(countryIso: string): Promise<AirtimeOperator[]>;
  submitTopup(params: TopupParams): Promise<TopupResult>;
  getBalance(): Promise<ReloadlyBalance | null>;
}

function topupsHost(): string {
  return process.env.RELOADLY_ENVIRONMENT === "production"
    ? "https://topups.reloadly.com"
    : "https://topups-sandbox.reloadly.com";
}

class LiveReloadlyProvider implements ReloadlyProvider {
  name = "RELOADLY";
  constructor(
    private clientId: string,
    private clientSecret: string,
  ) {}

  private async authedFetch(path: string, init?: RequestInit): Promise<Response> {
    const host = topupsHost();
    const token = await getReloadlyAccessToken(host, this.clientId, this.clientSecret);
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
      .map(
        (op: Record<string, unknown>): AirtimeOperator => ({
          operatorId: op.operatorId as number,
          name: op.name as string,
          logoUrl: (op.logoUrls as string[] | undefined)?.[0],
          denominationType: op.denominationType === "RANGE" ? "RANGE" : "FIXED",
          localFixedAmounts: op.localFixedAmounts as number[] | undefined,
          localMinAmount: op.localMinAmount as number | undefined,
          localMaxAmount: op.localMaxAmount as number | undefined,
        }),
      )
      // Some operators (seen live: a couple of Nigerian "Special Bundle"
      // entries) come back with no usable pricing at all — empty fixed list
      // AND no range — which can't be purchased through this flow.
      .filter((op: AirtimeOperator) => (op.localFixedAmounts?.length ?? 0) > 0 || (op.localMinAmount != null && op.localMaxAmount != null));
  }

  async submitTopup(params: TopupParams): Promise<TopupResult> {
    const res = await this.authedFetch("/topups", {
      method: "POST",
      body: JSON.stringify({
        operatorId: params.operatorId,
        amount: params.amount,
        useLocalAmount: true, // Reloadly's operator pricing here is always local-currency — see AirtimeOperator's comment
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

  async getBalance(): Promise<ReloadlyBalance | null> {
    const res = await this.authedFetch("/accounts/balance");
    const body = await res.json().catch(() => null);
    if (!res.ok || typeof body?.balance !== "number") return null;
    return { balanceMinor: Math.round(body.balance * 100), currencyCode: body.currencyCode ?? "USD", updatedAt: body.updatedAt };
  }
}

class MockReloadlyProvider implements ReloadlyProvider {
  name = "MOCK";

  async getOperators(countryIso: string): Promise<AirtimeOperator[]> {
    const isNaira = countryIso === "NG";
    const isDalasi = countryIso === "GM";
    if (!isNaira && !isDalasi) return [];
    return [
      {
        operatorId: 999,
        name: "Demo Network",
        denominationType: "FIXED",
        localFixedAmounts: isNaira ? [500, 1000, 2000, 5000] : [50, 100, 200],
      },
    ];
  }

  async submitTopup(params: TopupParams): Promise<TopupResult> {
    return {
      ok: true,
      providerRef: `MOCK-${Date.now().toString(36).toUpperCase()}`,
      deliveredAmount: params.amount,
    };
  }

  async getBalance(): Promise<ReloadlyBalance | null> {
    return { balanceMinor: 100000, currencyCode: "USD" };
  }
}

export interface DigitalServiceProvider {
  isLive(): boolean;
  getOperators(countryIso: string): Promise<AirtimeOperator[]>;
  submitTopup(params: TopupParams): Promise<TopupResult>;
  getBalance(): Promise<ReloadlyBalance | null>;
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

  getBalance(): Promise<ReloadlyBalance | null> {
    return this.provider.getBalance();
  }
}

export const reloadlyService: DigitalServiceProvider = new DefaultReloadlyService();
