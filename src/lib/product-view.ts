import "server-only";
import type { Product, ProductImage } from "@prisma/client";
import type { Destination } from "@/lib/destination";
import { pricingService } from "@/lib/services/pricingService";
import { currencyConversionService } from "@/lib/services/currencyConversionService";
import type { ProductCardData } from "@/components/shop/ProductCard";

type ProductWithImages = Product & { images: ProductImage[] };

/** Builds the display-ready card data (with a converted landed-cost estimate) for a product grid. */
export async function toProductCard(product: ProductWithImages, destination: Destination): Promise<ProductCardData> {
  // Affiliate products are sold and priced entirely by the partner — ATG
  // doesn't arrange shipping or charge a sourcing fee on them, so showing
  // an "estimated landed cost" (which adds both) would misrepresent what
  // the customer actually pays. Just convert the listed price for display.
  const priceMinor =
    product.sourcePlatform === "AFFILIATE"
      ? currencyConversionService.convert(product.basePriceMinor, product.baseCurrency, destination.currency)
      : (
          await pricingService.estimateLandedCost({
            productCostMinor: product.basePriceMinor,
            productCostCurrency: product.baseCurrency,
            destination: destination.country,
            destinationCurrency: destination.currency,
          })
        ).totalMinor;

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
    estimatedLandedMinor: priceMinor,
    currency: destination.currency,
  };
}
