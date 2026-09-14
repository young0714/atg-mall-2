"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { walletService } from "@/lib/services/walletService";
import { paymentService } from "@/lib/services/paymentService";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function payOrderWithWalletAction(formData: FormData) {
  const user = await requireUser();
  const orderId = String(formData.get("orderId"));

  const order = await db.order.findFirst({ where: { id: orderId, userId: user.id } });
  if (!order || order.status !== "PENDING_PAYMENT") {
    redirect(`/account/orders/${orderId}`);
  }

  const result = await walletService.debit({
    userId: user.id,
    amountMinor: order!.totalMinor,
    currency: order!.currency,
    description: `Payment for order ${order!.orderNumber}`,
    referenceType: "ORDER",
    referenceId: order!.id,
  });

  if (result.success) {
    await db.payment.create({
      data: {
        orderId: order!.id,
        method: "WALLET",
        status: "SUCCESSFUL",
        amountMinor: order!.totalMinor,
        currency: order!.currency,
        providerName: "ATG_WALLET",
        providerRef: `WALLET-${order!.id}-${Date.now()}`,
      },
    });
    await db.order.update({ where: { id: order!.id }, data: { status: "PAID" } });
    await db.trackingEvent.create({
      data: { orderId: order!.id, status: "PAID", description: "Payment confirmed from ATG Wallet." },
    });
    revalidatePath(`/account/orders/${orderId}`);
    redirect(`/account/orders/${orderId}?paid=1`);
  }

  redirect(`/account/orders/${orderId}?error=Insufficient+wallet+balance.+Please+top+up+your+wallet.`);
}

export async function retryPaymentAction(formData: FormData) {
  const user = await requireUser();
  const orderId = String(formData.get("orderId"));

  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!order || order.status !== "PENDING_PAYMENT") {
    redirect(`/account/orders/${orderId}`);
  }

  const lastGatewayAttempt = order!.payments.find((p) => p.method !== "WALLET");
  const method = lastGatewayAttempt?.method ?? "CARD";

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const initiation = await paymentService.charge({
    amountMinor: order!.totalMinor,
    currency: order!.currency,
    method,
    orderNumber: order!.orderNumber,
    customerEmail: user.email,
    customerName: user.fullName,
    redirectUrl: `${appUrl}/checkout/callback`,
  });

  await db.payment.create({
    data: {
      orderId: order!.id,
      method,
      status: initiation.status,
      amountMinor: order!.totalMinor,
      currency: order!.currency,
      providerName: initiation.providerName,
      providerRef: initiation.providerRef,
    },
  });

  if (initiation.redirectUrl) {
    redirect(initiation.redirectUrl);
  }

  redirect(`/account/orders/${orderId}?error=${encodeURIComponent(initiation.failureReason || "Payment could not be started. Please try again.")}`);
}
