import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getDestination } from "@/lib/destination";
import { getCurrentUser } from "@/lib/auth/current-user";
import { hasVerifiedPurchase } from "@/lib/services/reviewService";
import { customerFacingSourceLabel } from "@/lib/sourcePlatform";
import { StarRating } from "@/components/shop/StarRating";
import { RatingInput } from "@/components/shop/RatingInput";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { ProductPurchasePanel } from "@/components/shop/ProductPurchasePanel";
import { ProductImageGallery } from "@/components/shop/ProductImageGallery";
import { Container, Section } from "@/components/ui/Section";
import { formatDate } from "@/lib/utils";
import { createReviewAction } from "./actions";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/SubmitButton";

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const product = await db.product.findUnique({
    where: { slug: params.slug },
    include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } },
  });
  if (!product) return {};
  const description = product.description.slice(0, 155);
  const image = product.images[0]?.url;
  return {
    title: product.name,
    description,
    openGraph: { title: product.name, description, images: image ? [image] : undefined },
    twitter: { card: "summary_large_image", title: product.name, description, images: image ? [image] : undefined },
  };
}

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { reviewError?: string; reviewSubmitted?: string };
}) {
  const [destination, user] = await Promise.all([getDestination(), getCurrentUser()]);

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

  const [verifiedPurchase, existingReview] = user
    ? await Promise.all([
        hasVerifiedPurchase(user.id, product.id),
        db.review.findUnique({ where: { productId_userId: { productId: product.id, userId: user.id } } }),
      ])
    : [false, null];

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

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <ProductImageGallery images={product.images} productName={product.name} />
            {product.videoUrl && (
              // eslint-disable-next-line jsx-a11y/media-has-caption -- supplier/admin-provided product video, no caption track available
              <video src={product.videoUrl} controls playsInline className="mt-4 w-full rounded-xl2 border border-navy-100" />
            )}
          </div>

          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              {product.isFeatured && <Badge tone="gold">Trending</Badge>}
              {product.isWholesale && <Badge tone="blue">Wholesale</Badge>}
              <Badge tone="neutral">{customerFacingSourceLabel(product.sourcePlatform)}</Badge>
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

            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-navy-600">{product.description}</p>

            <div className="mt-6 border-t border-navy-100 pt-6">
              <ProductPurchasePanel
                productId={product.id}
                slug={product.slug}
                variants={product.variants.map((v) => ({ id: v.id, name: v.name }))}
                moq={product.moq}
                baseCurrency={product.baseCurrency}
                basePriceMinor={product.basePriceMinor}
                imageUrl={product.images[0]?.url ?? null}
                productName={product.name}
                affiliateUrl={product.sourcePlatform === "AFFILIATE" ? product.affiliateUrl : null}
                affiliateProvider={product.affiliateProvider}
              />
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-3 border-t border-navy-100 pt-6 text-sm">
              <div><dt className="text-navy-400">Destination</dt><dd className="font-medium text-navy-800">{destination.name}</dd></div>
              <div><dt className="text-navy-400">Est. weight</dt><dd className="font-medium text-navy-800">{(product.weightGrams / 1000).toFixed(2)} kg / unit</dd></div>
              <div><dt className="text-navy-400">MOQ</dt><dd className="font-medium text-navy-800">{product.moq} unit{product.moq > 1 ? "s" : ""}</dd></div>
              <div><dt className="text-navy-400">Est. delivery</dt><dd className="font-medium text-navy-800">14–30 days after purchase</dd></div>
            </dl>
          </div>
        </div>

        <div className="mt-16 max-w-2xl">
          <h2 className="text-xl font-bold text-navy-900">Customer Reviews</h2>

          {product.reviews.length > 0 ? (
            <div className="mt-4 space-y-4">
              {product.reviews.map((r) => (
                <div key={r.id} className="rounded-xl2 border border-navy-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-navy-800">{r.user.fullName}</p>
                    <span className="text-xs text-navy-400">{formatDate(r.createdAt)}</span>
                  </div>
                  <StarRating rating={r.rating} />
                  {r.title && <p className="mt-1 text-sm font-medium text-navy-800">{r.title}</p>}
                  <p className="mt-1 whitespace-pre-line text-sm text-navy-500">{r.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-navy-400">No reviews yet.</p>
          )}

          <div className="mt-8 border-t border-navy-100 pt-6">
            {searchParams.reviewSubmitted && (
              <div className="mb-4 rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
                Thanks — your review has been posted.
              </div>
            )}
            {searchParams.reviewError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.reviewError}</div>
            )}

            {!user && (
              <p className="text-sm text-navy-500">
                <Link href={`/login?next=/product/${product.slug}`} className="font-medium text-atgblue-600">
                  Sign in
                </Link>{" "}
                after your order arrives to write a review.
              </p>
            )}

            {user && existingReview && (
              <p className="text-sm text-navy-500">You&apos;ve already reviewed this product — thanks!</p>
            )}

            {user && !existingReview && !verifiedPurchase && (
              <p className="text-sm text-navy-500">Only customers who&apos;ve purchased this product can leave a review.</p>
            )}

            {user && !existingReview && verifiedPurchase && (
              <form action={createReviewAction} className="space-y-4">
                <input type="hidden" name="productId" value={product.id} />
                <input type="hidden" name="slug" value={product.slug} />
                <h3 className="font-semibold text-navy-900">Write a review</h3>
                <Field label="Your rating" htmlFor="rating-star-5" required>
                  <RatingInput />
                </Field>
                <Field label="Title" htmlFor="title" hint="Optional">
                  <Input id="title" name="title" maxLength={100} />
                </Field>
                <Field label="Your review" htmlFor="body" required>
                  <Textarea id="body" name="body" rows={4} minLength={10} maxLength={2000} required />
                </Field>
                <SubmitButton className="btn-primary">Submit Review</SubmitButton>
              </form>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
