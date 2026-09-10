"use server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function addToCartAction(formData: FormData) {
  const user = await getCurrentUser();
  const productId = String(formData.get("productId"));
  const variantId = formData.get("variantId") ? String(formData.get("variantId")) : null;
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const redirectTo = String(formData.get("redirectTo") ?? "/cart");

  if (!user) {
    redirect(`/login?next=/product/${formData.get("slug")}`);
  }

  const product = await db.product.findUniqueOrThrow({ where: { id: productId } });
  if (product.sourcePlatform === "AFFILIATE") {
    // Affiliate products are never ATG orders — they route to the
    // partner's own checkout via ProductPurchasePanel's "Buy from
    // Partner" link, which doesn't post to this action at all. This is
    // a defense-in-depth guard against a stale/tampered form.
    redirect(`/product/${formData.get("slug")}`);
  }

  const cart = await db.cart.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const existing = await db.cartItem.findFirst({
    where: { cartId: cart.id, productId, variantId: variantId ?? undefined },
  });

  if (existing) {
    await db.cartItem.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + quantity },
    });
  } else {
    await db.cartItem.create({
      data: { cartId: cart.id, productId, variantId, quantity },
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
      destination: profile?.country ?? "NIGERIA",
      notes: `Requested from product page: ${productName}`,
    },
  });

  revalidatePath("/account/sourcing");
  redirect("/account/sourcing?submitted=1");
}
