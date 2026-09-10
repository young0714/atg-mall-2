"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import type { SellerStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function updateSellerStatusAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_SELLERS);
  const sellerId = String(formData.get("sellerId"));
  const status = String(formData.get("status")) as SellerStatus;
  await db.seller.update({ where: { id: sellerId }, data: { status } });
  revalidatePath("/admin/sellers");
}
