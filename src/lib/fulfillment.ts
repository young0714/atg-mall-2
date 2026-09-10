import type { SourcePlatform, FulfillmentType } from "@prisma/client";

/**
 * Maps a product's source to how it must be fulfilled. Snapshotted onto
 * OrderItem at order-creation time (see orderService) so the fulfillment
 * path stays accurate even if the product's own source/seller changes
 * later. AFFILIATE is never passed here in practice — affiliate products
 * are blocked from cart/checkout entirely (see ProductPurchasePanel and
 * the addToCartAction/orderService guards) — but is included for
 * completeness and defense-in-depth.
 */
export function fulfillmentTypeForSourcePlatform(
  sourcePlatform: SourcePlatform,
  sellerId: string | null,
): FulfillmentType {
  if (sourcePlatform === "AFFILIATE") return "AFFILIATE";
  if (sourcePlatform === "SELLER" || sellerId) return "VENDOR";
  if (sourcePlatform === "ATG") return "ATG_INVENTORY";
  if (sourcePlatform === "ALIBABA") return "INTERNATIONAL_SOURCING";
  // MOCK_1688 / MOCK_TAOBAO
  return "CHINA_SOURCING";
}
