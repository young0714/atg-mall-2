import "server-only";
import { randomBytes } from "crypto";
import ModemPay from "modem-pay";
import type { PaymentMethodType as ModemPayMethodType } from "modem-pay";
import type { Currency, PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { notificationService, NOTIFICATION_EVENTS } from "./notificationService";
import { renderEmailLayout, APP_URL } from "@/lib/email/emailLayout";
import { walletService } from "./walletService";
import { commissionService } from "./commissionService";
import { matchNames } from "./nameMatchService";
import { checkDepositLimit } from "./depositLimitService";

// Currencies Flutterwave accepts for card/bank-transfer charges, per their
// own docs. GMD (Gambian Dalasi) is notably absent — routed to Waychit
// instead (see WaychitPaymentProvider below), which is Gambia-only.
const FLUTTERWAVE_SUPPORTED_CURRENCIES: Currency[] = [
  "USD",
  "NGN",
  // GHS, KES, ZAR, etc. aren't Currency values this app uses yet.
];

/**
 * PaymentService — provider-agnostic payment abstraction.
 *
 * `MockPaymentProvider` simulates a successful (or, for CASH_ON_DELIVERY,
 * pending) payment, used whenever a currency has no live provider configured
 * — so the order flow can be built and demoed end-to-end without ever
 * touching real money. `DefaultPaymentService` otherwise routes by currency:
 * GMD goes to `ModemPayPaymentProvider` when configured (the active GMD
 * gateway — picked over `WaychitPaymentProvider` for having a real sandbox,
 * a cleaner single Payment-Intents API, and an official SDK), falling back
 * to `WaychitPaymentProvider` if `MODEMPAY_SECRET_KEY` is ever unset (kept
 * around as a rollback path, not deleted); everything else goes to
 * `FlutterwavePaymentProvider`. All three work the same way — initialize a
 * hosted-checkout payment and return a redirectUrl; actual confirmation
 * only ever happens later, via `confirmFlutterwaveTransaction`/
 * `confirmWaychitTransaction`/`confirmModemPayTransaction`, called from
 * each provider's webhook route (authoritative) and the shared checkout
 * callback page (UX only).
 */

export interface ChargeParams {
  userId: string;
  amountMinor: number;
  currency: Currency;
  method: PaymentMethod;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  redirectUrl: string;
  // True only for the Wallet "Deposit Funds" flow. An order payment is
  // already tied to a specific order and delivery address — inherently
  // traceable — so the velocity cap only applies to wallet top-ups, which
  // create a flexible, reusable balance with no delivery trail at all.
  isWalletDeposit: boolean;
}

export interface PaymentInitiation {
  providerRef: string;
  providerName: string;
  status: "SUCCESSFUL" | "PENDING" | "FAILED";
  redirectUrl?: string;
  failureReason?: string;
}

export interface PaymentProvider {
  name: string;
  charge(params: ChargeParams): Promise<PaymentInitiation>;
}

class MockPaymentProvider implements PaymentProvider {
  name = "MOCK";

  async charge({ method, orderNumber }: ChargeParams): Promise<PaymentInitiation> {
    const providerRef = `MOCK-${orderNumber}-${Date.now().toString(36).toUpperCase()}`;

    if (method === "CASH_ON_DELIVERY") {
      return { providerRef, providerName: this.name, status: "PENDING" };
    }

    // Simulated instant success — this is a development/demo stand-in only.
    // A real integration would redirect to the provider's hosted checkout
    // (or use their SDK) and confirm via webhook/callback verification.
    return { providerRef, providerName: this.name, status: "SUCCESSFUL" };
  }
}

const FLUTTERWAVE_API = "https://api.flutterwave.com/v3";

class FlutterwavePaymentProvider implements PaymentProvider {
  name = "FLUTTERWAVE";
  constructor(private secretKey: string) {}

  async charge(params: ChargeParams): Promise<PaymentInitiation> {
    const txRef = `FLW-${params.orderNumber}-${randomBytes(6).toString("hex")}`;

    if (!FLUTTERWAVE_SUPPORTED_CURRENCIES.includes(params.currency)) {
      return {
        providerRef: txRef,
        providerName: this.name,
        status: "FAILED",
        failureReason: `${params.currency} isn't supported for card/bank transfer yet. Please pay from your ATG Wallet instead.`,
      };
    }

    const paymentOptions = params.method === "BANK_TRANSFER" ? "banktransfer" : "card";

    const res = await fetch(`${FLUTTERWAVE_API}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: (params.amountMinor / 100).toFixed(2),
        currency: params.currency,
        redirect_url: params.redirectUrl,
        payment_options: paymentOptions,
        customer: { email: params.customerEmail, name: params.customerName },
        customizations: { title: "ATG Mall", description: `Order ${params.orderNumber}` },
      }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok || body?.status !== "success" || !body?.data?.link) {
      return {
        providerRef: txRef,
        providerName: this.name,
        status: "FAILED",
        failureReason: body?.message || "Could not start the payment. Please try again.",
      };
    }

    return { providerRef: txRef, providerName: this.name, status: "PENDING", redirectUrl: body.data.link };
  }
}

const WAYCHIT_API = "https://api.waychit.com";

// Gambia-only gateway (Visa/Mastercard, Afrimoney, QMoney, Wave, Yonna, APS,
// Ecobank) — the one Flutterwave doesn't cover, per FLUTTERWAVE_SUPPORTED_CURRENCIES
// above. Confirmed via Waychit's own docs (waychit.com/developers) 2026-09-20;
// they have no sandbox/test-key mode, only live keys.
//
// Two genuinely different Waychit flows, chosen by method — their API has no
// single endpoint that lets a caller pick a channel:
//  - CARD -> POST /v1/payment-sessions/card: a real card-only hosted page.
//  - BANK_TRANSFER (labelled "Bank Transfer / Mobile Money" in the UI) ->
//    POST /v1/payment-requests: one hosted page bundling every other channel
//    together (Wave, QMoney, Afrimoney, Yonna, APS, Ecobank, bank transfer);
//    Waychit has no way to isolate just one of those, the customer picks on
//    their page. Confirmed working end-to-end with a real Wave payment
//    2026-09-20 (webhook fired, order marked paid) — the CARD/payment-sessions
//    flow is still unverified against a real transaction.
// Each flow has its own response shape, status field names, and webhook
// event (payment.session.completed vs payment.request.completed) — see
// confirmWaychitCardSessionTransaction / confirmWaychitTransaction below.
class WaychitPaymentProvider implements PaymentProvider {
  name = "WAYCHIT";
  constructor(private apiKey: string) {}

  async charge(params: ChargeParams): Promise<PaymentInitiation> {
    const clientReference = `WC-${params.orderNumber}-${randomBytes(6).toString("hex")}`;

    if (params.currency !== "GMD") {
      return {
        providerRef: clientReference,
        providerName: this.name,
        status: "FAILED",
        failureReason: "Waychit only supports GMD payments.",
      };
    }

    // Docs confirm "price"/"amount" are whole Dalasi, not minor units
    // (butut) like every other provider here: "Cost of the product in
    // dalasis" (payment-sessions/card Request Parameters).
    const amountMajor = Math.round(params.amountMinor / 100);
    const successRedirectUrl = `${params.redirectUrl}?wcref=${clientReference}`;
    const failureRedirectUrl = `${params.redirectUrl}?wcref=${clientReference}&failed=1`;

    if (params.method === "CARD") {
      const res = await fetch(`${WAYCHIT_API}/v1/payment-sessions/card`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientReference,
          lineItems: [{ productName: `Order ${params.orderNumber}`, quantity: 1, price: amountMajor }],
          customerEmail: params.customerEmail,
          // Note the different field name from payment-requests below
          // (returnRedirectUrl, not successRedirectUrl) — per their docs.
          returnRedirectUrl: successRedirectUrl,
          failureRedirectUrl,
          metadata: { orderNumber: params.orderNumber },
        }),
      });

      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success || !body?.paymentSession?.waychitLaunchUrl) {
        return {
          providerRef: clientReference,
          providerName: this.name,
          status: "FAILED",
          failureReason: body?.message || "Could not start the payment. Please try again.",
        };
      }

      return { providerRef: clientReference, providerName: this.name, status: "PENDING", redirectUrl: body.paymentSession.waychitLaunchUrl };
    }

    const res = await fetch(`${WAYCHIT_API}/v1/payment-requests`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountMajor,
        description: `Order ${params.orderNumber}`,
        clientReference,
        successRedirectUrl,
        failureRedirectUrl,
        metadata: { orderNumber: params.orderNumber },
      }),
    });

    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success || !body?.paymentRequest?.waychitLaunchUrl) {
      return {
        providerRef: clientReference,
        providerName: this.name,
        status: "FAILED",
        failureReason: body?.message || "Could not start the payment. Please try again.",
      };
    }

    // providerRef stores OUR clientReference, not Waychit's own paymentRequest.id
    // (only known after this call returns) — the webhook payload echoes
    // clientReference back, which is what confirmWaychitTransaction looks
    // up the Payment row by; Waychit's id is used only for the live re-verify
    // GET call, never stored.
    return { providerRef: clientReference, providerName: this.name, status: "PENDING", redirectUrl: body.paymentRequest.waychitLaunchUrl };
  }
}

// The active GMD gateway (see resolveProvider() below) — picked over
// Waychit for having a real sandbox (sk_test_... keys, a CLI that tunnels
// webhooks to localhost) where Waychit has none at all. Uses the official
// `modem-pay` SDK rather than raw fetch, specifically so webhook signature
// verification is theirs to maintain, not hand-rolled HMAC like Waychit's.
//
// Confirmed via the SDK's own shipped type definitions (not just docs
// prose, which was ambiguous on this) 2026-09-21:
//  - `PaymentIntentResponse.data.amount` is documented as "in the smallest
//    unit of the currency" — i.e. already minor units (butut), matching
//    this app's own amountMinor convention directly. No /100 or *100
//    conversion, unlike Waychit (whole Dalasi) or Flutterwave (major units).
//  - `payment_methods` accepts exactly "card" | "bank" | "wallet"
//    (PaymentMethodType) — mapped from our own two-option UI below.
//  - `paymentIntents.retrieve(id)` takes the Payment Intent's own `id`
//    field (present in the create response as `data.id`), not the
//    `intent_secret` — confirmed by cross-referencing the retrieve
//    signature against PaymentIntentResponse's distinct `id`/
//    `intent_secret` fields. `data.id` is what's stored as providerRef.
//
// NOT yet confirmed against a real sandbox transaction: the exact query
// param Modem Pay appends to return_url on redirect (assumed
// "payment_intent_id" below, matching the webhook payload's own field name
// — see confirmModemPayTransaction and checkout/callback/page.tsx). If
// wrong, the webhook remains authoritative regardless; only the callback
// page's same-request confirmation would lag until the customer refreshes.
class ModemPayPaymentProvider implements PaymentProvider {
  name = "MODEMPAY";
  private client: ModemPay;
  constructor(secretKey: string) {
    this.client = new ModemPay(secretKey);
  }

  async charge(params: ChargeParams): Promise<PaymentInitiation> {
    if (params.currency !== "GMD") {
      return {
        providerRef: `MODEMPAY-UNSUPPORTED-${Date.now().toString(36).toUpperCase()}`,
        providerName: this.name,
        status: "FAILED",
        failureReason: "Modem Pay only supports GMD payments.",
      };
    }

    // "Bank Transfer / Mobile Money" in the UI (same bundling label
    // Waychit's UI copy already uses) maps to Modem Pay's "wallet" (Wave,
    // Afrimoney, QMoney) + "bank" methods together — their hosted page lets
    // the customer pick between them, same as Waychit's bundled flow does.
    const paymentMethods: ModemPayMethodType[] = params.method === "CARD" ? ["card"] : ["wallet", "bank"];

    try {
      const response = await this.client.paymentIntents.create({
        amount: params.amountMinor,
        currency: params.currency,
        return_url: params.redirectUrl,
        cancel_url: params.redirectUrl,
        payment_methods: paymentMethods,
        customer_name: params.customerName,
        customer_email: params.customerEmail,
        metadata: { orderNumber: params.orderNumber },
      });

      if (!response.status || !response.data?.payment_link || !response.data?.id) {
        return {
          providerRef: `MODEMPAY-FAILED-${Date.now().toString(36).toUpperCase()}`,
          providerName: this.name,
          status: "FAILED",
          failureReason: response.message || "Could not start the payment. Please try again.",
        };
      }

      return { providerRef: response.data.id, providerName: this.name, status: "PENDING", redirectUrl: response.data.payment_link };
    } catch (err) {
      // Unlike raw fetch (which resolves even on a 4xx/5xx), the SDK
      // throws on an API/network error — never let that crash checkout.
      return {
        providerRef: `MODEMPAY-ERROR-${Date.now().toString(36).toUpperCase()}`,
        providerName: this.name,
        status: "FAILED",
        failureReason: err instanceof Error ? err.message : "Could not start the payment. Please try again.",
      };
    }
  }
}

export interface PaymentService {
  charge(params: ChargeParams): Promise<PaymentInitiation>;
  // Both take an optional currency: omitted, they answer "is anything live
  // at all" (for generic UI copy); passed, they answer for the specific
  // provider that currency actually routes to.
  isLive(currency?: Currency): boolean;
  providerNameFor(currency: Currency): string;
}

class DefaultPaymentService implements PaymentService {
  private flutterwave: FlutterwavePaymentProvider | null;
  private waychit: WaychitPaymentProvider | null;
  private modempay: ModemPayPaymentProvider | null;
  private mock = new MockPaymentProvider();

  constructor() {
    this.flutterwave = process.env.FLUTTERWAVE_SECRET_KEY
      ? new FlutterwavePaymentProvider(process.env.FLUTTERWAVE_SECRET_KEY)
      : null;
    this.waychit = process.env.WAYCHIT_API_KEY ? new WaychitPaymentProvider(process.env.WAYCHIT_API_KEY) : null;
    this.modempay = process.env.MODEMPAY_SECRET_KEY ? new ModemPayPaymentProvider(process.env.MODEMPAY_SECRET_KEY) : null;
  }

  // GMD goes to Modem Pay when configured, falling back to Waychit (kept
  // as a rollback path, see the doc comment above) — everything else goes
  // to Flutterwave. Either ultimately falls back to the mock provider when
  // nothing's configured.
  private resolveProvider(currency: Currency): PaymentProvider {
    if (currency === "GMD") return this.modempay ?? this.waychit ?? this.mock;
    return this.flutterwave ?? this.mock;
  }

  isLive(currency?: Currency): boolean {
    if (currency) return this.resolveProvider(currency).name !== "MOCK";
    return !!this.flutterwave || !!this.waychit;
  }

  providerNameFor(currency: Currency): string {
    return this.resolveProvider(currency).name;
  }

  async charge(params: ChargeParams): Promise<PaymentInitiation> {
    const provider = this.resolveProvider(params.currency);

    // Monthly deposit limit: wallet top-ups only, not order payments — an
    // order payment is already tied to a specific order and delivery
    // address (inherently traceable), so the cap is reserved for the one
    // flow that creates a flexible, reusable balance with no delivery trail
    // at all. Never applies to the mock provider (dev/demo stays
    // frictionless).
    if (provider.name !== "MOCK" && params.isWalletDeposit && (params.method === "CARD" || params.method === "BANK_TRANSFER")) {
      const depositLimit = await checkDepositLimit({
        userId: params.userId,
        amountMinor: params.amountMinor,
        currency: params.currency,
      });
      if (!depositLimit.allowed) {
        return {
          providerRef: `CAP-BLOCKED-${Date.now().toString(36).toUpperCase()}`,
          providerName: provider.name,
          status: "FAILED",
          failureReason: depositLimit.reason,
        };
      }
    }

    return provider.charge(params);
  }
}

export const paymentService: PaymentService = new DefaultPaymentService();

/**
 * The single source of truth for "a Flutterwave payment actually succeeded."
 * Called from both the webhook (authoritative) and the checkout callback
 * page (UX only, in case the webhook hasn't landed yet) — safe to call
 * twice for the same transaction, and never trusts the caller's claimed
 * status: always re-verifies against Flutterwave's API and cross-checks the
 * amount/currency against what was actually charged.
 */
export async function confirmFlutterwaveTransaction(transactionId: string): Promise<{ ok: boolean; orderId?: string }> {
  const secretKey = process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secretKey) return { ok: false };

  const res = await fetch(`${FLUTTERWAVE_API}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const body = await res.json().catch(() => null);
  const data = body?.data;
  if (!res.ok || body?.status !== "success" || !data || data.status !== "successful") {
    return { ok: false };
  }

  const payment = await db.payment.findFirst({ where: { providerRef: data.tx_ref }, include: { order: true } });
  if (!payment) return { ok: false };

  // Cross-check against what we actually charged for — never trust the
  // verify response's amount alone without tying it back to our own record.
  const amountMatches = Math.round(Number(data.amount) * 100) === payment.amountMinor;
  const currencyMatches = data.currency === payment.currency;
  if (!amountMatches || !currencyMatches) return { ok: false };

  if (payment.status === "SUCCESSFUL") return { ok: true, orderId: payment.orderId ?? undefined };

  // Resolve the profile whose name we'd compare a bank-transfer sender
  // against — the order's buyer, or the wallet-deposit's own user.
  const profileUserId = payment.order?.userId ?? payment.userId ?? null;
  const profileUser = profileUserId ? await db.user.findUnique({ where: { id: profileUserId } }) : null;

  // Bank-transfer sender name match — Nigeria/NGN only, since it relies on
  // NIBSS transfer metadata Flutterwave passes through on the verify
  // response. A plausibility flag for admin review, never an automated
  // block — see nameMatchService.ts.
  const meta = data.meta_data ?? data.meta ?? null;
  const originatorName: string | undefined = meta?.originatorname;
  const nameMatchFields =
    payment.method === "BANK_TRANSFER" && payment.currency === "NGN" && originatorName && profileUser
      ? {
          payerBankName: meta?.bankname ?? null,
          payerAccountName: originatorName,
          payerAccountNumberMasked: meta?.originatoraccountnumber ?? null,
          nameMatchScore: matchNames(profileUser.fullName, originatorName).score,
        }
      : {};

  await db.payment.update({ where: { id: payment.id }, data: { status: "SUCCESSFUL", ...nameMatchFields } });

  if (payment.order) {
    await db.order.update({ where: { id: payment.order.id }, data: { status: "PAID" } });
    await db.trackingEvent.create({
      data: { orderId: payment.order.id, status: "PAID", description: "Payment confirmed via Flutterwave." },
    });
    await commissionService.createForOrder(payment.order.id);
    await db.cart
      .update({ where: { userId: payment.order.userId }, data: { items: { deleteMany: {} } } })
      .catch(() => {});

    if (profileUser) {
      await notificationService.notify({
        userId: profileUser.id,
        userContact: profileUser.email,
        event: NOTIFICATION_EVENTS.PAYMENT_RECEIVED,
        title: "Payment received",
        body: `We've received your payment for order ${payment.order.orderNumber}.`,
        html: await renderEmailLayout({
          eyebrow: "PAYMENT RECEIVED",
          heading: "We've got your payment",
          bodyHtml: `We've received your payment for order <strong>${payment.order.orderNumber}</strong>.`,
          cta: { label: "View Order", url: `${APP_URL}/account/orders` },
          includeTrending: true,
        }),
        channels: ["IN_APP", "EMAIL"],
      });
    }

    return { ok: true, orderId: payment.order.id };
  }

  if (payment.userId) {
    await walletService.credit({
      userId: payment.userId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      type: "DEPOSIT",
      description: `Wallet top-up via ${payment.method === "CARD" ? "card" : "bank transfer"} (${payment.providerName})`,
      referenceType: "DEPOSIT",
      referenceId: payment.providerRef ?? payment.id,
    });
  }

  return { ok: true };
}

/**
 * Shared by both Waychit confirm functions below once each has verified its
 * own flow-specific "actually succeeded" signal — looks up our Payment row
 * by the clientReference we control, cross-checks amount/currency against
 * what we actually charged for (same defensive shape as
 * confirmFlutterwaveTransaction), then marks it paid.
 */
async function finalizeWaychitPayment(
  clientReference: string,
  amountMajor: number,
  currency: string,
): Promise<{ ok: boolean; orderId?: string }> {
  const payment = await db.payment.findFirst({ where: { providerRef: clientReference }, include: { order: true } });
  if (!payment) return { ok: false };

  // amountMajor assumes Waychit's API uses whole GMD (not minor units) — per
  // their docs ("Cost of the product in dalasis") and confirmed by a real
  // Wave payment 2026-09-20. Currency compared case-insensitively — Waychit's
  // own docs are inconsistent ("GMD" in some examples, "gmd" in others).
  const amountMatches = Math.round(amountMajor * 100) === payment.amountMinor;
  const currencyMatches = currency.toUpperCase() === payment.currency;
  if (!amountMatches || !currencyMatches) return { ok: false };

  if (payment.status === "SUCCESSFUL") return { ok: true, orderId: payment.orderId ?? undefined };

  await db.payment.update({ where: { id: payment.id }, data: { status: "SUCCESSFUL" } });

  if (payment.order) {
    await db.order.update({ where: { id: payment.order.id }, data: { status: "PAID" } });
    await db.trackingEvent.create({
      data: { orderId: payment.order.id, status: "PAID", description: "Payment confirmed via Waychit." },
    });
    await commissionService.createForOrder(payment.order.id);
    await db.cart
      .update({ where: { userId: payment.order.userId }, data: { items: { deleteMany: {} } } })
      .catch(() => {});

    const profileUser = await db.user.findUnique({ where: { id: payment.order.userId } });
    if (profileUser) {
      await notificationService.notify({
        userId: profileUser.id,
        userContact: profileUser.email,
        event: NOTIFICATION_EVENTS.PAYMENT_RECEIVED,
        title: "Payment received",
        body: `We've received your payment for order ${payment.order.orderNumber}.`,
        html: await renderEmailLayout({
          eyebrow: "PAYMENT RECEIVED",
          heading: "We've got your payment",
          bodyHtml: `We've received your payment for order <strong>${payment.order.orderNumber}</strong>.`,
          cta: { label: "View Order", url: `${APP_URL}/account/orders` },
          includeTrending: true,
        }),
        channels: ["IN_APP", "EMAIL"],
      });
    }

    return { ok: true, orderId: payment.order.id };
  }

  if (payment.userId) {
    await walletService.credit({
      userId: payment.userId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      type: "DEPOSIT",
      description: `Wallet top-up via Waychit`,
      referenceType: "DEPOSIT",
      referenceId: payment.providerRef ?? payment.id,
    });
  }

  return { ok: true };
}

/**
 * The single source of truth for "a Waychit Bank Transfer / Mobile Money
 * payment actually succeeded" (the bundled /v1/payment-requests flow — Wave,
 * QMoney, Afrimoney, Yonna, APS, Ecobank, bank transfer). Takes Waychit's own
 * payment-request id (only the webhook reliably has this — see
 * api/v1/webhooks/waychit/route.ts). Never trusts the webhook payload's
 * claimed status alone: re-verifies against Waychit's own API first.
 *
 * Confirmed working end-to-end with a real Wave payment 2026-09-20 — webhook
 * fired, this re-verified successfully, order marked paid.
 *
 * The checkout callback page does NOT call this — Waychit has no documented
 * sandbox to confirm whether their redirect reliably carries this id, so
 * the callback page instead reads our own Payment row directly by the
 * clientReference it does control (see checkout/callback/page.tsx). This
 * function's job is the authoritative, webhook-driven path only.
 */
export async function confirmWaychitTransaction(waychitId: string): Promise<{ ok: boolean; orderId?: string }> {
  const apiKey = process.env.WAYCHIT_API_KEY;
  if (!apiKey) return { ok: false };

  const res = await fetch(`${WAYCHIT_API}/v1/payment-requests/${waychitId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  const body = await res.json().catch(() => null);
  const data = body?.paymentRequest;
  if (!res.ok || !body?.success || !data) return { ok: false };

  // Waychit's docs show "status" on a plain retrieve but
  // "paymentRequestStatus"/"paymentStatus" on the completed webhook payload
  // — this defensive dual-field check (rather than assuming one) is what
  // actually matched on the real 2026-09-20 transaction, so kept as-is.
  const isClosed = data.paymentRequestStatus === "closed" || data.status === "closed";
  const isSucceeded = data.paymentStatus ? data.paymentStatus === "succeeded" : isClosed;
  if (!isClosed || !isSucceeded || !data.clientReference) return { ok: false };

  return finalizeWaychitPayment(data.clientReference, Number(data.amount), data.currency);
}

/**
 * Same as confirmWaychitTransaction above, but for the card-only
 * /v1/payment-sessions/card flow — a different endpoint, response shape
 * ("paymentSession" not "paymentRequest", "totalAmount" not "amount",
 * "paymentSessionStatus" not "paymentRequestStatus"), and webhook event
 * (payment.session.completed).
 */
export async function confirmWaychitCardSessionTransaction(sessionId: string): Promise<{ ok: boolean; orderId?: string }> {
  const apiKey = process.env.WAYCHIT_API_KEY;
  if (!apiKey) return { ok: false };

  const res = await fetch(`${WAYCHIT_API}/v1/payment-sessions/card/${sessionId}`, {
    headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json" },
  });
  const body = await res.json().catch(() => null);
  const data = body?.paymentSession;
  if (!res.ok || !body?.success || !data) return { ok: false };

  const isClosed = data.paymentSessionStatus === "closed" || data.status === "closed";
  const isSucceeded = data.paymentStatus ? data.paymentStatus === "succeeded" : isClosed;
  if (!isClosed || !isSucceeded || !data.clientReference) return { ok: false };

  return finalizeWaychitPayment(data.clientReference, Number(data.totalAmount), data.currency);
}

/**
 * The single source of truth for "a Modem Pay payment actually succeeded" —
 * same shape as confirmFlutterwaveTransaction/finalizeWaychitPayment above:
 * called from both the webhook (authoritative) and the checkout callback
 * page (UX only), safe to call more than once, and never trusts a caller's
 * claimed status — always re-fetches from Modem Pay's own API and
 * cross-checks amount/currency against what we actually charged for.
 *
 * Takes the Payment Intent's own `id` (stored as Payment.providerRef at
 * charge() time, and the same value the webhook payload calls
 * `payment_intent_id`) — see the ModemPayPaymentProvider doc comment above
 * for how that was confirmed against the SDK's shipped types.
 */
export async function confirmModemPayTransaction(paymentIntentId: string): Promise<{ ok: boolean; orderId?: string }> {
  const secretKey = process.env.MODEMPAY_SECRET_KEY;
  if (!secretKey) return { ok: false };

  let intent;
  try {
    intent = await new ModemPay(secretKey).paymentIntents.retrieve(paymentIntentId);
  } catch {
    return { ok: false };
  }
  if (intent.status !== "successful") return { ok: false };

  const payment = await db.payment.findFirst({ where: { providerRef: paymentIntentId }, include: { order: true } });
  if (!payment) return { ok: false };

  // amount is already minor units on both sides (see the provider's doc
  // comment) — no unit conversion needed for this comparison, unlike
  // Waychit/Flutterwave.
  const amountMatches = intent.amount === payment.amountMinor;
  const currencyMatches = intent.currency === payment.currency;
  if (!amountMatches || !currencyMatches) return { ok: false };

  if (payment.status === "SUCCESSFUL") return { ok: true, orderId: payment.orderId ?? undefined };

  await db.payment.update({ where: { id: payment.id }, data: { status: "SUCCESSFUL" } });

  if (payment.order) {
    await db.order.update({ where: { id: payment.order.id }, data: { status: "PAID" } });
    await db.trackingEvent.create({
      data: { orderId: payment.order.id, status: "PAID", description: "Payment confirmed via Modem Pay." },
    });
    await commissionService.createForOrder(payment.order.id);
    await db.cart
      .update({ where: { userId: payment.order.userId }, data: { items: { deleteMany: {} } } })
      .catch(() => {});

    const profileUser = await db.user.findUnique({ where: { id: payment.order.userId } });
    if (profileUser) {
      await notificationService.notify({
        userId: profileUser.id,
        userContact: profileUser.email,
        event: NOTIFICATION_EVENTS.PAYMENT_RECEIVED,
        title: "Payment received",
        body: `We've received your payment for order ${payment.order.orderNumber}.`,
        html: await renderEmailLayout({
          eyebrow: "PAYMENT RECEIVED",
          heading: "We've got your payment",
          bodyHtml: `We've received your payment for order <strong>${payment.order.orderNumber}</strong>.`,
          cta: { label: "View Order", url: `${APP_URL}/account/orders` },
          includeTrending: true,
        }),
        channels: ["IN_APP", "EMAIL"],
      });
    }

    return { ok: true, orderId: payment.order.id };
  }

  if (payment.userId) {
    await walletService.credit({
      userId: payment.userId,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      type: "DEPOSIT",
      description: `Wallet top-up via ${payment.method === "CARD" ? "card" : "mobile money/bank transfer"} (Modem Pay)`,
      referenceType: "DEPOSIT",
      referenceId: payment.providerRef ?? payment.id,
    });
  }

  return { ok: true };
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  FLUTTERWAVE: "Flutterwave",
  WAYCHIT: "Waychit",
  MODEMPAY: "Modem Pay",
};

/** UI label for a Card/Bank Transfer option: "(via Flutterwave)", "(via Waychit)", or a mock-mode note. */
export function gatewayLabel(currency: Currency): string {
  const name = paymentService.providerNameFor(currency);
  return name === "MOCK" ? "(mock payment, no real gateway connected yet)" : `(via ${PROVIDER_DISPLAY_NAMES[name] ?? name})`;
}
