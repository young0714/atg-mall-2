"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function toggleReviewApprovalAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_REVIEWS);
  const id = String(formData.get("reviewId"));
  const review = await db.review.findUniqueOrThrow({ where: { id } });
  await db.review.update({ where: { id }, data: { isApproved: !review.isApproved } });
  revalidatePath("/admin/reviews");
}

export async function deleteReviewAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_REVIEWS);
  const id = String(formData.get("reviewId"));
  await db.review.delete({ where: { id } });
  revalidatePath("/admin/reviews");
}
