"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { walletService } from "@/lib/services/walletService";
import { commissionService } from "@/lib/services/commissionService";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
import { fulfillmentTypeForSourcePlatform } from "@/lib/fulfillment";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

/**
 * Post-purchase upsell, Wallet-only (see account/orders/page.tsx comment):
 * an instant add-on to an already-placed order, charged immediately from
 * the customer's Wallet — no repayment step, since Wallet is the one
 * payment method that's genuinely synchronous end to end here. Adds a
 * second OrderItem to the SAME order (rides along at no extra shipping
 * cost, as advertised) rather than creating a whole new order.
 */
export async function addWalletUpsellAction(formData: FormData) {
  const user = await requireUser();
  const orderId = String(formData.get("orderId"));
  const productId = String(formData.get("productId"));

  const order = await db.order.findFirst({
    where: { id: orderId, userId: user.id },
    include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order) {
    redirect("/account/orders?error=" + encodeURIComponent("Order not found."));
  }

  // The button is only ever shown for a Wallet-paid order, but a request
  // here is still just form input — re-check server-side rather than trust
  // that.
  const wasWalletPayment = order!.payments[0]?.method === "WALLET" && order!.payments[0]?.status === "SUCCESSFUL";
  if (!wasWalletPayment) {
    redirect("/account/orders?error=" + encodeURIComponent("This order wasn't paid by Wallet."));
  }

  const product = await db.product.findFirst({
    where: { id: productId, isActive: true },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  if (!product) {
    redirect("/account/orders?error=" + encodeURIComponent("That item is no longer available."));
  }

  const unitPriceMinor = currencyConversionService.convert(product!.basePriceMinor, product!.baseCurrency, order!.currency);

  const debit = await walletService.debit({
    userId: user.id,
    amountMinor: unitPriceMinor,
    currency: order!.currency,
    description: `Add-on: ${product!.name} (order ${order!.orderNumber})`,
    referenceType: "ORDER",
    referenceId: order!.id,
  });
  if (!debit.success) {
    redirect(`/account/orders/${order!.id}?error=${encodeURIComponent(debit.reason ?? "Insufficient wallet balance. Please top up your wallet.")}`);
  }

  await db.$transaction([
    db.orderItem.create({
      data: {
        orderId: order!.id,
        productId: product!.id,
        nameSnapshot: product!.name,
        imageSnapshot: product!.images[0]?.url ?? null,
        quantity: 1,
        unitPriceMinor,
        currency: order!.currency,
        fulfillmentType: fulfillmentTypeForSourcePlatform(product!.sourcePlatform, product!.sellerId),
        // Same cost-basis convention as orderService.createOrderFromCart:
        // the catalog price itself, in the product's own base currency.
        costBasisMinor: product!.basePriceMinor,
        costCurrency: product!.baseCurrency,
        sourcePlatformSnapshot: product!.sourcePlatform,
        sellerIdSnapshot: product!.sellerId,
      },
    }),
    db.order.update({
      where: { id: order!.id },
      data: { totalMinor: { increment: unitPriceMinor }, subtotalMinor: { increment: unitPriceMinor } },
    }),
    db.trackingEvent.create({
      data: { orderId: order!.id, status: order!.status, description: `Added ${product!.name} to the order (instant Wallet add-on).` },
    }),
  ]);

  // Same idempotent upsert-by-orderItemRef as every other PAID-transition
  // site — only creates a row for the new item, leaves existing ones alone.
  await commissionService.createForOrder(order!.id);

  revalidatePath("/account/orders");
  revalidatePath(`/account/orders/${order!.id}`);
  redirect("/account/orders?added=1");
}
