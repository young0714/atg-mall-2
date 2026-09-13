"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOrCreateCartId } from "@/lib/services/cartService";
import { hasVerifiedPurchase, recalculateProductRating } from "@/lib/services/reviewService";
import { reviewSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function addToCartAction(formData: FormData) {
  const productId = String(formData.get("productId"));
  const variantId = formData.get("variantId") ? String(formData.get("variantId")) : null;
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const redirectTo = String(formData.get("redirectTo") ?? "/cart");

  const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
  if (product.sourcePlatform === "AFFILIATE") {
    // Affiliate products are never ATG orders — they route to the
    // partner's own checkout via ProductPurchasePanel's "Buy from
    // Partner" link, which doesn't post to this action at all. This is
    // a defense-in-depth guard against a stale/tampered form.
    redirect(`/product/${formData.get("slug")}`);
  }

  // Adding to cart never requires an account — anonymous visitors get
  // their own cart via a cookie, merged into their real account once
  // they log in, register, or continue as a guest at checkout.
  const cartId = await getOrCreateCartId();

  const existing = await db.cartItem.findFirst({
    where: { cartId, productId, variantId: variantId ?? undefined },
  });

  if (existing) {
    await db.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await db.cartItem.create({
      data: { cartId, productId, variantId, quantity },
    });
  }

  revalidatePath("/cart");
  redirect(redirectTo);
}

export async function requestSourcingForProductAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/product/${formData.get("slug")}`);
  }

  const productName = String(formData.get("productName"));
  const productImageUrl = formData.get("productImageUrl") ? String(formData.get("productImageUrl")) : undefined;
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));

  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });

  await db.sourcingRequest.create({
    data: {
      userId: user.id,
      productName,
      productImageUrl,
      quantity,
      destinationIso: profile?.countryIso ?? "NG",
      notes: `Requested from product page: ${productName}`,
    },
  });

  revalidatePath("/account/sourcing");
  redirect("/account/sourcing?submitted=1");
}

export async function createReviewAction(formData: FormData) {
  const slug = String(formData.get("slug"));
  const productId = String(formData.get("productId"));

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/product/${slug}`);
  }

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/product/${slug}?reviewError=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid review")}`);
  }

  // Verified-purchase only: only customers who've actually paid for this
  // product can review it, and only once each — prevents fake/spam
  // reviews from inflating a product's rating.
  const [verified, existing] = await Promise.all([
    hasVerifiedPurchase(user.id, productId),
    db.review.findUnique({ where: { productId_userId: { productId, userId: user.id } } }),
  ]);

  if (!verified) {
    redirect(`/product/${slug}?reviewError=${encodeURIComponent("Only customers who've purchased this product can leave a review.")}`);
  }
  if (existing) {
    redirect(`/product/${slug}?reviewError=${encodeURIComponent("You've already reviewed this product.")}`);
  }

  const data = parsed.data!;
  await db.review.create({
    data: {
      productId,
      userId: user.id,
      rating: data.rating,
      title: data.title || null,
      body: data.body,
    },
  });
  await recalculateProductRating(productId);

  revalidatePath(`/product/${slug}`);
  redirect(`/product/${slug}?reviewSubmitted=1`);
}
