import "server-only";
import { db } from "@/lib/db";

/**
 * Records the seller-side Commission rows for an order once it's PAID.
 * Safe to call more than once for the same order (upserts on orderItemRef,
 * backed by a unique constraint) — every PAID transition site calls this,
 * including retries and the Flutterwave webhook/callback pair.
 */
export const commissionService = {
  async createForOrder(orderId: string): Promise<void> {
    const items = await db.orderItem.findMany({
      where: { orderId, sellerIdSnapshot: { not: null } },
    });
    if (items.length === 0) return;

    const sellerIds = [...new Set(items.map((item) => item.sellerIdSnapshot!))];
    const sellers = await db.seller.findMany({ where: { id: { in: sellerIds } } });
    const commissionPctBySeller = new Map(sellers.map((s) => [s.id, s.commissionPct]));

    for (const item of items) {
      const sellerId = item.sellerIdSnapshot!;
      const commissionPct = commissionPctBySeller.get(sellerId) ?? 0;
      const amountMinor = Math.round(item.unitPriceMinor * item.quantity * (commissionPct / 100));
      if (amountMinor <= 0) continue;

      await db.commission.upsert({
        where: { orderItemRef: item.id },
        update: {},
        create: {
          sellerId,
          orderItemRef: item.id,
          amountMinor,
          currency: item.currency,
        },
      });
    }
  },
};
