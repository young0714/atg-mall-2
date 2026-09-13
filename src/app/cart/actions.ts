"use server";

import { db } from "@/lib/db";
import { getCartId } from "@/lib/services/cartService";
import { revalidatePath } from "next/cache";

export async function updateCartItemAction(formData: FormData) {
  const cartId = await getCartId();
  if (!cartId) return;
  const itemId = String(formData.get("itemId"));
  const quantity = Math.max(1, Number(formData.get("quantity")));

  const item = await db.cartItem.findFirst({ where: { id: itemId, cartId } });
  if (!item) return;

  await db.cartItem.update({ where: { id: itemId }, data: { quantity } });
  revalidatePath("/cart");
}

export async function removeCartItemAction(formData: FormData) {
  const cartId = await getCartId();
  if (!cartId) return;
  const itemId = String(formData.get("itemId"));

  const item = await db.cartItem.findFirst({ where: { id: itemId, cartId } });
  if (!item) return;

  await db.cartItem.delete({ where: { id: itemId } });
  revalidatePath("/cart");
}
