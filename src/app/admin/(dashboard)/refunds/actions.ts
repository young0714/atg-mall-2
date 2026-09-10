"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { walletService } from "@/lib/services/walletService";
import { revalidatePath } from "next/cache";

export async function issueRefundAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_REFUNDS);
  const orderId = String(formData.get("orderId"));

  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });

  await walletService.credit({
    userId: order.userId,
    amountMinor: order.totalMinor,
    type: "REFUND",
    description: `Refund for order ${order.orderNumber}`,
    referenceType: "ORDER",
    referenceId: order.id,
  });

  await db.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
  await db.payment.updateMany({ where: { orderId }, data: { status: "REFUNDED" } });
  await db.trackingEvent.create({
    data: { orderId, status: "REFUNDED", description: `Order refunded to ATG Wallet by ${staff.fullName}.` },
  });
  await db.auditLog.create({
    data: { actorId: staff.id, action: "ORDER_REFUNDED", entityType: "Order", entityId: orderId, summary: `Refunded ${order.orderNumber}` },
  });

  revalidatePath("/admin/refunds");
  revalidatePath("/admin/orders");
}
