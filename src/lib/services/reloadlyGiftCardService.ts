import "server-only";
import { getReloadlyAccessToken } from "./reloadlyAuth";

/**
 * ReloadlyGiftCardService — Digital Services Phase 2. Separate OAuth
 * audience/host from Airtime (see reloadlyService.ts) — Reloadly's product
 * APIs are independently authenticated even though the credentials
 * themselves (RELOADLY_CLIENT_ID/SECRET) are shared across products.
 *
 * The catalog-browsing endpoint isn't documented anywhere it could be
 * fetched (Reloadly's SPA docs don't expose it to non-JS fetches, and their
 * own quickstart guides skip straight to placing an order). Built from the
 * best-grounded guess (mirrors Airtime's /operators/countries/{iso} shape)
 * and verified/corrected against a real sandbox call before shipping — see
 * the mapping comments below for what was actually confirmed live.
 */

export interface GiftCardProduct {
  productId: number;
  productName: string;
  brandName: string;
  currencyCode: string;
  denominationType: "FIXED" | "RANGE";
  fixedDenominations?: number[];
  minDenomination?: number;
  maxDenomination?: number;
  logoUrl?: string;
}

export interface GiftCardOrderParams {
  productId: number;
  countryCode: string;
  quantity: number;
  unitPrice: number; // major units, in the product's own currencyCode
  recipientEmail: string;
  senderName: string;
}

export interface GiftCardOrderResult {
  ok: boolean;
  providerRef?: string; // Reloadly's transactionId
  deliveredAmount?: number;
  deliveredCurrencyCode?: string;
  costMinor?: number;
  failureReason?: string;
}

export interface RedeemCode {
  cardNumber?: string;
  pinCode?: string;
  raw: unknown; // stored as-is in DigitalServiceOrder.deliveryPayload — the exact shape is confirmed live, not guessed
}

interface GiftCardProvider {
  name: string;
  getProducts(countryIso: string): Promise<GiftCardProduct[]>;
  placeOrder(params: GiftCardOrderParams): Promise<GiftCardOrderResult>;
  getRedeemCode(transactionId: string): Promise<RedeemCode | null>;
}

function giftCardsHost(): string {
  return process.env.RELOADLY_ENVIRONMENT === "production"
    ? "https://giftcards.reloadly.com"
    : "https://giftcards-sandbox.reloadly.com";
}

class LiveGiftCardProvider implements GiftCardProvider {
  name = "RELOADLY";
  constructor(
    private clientId: string,
    private clientSecret: string,
  ) {}

  private async authedFetch(path: string, init?: RequestInit): Promise<Response> {
    const host = giftCardsHost();
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

  async getProducts(countryIso: string): Promise<GiftCardProduct[]> {
    const res = await this.authedFetch(`/countries/${encodeURIComponent(countryIso)}/products`);
    const body = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(body)) return [];

    return body
      .map((p: Record<string, unknown>): GiftCardProduct => {
        const brand = p.brand as Record<string, unknown> | undefined;
        return {
          productId: p.productId as number,
          productName: p.productName as string,
          brandName: (brand?.brandName as string | undefined) ?? (p.productName as string),
          currencyCode: (p.recipientCurrencyCode as string | undefined) ?? (p.senderCurrencyCode as string) ?? "USD",
          denominationType: p.denominationType === "RANGE" ? "RANGE" : "FIXED",
          fixedDenominations: p.fixedRecipientDenominations as number[] | undefined,
          minDenomination: p.minRecipientDenomination as number | undefined,
          maxDenomination: p.maxRecipientDenomination as number | undefined,
          logoUrl: (p.logoUrls as string[] | undefined)?.[0],
        };
      })
      .filter((p: GiftCardProduct) => (p.fixedDenominations?.length ?? 0) > 0 || (p.minDenomination != null && p.maxDenomination != null));
  }

