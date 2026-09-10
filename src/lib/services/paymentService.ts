import "server-only";
import type { Currency, PaymentMethod } from "@prisma/client";

/**
 * PaymentService — provider-agnostic payment abstraction.
 *
 * NO real payment processing happens in this codebase. There is no
 * Paystack/Flutterwave/card-network integration wired up. `MockPaymentProvider`
 * simulates a successful (or, for CASH_ON_DELIVERY, pending) payment so the
 * order flow can be built and demoed end-to-end without ever touching real
 * money or fabricating a "processed" transaction against a real gateway.
 *
 * To go live: implement a `PaystackPaymentProvider` / `FlutterwavePaymentProvider`
 * (etc.) satisfying `PaymentProvider`, read credentials from environment
 * variables (never hardcode them), and select the provider in
 * `resolveProvider()` below based on destination country / configured env.
 * Nothing in checkout.ts or the API routes should need to change.
 */

export interface PaymentInitiation {
  providerRef: string;
  providerName: string;
  status: "SUCCESSFUL" | "PENDING" | "FAILED";
  redirectUrl?: string;
}

export interface PaymentProvider {
  name: string;
  charge(params: {
    amountMinor: number;
    currency: Currency;
    method: PaymentMethod;
    orderNumber: string;
  }): Promise<PaymentInitiation>;
}

class MockPaymentProvider implements PaymentProvider {
  name = "MOCK";

  async charge({
    method,
    orderNumber,
  }: {
    amountMinor: number;
    currency: Currency;
    method: PaymentMethod;
    orderNumber: string;
  }): Promise<PaymentInitiation> {
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

export interface PaymentService {
  charge(params: {
    amountMinor: number;
    currency: Currency;
    method: PaymentMethod;
    orderNumber: string;
  }): Promise<PaymentInitiation>;
  isLive(): boolean;
}

class DefaultPaymentService implements PaymentService {
  private provider: PaymentProvider;

  constructor() {
    // Real credentials are intentionally not checked in as "enabling" a live
    // path here — flip this over explicitly once a Live provider class
    // exists and has been reviewed, not merely because an env var is set.
    this.provider = new MockPaymentProvider();
  }

  isLive(): boolean {
    return this.provider.name !== "MOCK";
  }

  async charge(params: {
    amountMinor: number;
    currency: Currency;
    method: PaymentMethod;
    orderNumber: string;
  }): Promise<PaymentInitiation> {
    return this.provider.charge(params);
  }
}

export const paymentService: PaymentService = new DefaultPaymentService();
