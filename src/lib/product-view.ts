import "server-only";
import type { Product, ProductImage } from "@prisma/client";
import type { Destination } from "@/lib/destination";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
import type { ProductCardData } from "@/components/shop/ProductCard";
import { getActiveSale } from "@/lib/services/saleService";
import { priceWithSale } from "@/lib/salePricing";

type ProductWithImages = Product & { images: ProductImage[] };

/**
 * Builds the display-ready card data for a product grid — just the
 * product's own price, converted to the visitor's display currency.
 * Landed cost (which adds shipping + handling fee) is shown at checkout
 * instead, once the customer has picked a shipping method.
 */
export async function toProductCard(product: ProductWithImages, destination: Destination): Promise<ProductCardData> {
  // While a sale is live, an eligible product shows its sale price, with the normal price crossed out beside it.
  const price = priceWithSale(product.basePriceMinor, product, await getActiveSale());
  const priceMinor = currencyConversionService.convert(price.saleMinor, product.baseCurrency, destination.currency);
  const listPriceMinor = price.onSale
    ? currencyConversionService.convert(price.listMinor, product.baseCurrency, destination.currency)
    : undefined;

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
    listPriceMinor,
    salePercent: price.onSale ? price.percentOff : undefined,
    currency: destination.currency,
  };
}
