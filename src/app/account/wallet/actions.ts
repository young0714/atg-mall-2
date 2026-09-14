"use server";

import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/current-user";
import { walletDepositSchema, bvnVerificationSchema } from "@/lib/validation/schemas";
import { walletService } from "@/lib/services/walletService";
import { paymentService } from "@/lib/services/paymentService";
import {
  initiateBvnVerification,
  BVN_PENDING_COOKIE,
  BVN_PENDING_COOKIE_MAX_AGE,
} from "@/lib/services/bvnVerificationService";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function depositToWalletAction(formData: FormData) {
  const user = await requireUser();
  const raw = Object.fromEntries(formData) as Record<string, string>;

  // Amount is entered in major units (e.g. "5000" NGN) for readability.
  if (raw.amountMinor) raw.amountMinor = String(Math.round(Number(raw.amountMinor) * 100));

  const parsed = walletDepositSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/account/wallet?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid amount")}`);
  }

  const wallet = await db.wallet.findUniqueOrThrow({ where: { userId: user.id } });
  const { amountMinor, method } = parsed.data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const initiation = await paymentService.charge({
    userId: user.id,
    amountMinor,
    currency: wallet.currency,
    method,
    orderNumber: `WALLET-${user.id.slice(0, 8)}`,
    customerEmail: user.email,
    customerName: user.fullName,
    redirectUrl: `${appUrl}/account/wallet/callback`,
    isWalletDeposit: true,
  });

  await db.payment.create({
    data: {
      userId: user.id,
      method,
      status: initiation.status,
      amountMinor,
      currency: wallet.currency,
      providerName: initiation.providerName,
      providerRef: initiation.providerRef,
    },
  });

  // Live gateway: send the browser to the hosted checkout page — the
  // deposit isn't credited until the webhook/callback confirms it.
  if (initiation.redirectUrl) {
    redirect(initiation.redirectUrl);
  }

  if (initiation.status === "SUCCESSFUL") {
    await walletService.credit({
      userId: user.id,
      amountMinor,
      currency: wallet.currency,
      type: "DEPOSIT",
      description: `Wallet top-up via ${method === "CARD" ? "card" : "bank transfer"} (${initiation.providerName})`,
      referenceType: "DEPOSIT",
      referenceId: initiation.providerRef,
    });
    redirect("/account/wallet?deposited=1");
  }

  redirect(`/account/wallet?error=${encodeURIComponent(initiation.failureReason || "Deposit could not be completed")}`);
}

export async function startBvnVerificationAction(formData: FormData) {
  const user = await requireUser();
  const parsed = bvnVerificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/account/wallet?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Enter a valid BVN")}`);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const initiation = await initiateBvnVerification({
    bvn: parsed.data.bvn,
    fullName: user.fullName,
    redirectUrl: `${appUrl}/account/wallet/bvn-callback`,
  });

  if (!initiation.ok || !initiation.consentUrl || !initiation.reference) {
    redirect(`/account/wallet?error=${encodeURIComponent(initiation.error || "Could not start BVN verification")}`);
  }

  // Carries the pending reference across NIBSS's redirect round-trip — see
  // bvnVerificationService.ts for why a cookie rather than a query param.
  cookies().set(BVN_PENDING_COOKIE, initiation.reference, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: BVN_PENDING_COOKIE_MAX_AGE,
  });

  redirect(initiation.consentUrl);
}
