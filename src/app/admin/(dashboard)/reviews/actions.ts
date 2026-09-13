"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { recalculateProductRating } from "@/lib/services/reviewService";
import { reviewSchema } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateReviewAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_REVIEWS);
  const id = String(formData.get("reviewId"));

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/reviews?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid review")}`);
  }
  const data = parsed.data!;

  const review = await db.review.update({
    where: { id },
    data: { rating: data.rating, title: data.title || null, body: data.body },
  });
  await recalculateProductRating(review.productId);
  revalidatePath("/admin/reviews");
  revalidatePath("/product/[slug]", "page");
}

export async function toggleReviewApprovalAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_REVIEWS);
  const id = String(formData.get("reviewId"));
  const review = await db.review.findUniqueOrThrow({ where: { id } });
  await db.review.update({ where: { id }, data: { isApproved: !review.isApproved } });
  await recalculateProductRating(review.productId);
  revalidatePath("/admin/reviews");
  revalidatePath("/product/[slug]", "page");
}

export async function deleteReviewAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_REVIEWS);
  const id = String(formData.get("reviewId"));
  const review = await db.review.delete({ where: { id } });
  await recalculateProductRating(review.productId);
  revalidatePath("/admin/reviews");
  revalidatePath("/product/[slug]", "page");
}
