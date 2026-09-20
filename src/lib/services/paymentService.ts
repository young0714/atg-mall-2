import "server-only";
import { randomBytes } from "crypto";
import type { Currency, PaymentMethod } from "@prisma/client";
import { db } from "@/lib/db";
import { notificationService, NOTIFICATION_EVENTS } from "./notificationService";
import { renderEmailLayout, APP_URL } from "@/lib/email/emailLayout";
import { walletService } from "./walletService";
import { commissionService } from "./commissionService";
import { matchNames } from "./nameMatchService";
import { checkDepositLimit } from "./depositLimitService";

// Currencies Flutterwave accepts for card/bank-transfer charges, per their
// own docs. GMD (Gambian Dalasi) is notably absent — Gambian customers keep
// using ATG Wallet, which never touches this gateway.
const FLUTTERWAVE_SUPPORTED_CURRENCIES: Currency[] = [
  "USD",
  "NGN",
  // GHS, KES, ZAR, etc. aren't Currency values this app uses yet.
];

/**
 * PaymentService — provider-agnostic payment abstraction.
 *
 * `MockPaymentProvider` simulates a successful (or, for CASH_ON_DELIVERY,
 * pending) payment, used whenever FLUTTERWAVE_SECRET_KEY isn't set — so the
 * order flow can be built and demoed end-to-end without ever touching real
 * money. When it is set, `FlutterwavePaymentProvider` takes over: it
 * initializes a real Flutterwave hosted-checkout payment and returns a
 * redirectUrl; the actual confirmation of success/failure only ever happens
 * later, via `confirmFlutterwaveTransaction`, called from the webhook route
 * (authoritative) and the checkout callback page (UX only).
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

export interface PaymentService {
  charge(params: ChargeParams): Promise<PaymentInitiation>;
  isLive(): boolean;
}

class DefaultPaymentService implements PaymentService {
  private provider: PaymentProvider;

  constructor() {
    this.provider = process.env.FLUTTERWAVE_SECRET_KEY
      ? new FlutterwavePaymentProvider(process.env.FLUTTERWAVE_SECRET_KEY)
      : new MockPaymentProvider();
  }

  isLive(): boolean {
    return this.provider.name !== "MOCK";
  }

  async charge(params: ChargeParams): Promise<PaymentInitiation> {
    // Monthly deposit limit: wallet top-ups only, not order payments — an
    // order payment is already tied to a specific order and delivery
    // address (inherently traceable), so the cap is reserved for the one
    // flow that creates a flexible, reusable balance with no delivery trail
    // at all. Never applies to the mock provider (dev/demo stays
    // frictionless).
    if (this.isLive() && params.isWalletDeposit && (params.method === "CARD" || params.method === "BANK_TRANSFER")) {
      const depositLimit = await checkDepositLimit({
        userId: params.userId,
        amountMinor: params.amountMinor,
        currency: params.currency,
      });
      if (!depositLimit.allowed) {
        return {
          providerRef: `CAP-BLOCKED-${Date.now().toString(36).toUpperCase()}`,
          providerName: this.provider.name,
          status: "FAILED",
          failureReason: depositLimit.reason,
        };
      }
    }

    return this.provider.charge(params);
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
