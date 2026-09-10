import "server-only";
import type { Product, ProductImage } from "@prisma/client";
import type { Destination } from "@/lib/destination";
import { pricingService } from "@/lib/services/pricingService";
import type { ProductCardData } from "@/components/shop/ProductCard";

type ProductWithImages = Product & { images: ProductImage[] };

/** Builds the display-ready card data (with a converted landed-cost estimate) for a product grid. */
export async function toProductCard(product: ProductWithImages, destination: Destination): Promise<ProductCardData> {
  const breakdown = await pricingService.estimateLandedCost({
    productCostMinor: product.basePriceMinor,
    productCostCurrency: product.baseCurrency,
    destination: destination.country,
    destinationCurrency: destination.currency,
  });

  return {
    slug: product.slug,
    name: product.name,
    imageUrl: product.images[0]?.url ?? null,
    avgRating: product.avgRating,
    reviewCount: product.reviewCount,
    isWholesale: product.isWholesale,
    isFeatured: product.isFeatured,
    moq: product.moq,
    estimatedLandedMinor: breakdown.totalMinor,
    currency: breakdown.currency,
  };
}
