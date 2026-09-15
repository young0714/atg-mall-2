import "server-only";
import { getReloadlyAccessToken } from "./reloadlyAuth";

/**
 * ReloadlyUtilityService — Digital Services Phase 3 (electricity, cable TV,
 * etc). Separate OAuth audience/host from Airtime and Gift Cards.
 *
 * Scope trim vs. the mockup: Reloadly's docs call out some billers as
 * needing "additional requirements" (implying a separate
 * validate-the-account-before-paying step for at least some billers), but
 * that endpoint isn't documented anywhere fetchable and this first pass has
 * no live-confirmed shape for it. Rather than guess an endpoint with zero
 * grounding, this skips a separate validation call — subscriberAccountNumber
 * goes straight into the /pay request, and whatever confirmation Reloadly
 * includes in that same response (if any) is captured defensively.
 */

export interface UtilityBiller {
  billerId: number;
  name: string;
  serviceType?: string;
}

export interface PayBillParams {
  billerId: number;
  subscriberAccountNumber: string;
  amount: number; // major units, in the biller's own local currency
}

export interface PayBillResult {
  ok: boolean;
  providerRef?: string;
  rawStatus?: string; // Reloadly's own status string, stored for admin visibility — meaning not fully confirmed live yet
  validatedCustomerName?: string;
  failureReason?: string;
}

interface UtilityProvider {
  name: string;
  getBillers(countryIso: string): Promise<UtilityBiller[]>;
  payBill(params: PayBillParams): Promise<PayBillResult>;
}

function utilitiesHost(): string {
  return process.env.RELOADLY_ENVIRONMENT === "production"
    ? "https://utilities.reloadly.com"
    : "https://utilities-sandbox.reloadly.com";
}

class LiveUtilityProvider implements UtilityProvider {
  name = "RELOADLY";
  constructor(
    private clientId: string,
    private clientSecret: string,
  ) {}

  private async authedFetch(path: string, init?: RequestInit): Promise<Response> {
    const host = utilitiesHost();
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

  async getBillers(countryIso: string): Promise<UtilityBiller[]> {
    const res = await this.authedFetch(`/billers?countryISOCode=${encodeURIComponent(countryIso)}`);
    const body = await res.json().catch(() => null);
    const list = Array.isArray(body) ? body : Array.isArray(body?.content) ? body.content : null;
    if (!res.ok || !list) return [];

    return list.map((b: Record<string, unknown>): UtilityBiller => ({
      billerId: b.id as number,
      name: b.name as string,
      serviceType: b.serviceType as string | undefined,
    }));
  }

  async payBill(params: PayBillParams): Promise<PayBillResult> {
    const res = await this.authedFetch("/pay", {
      method: "POST",
      body: JSON.stringify({
        subscriberAccountNumber: params.subscriberAccountNumber,
        amount: params.amount,
        billerId: params.billerId,
        useLocalAmount: true,
        referenceId: `ATG-${Date.now().toString(36).toUpperCase()}`,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.id) {
      return { ok: false, failureReason: body?.message || "The bill payment could not be completed. Please try again." };
    }
    return {
      ok: true,
      providerRef: String(body.id),
      rawStatus: body.status as string | undefined,
      validatedCustomerName: (body.customerName ?? body.customer?.name) as string | undefined,
    };
  }
}

class MockUtilityProvider implements UtilityProvider {
  name = "MOCK";

  async getBillers(countryIso: string): Promise<UtilityBiller[]> {
    if (countryIso !== "NG") return [];
    return [{ billerId: 999, name: "Demo Electric", serviceType: "ELECTRICITY_BILL_PAYMENT" }];
  }

  async payBill(params: PayBillParams): Promise<PayBillResult> {
    return { ok: true, providerRef: `MOCK-${Date.now().toString(36).toUpperCase()}`, rawStatus: "SUCCESSFUL", validatedCustomerName: "Demo Customer" };
  }
}

export interface UtilityService {
  isLive(): boolean;
  getBillers(countryIso: string): Promise<UtilityBiller[]>;
  payBill(params: PayBillParams): Promise<PayBillResult>;
}

class DefaultUtilityService implements UtilityService {
  private provider: UtilityProvider;

  constructor() {
    this.provider =
      process.env.RELOADLY_CLIENT_ID && process.env.RELOADLY_CLIENT_SECRET
        ? new LiveUtilityProvider(process.env.RELOADLY_CLIENT_ID, process.env.RELOADLY_CLIENT_SECRET)
        : new MockUtilityProvider();
  }

  isLive(): boolean {
    return this.provider.name !== "MOCK";
  }

  getBillers(countryIso: string): Promise<UtilityBiller[]> {
    return this.provider.getBillers(countryIso);
  }

  payBill(params: PayBillParams): Promise<PayBillResult> {
    return this.provider.payBill(params);
  }
}

export const utilityService: UtilityService = new DefaultUtilityService();
