"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { revalidatePath } from "next/cache";

export async function updateCartItemAction(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId"));
  const quantity = Math.max(1, Number(formData.get("quantity")));

  const item = await db.cartItem.findFirst({ where: { id: itemId, cart: { userId: user.id } } });
  if (!item) return;

  await db.cartItem.update({ where: { id: itemId }, data: { quantity } });
  revalidatePath("/cart");
}

export async function removeCartItemAction(formData: FormData) {
  const user = await requireUser();
  const itemId = String(formData.get("itemId"));

  const item = await db.cartItem.findFirst({ where: { id: itemId, cart: { userId: user.id } } });
  if (!item) return;

  await db.cartItem.delete({ where: { id: itemId } });
  revalidatePath("/cart");
}
