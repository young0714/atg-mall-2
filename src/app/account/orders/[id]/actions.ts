"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { walletService } from "@/lib/services/walletService";
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
