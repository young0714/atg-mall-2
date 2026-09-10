"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { CouponType } from "@prisma/client";

export async function createCouponAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_COUPONS);
  const code = String(formData.get("code") || "").trim().toUpperCase();
  if (!code) redirect("/admin/coupons?error=Code+is+required");

  await db.coupon.create({
    data: {
      code,
      type: formData.get("type") as CouponType,
      value: Number(formData.get("value") || 0),
      usageLimit: formData.get("usageLimit") ? Number(formData.get("usageLimit")) : undefined,
    },
  });
  revalidatePath("/admin/coupons");
  redirect("/admin/coupons?created=1");
}

export async function toggleCouponActiveAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_COUPONS);
  const id = String(formData.get("couponId"));
  const coupon = await db.coupon.findUniqueOrThrow({ where: { id } });
  await db.coupon.update({ where: { id }, data: { isActive: !coupon.isActive } });
  revalidatePath("/admin/coupons");
}