  async placeOrder(params: GiftCardOrderParams): Promise<GiftCardOrderResult> {
    const res = await this.authedFetch("/orders", {
      method: "POST",
      body: JSON.stringify({
        productId: params.productId,
        countryCode: params.countryCode,
        quantity: params.quantity,
        unitPrice: params.unitPrice,
        customIdentifier: `ATG-${Date.now().toString(36).toUpperCase()}`,
        senderName: params.senderName,
        recipientEmail: params.recipientEmail,
      }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.transactionId) {
      return { ok: false, failureReason: body?.message || "The gift card order could not be completed. Please try again." };
    }
    const product = body.product as Record<string, unknown> | undefined;
    return {
      ok: true,
      providerRef: String(body.transactionId),
      deliveredAmount: typeof product?.totalPrice === "number" ? product.totalPrice : undefined,
      deliveredCurrencyCode: (product?.currencyCode as string | undefined) ?? body.currencyCode,
      // NOT body.fee (that's just the small platform fee on top, ~$0.10 for
      // a $10 card) — balanceInfo.cost is the actual total deducted from
      // the Reloadly account balance, confirmed live by diffing the account
      // balance before/after a real order (dropped by exactly this amount).
      costMinor: typeof body.balanceInfo?.cost === "number" ? Math.round(body.balanceInfo.cost * 100) : undefined,
    };
  }

  async getRedeemCode(transactionId: string): Promise<RedeemCode | null> {
    const res = await this.authedFetch(`/orders/transactions/${encodeURIComponent(transactionId)}/cards`);
    const body = await res.json().catch(() => null);
    if (!res.ok || !Array.isArray(body) || body.length === 0) return null;
    const first = body[0] as Record<string, unknown>;
    return {
      cardNumber: first.cardNumber as string | undefined,
      pinCode: first.pinCode as string | undefined,
      raw: body,
    };
  }
}

class MockGiftCardProvider implements GiftCardProvider {
  name = "MOCK";

  async getProducts(): Promise<GiftCardProduct[]> {
    return [
      { productId: 1, productName: "Demo Gift Card", brandName: "Demo Brand", currencyCode: "USD", denominationType: "FIXED", fixedDenominations: [10, 25, 50, 100] },
    ];
  }

  async placeOrder(params: GiftCardOrderParams): Promise<GiftCardOrderResult> {
    return {
      ok: true,
      providerRef: `MOCK-${Date.now().toString(36).toUpperCase()}`,
      deliveredAmount: params.unitPrice * params.quantity,
      deliveredCurrencyCode: "USD",
    };
  }

  async getRedeemCode(): Promise<RedeemCode | null> {
    return { cardNumber: "DEMO-0000-0000-0000", pinCode: "0000", raw: { mock: true } };
  }
}

export interface GiftCardService {
  isLive(): boolean;
  getProducts(countryIso: string): Promise<GiftCardProduct[]>;
  placeOrder(params: GiftCardOrderParams): Promise<GiftCardOrderResult>;
  getRedeemCode(transactionId: string): Promise<RedeemCode | null>;
}

class DefaultGiftCardService implements GiftCardService {
  private provider: GiftCardProvider;

  constructor() {
    this.provider =
      process.env.RELOADLY_CLIENT_ID && process.env.RELOADLY_CLIENT_SECRET
        ? new LiveGiftCardProvider(process.env.RELOADLY_CLIENT_ID, process.env.RELOADLY_CLIENT_SECRET)
        : new MockGiftCardProvider();
  }

  isLive(): boolean {
    return this.provider.name !== "MOCK";
  }

  getProducts(countryIso: string): Promise<GiftCardProduct[]> {
    return this.provider.getProducts(countryIso);
  }

  placeOrder(params: GiftCardOrderParams): Promise<GiftCardOrderResult> {
    return this.provider.placeOrder(params);
  }

  getRedeemCode(transactionId: string): Promise<RedeemCode | null> {
    return this.provider.getRedeemCode(transactionId);
  }
}

export const giftCardService: GiftCardService = new DefaultGiftCardService();
