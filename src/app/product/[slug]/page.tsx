import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Image from "next/image";
import type { Metadata } from "next";
import { getDestination } from "@/lib/destination";
import { pricingService } from "@/lib/services/pricingService";
import { sourcePlatformLabel } from "@/lib/sourcePlatform";
import { StarRating } from "@/components/shop/StarRating";
import { Badge } from "@/components/ui/Badge";
import { ProductPurchasePanel } from "@/components/shop/ProductPurchasePanel";
import { Container, Section } from "@/components/ui/Section";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await db.product.findUnique({ where: { slug: params.slug } });
  if (!product) return {};
  return {
    title: product.name,
    description: product.description.slice(0, 155),
    openGraph: { title: product.name, description: product.description.slice(0, 155) },
  };
}

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const destination = getDestination();

  const product = await db.product.findUnique({
    where: { slug: params.slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: true,
      supplier: true,
      category: true,
      reviews: { where: { isApproved: true }, orderBy: { createdAt: "desc" }, take: 5, include: { user: true } },
    },
  });

  if (!product || !product.isActive) notFound();

  const breakdown = pricingService.estimateLandedCost({
    productCostMinor: product.basePriceMinor,
    productCostCurrency: product.baseCurrency,
    destination: destination.country,
    destinationCurrency: destination.currency,
  });

  return (
    <Section className="!py-8">
      <Container>
        <nav className="mb-6 text-xs text-navy-400">
          <Link href="/shop" className="hover:text-navy-700">Shop</Link>
          {" / "}
          <Link href={`/shop?category=${product.category.slug}`} className="hover:text-navy-700">{product.category.name}</Link>
          {" / "}
          <span className="text-navy-600">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="relative aspect-square w-full overflow-hidden rounded-xl2 border border-navy-100 bg-sand-50">
              {product.images[0] && (
                <Image src={product.images[0].url} alt={product.name} fill sizes="600px" className="object-cover" priority />
              )}
            </div>
            {product.images.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-3">
                {product.images.slice(1, 5).map((img) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-lg border border-navy-100">
                    <Image src={img.url} alt={product.name} fill sizes="150px" className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              {product.isFeatured && <Badge tone="gold">Trending</Badge>}
              {product.isWholesale && <Badge tone="blue">Wholesale</Badge>}
              <Badge tone="neutral">{sourcePlatformLabel(product.sourcePlatform)}</Badge>
            </div>
            <h1 className="text-2xl font-display font-bold text-navy-900 sm:text-3xl">{product.name}</h1>
            <div className="mt-2">
              <StarRating rating={product.avgRating} reviewCount={product.reviewCount} />
            </div>

            {product.supplier && (
              <div className="mt-4 rounded-xl2 border border-navy-100 bg-sand-50 p-3 text-sm">
                <p className="font-medium text-navy-800">{product.supplier.name}</p>
                <p className="text-xs text-navy-500">
                  {product.supplier.location} · {product.supplier.verified ? "Verified supplier" : "Unverified — proceed with standard inspection"}
                </p>
              </div>
            )}

            <p className="mt-4 text-sm leading-relaxed text-navy-600">{product.description}</p>

            <div className="mt-6 border-t border-navy-100 pt-6">
              <ProductPurchasePanel
                productId={product.id}
                slug={product.slug}
                variants={product.variants.map((v) => ({ id: v.id, name: v.name, priceDeltaMinor: v.priceDeltaMinor }))}
                moq={product.moq}
                baseCurrency={product.baseCurrency}
                basePriceMinor={product.basePriceMinor}
                breakdown={breakdown}
                imageUrl={product.images[0]?.url ?? null}
                productName={product.name}
              />
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-navy-100 pt-6 text-sm">
              <div><dt className="text-navy-400">Destination</dt><dd className="font-medium text-navy-800">{destination.label}</dd></div>
              <div><dt className="text-navy-400">Est. weight</dt><dd className="font-medium text-navy-800">{(product.weightGrams / 1000).toFixed(2)} kg / unit</dd></div>
              <div><dt className="text-navy-400">MOQ</dt><dd className="font-medium text-navy-800">{product.moq} unit{product.moq > 1 ? "s" : ""}</dd></div>
              <div><dt className="text-navy-400">Est. delivery</dt><dd className="font-medium text-navy-800">14–30 days after purchase</dd></div>
            </dl>
          </div>
        </div>

        {product.reviews.length > 0 && (
          <div className="mt-16 max-w-2xl">
            <h2 className="text-xl font-bold text-navy-900">Customer Reviews</h2>
            <div className="mt-4 space-y-4">
              {product.reviews.map((r) => (
                <div key={r.id} className="rounded-xl2 border border-navy-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-navy-800">{r.user.fullName}</p>
                    <span className="text-xs text-navy-400">{formatDate(r.createdAt)}</span>
                  </div>
                  <StarRating rating={r.rating} />
                  {r.title && <p className="mt-1 text-sm font-medium text-navy-800">{r.title}</p>}
                  <p className="mt-1 text-sm text-navy-500">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Container>
    </Section>
  );
}
