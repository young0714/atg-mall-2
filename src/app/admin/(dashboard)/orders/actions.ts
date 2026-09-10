"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { orderService } from "@/lib/services/orderService";
import type { OrderStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function updateOrderStatusAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_ORDERS);
  const orderId = String(formData.get("orderId"));
  const status = String(formData.get("status")) as OrderStatus;

  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  await orderService.advanceStatus(orderId, status);

  await db.auditLog.create({
    data: {
      actorId: staff.id,
      action: "ORDER_STATUS_CHANGED",
      entityType: "Order",
      entityId: orderId,
      summary: `${order.orderNumber}: ${order.status} → ${status}`,
    },
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
}
