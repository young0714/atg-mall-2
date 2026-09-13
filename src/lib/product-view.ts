import "server-only";
import type { Product, ProductImage } from "@prisma/client";
import type { Destination } from "@/lib/destination";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
import type { ProductCardData } from "@/components/shop/ProductCard";

type ProductWithImages = Product & { images: ProductImage[] };

/**
 * Builds the display-ready card data for a product grid — just the
 * product's own price, converted to the visitor's display currency.
 * Landed cost (which adds shipping + service fee) is shown at checkout
 * instead, once the customer has picked a shipping method.
 */
export async function toProductCard(product: ProductWithImages, destination: Destination): Promise<ProductCardData> {
  const priceMinor = currencyConversionService.convert(product.basePriceMinor, product.baseCurrency, destination.currency);

  return {
    slug: product.slug,
    name: product.name,
    imageUrl: product.images[0]?.url ?? null,
    avgRating: product.avgRating,
    reviewCount: product.reviewCount,
    isWholesale: product.isWholesale,
    isFeatured: product.isFeatured,
    isAffiliate: product.sourcePlatform === "AFFILIATE",
    moq: product.moq,
    priceMinor,
    currency: destination.currency,
  };
}
