import "server-only";
import { db } from "@/lib/db";
import type { OrderStatus } from "@prisma/client";

// A purchase only counts toward review eligibility once it's actually
// been paid for — not while still pending payment, and not if it was
// cancelled or refunded.
const PURCHASE_VERIFIED_STATUSES: OrderStatus[] = [
  "PAID",
  "PROCESSING",
  "PURCHASED",
  "SUPPLIER_SHIPPED",
  "RECEIVED_AT_WAREHOUSE",
  "READY_FOR_SHIPPING",
  "SHIPPED",
  "IN_TRANSIT",
  "CUSTOMS",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

/** Has this user actually paid for this product at least once? */
export async function hasVerifiedPurchase(userId: string, productId: string): Promise<boolean> {
  const count = await db.orderItem.count({
    where: {
      productId,
      order: { userId, status: { in: PURCHASE_VERIFIED_STATUSES } },
    },
  });
  return count > 0;
}

/**
 * Recomputes a product's avgRating/reviewCount from its approved reviews.
 * Call this any time a review is created, approved/hidden, or deleted —
 * it's the only place those two denormalized fields should ever change.
 */
export async function recalculateProductRating(productId: string): Promise<void> {
  const agg = await db.review.aggregate({
    where: { productId, isApproved: true },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await db.product.update({
    where: { id: productId },
    data: {
      avgRating: agg._avg.rating ?? 0,
      reviewCount: agg._count._all,
    },
  });
}
