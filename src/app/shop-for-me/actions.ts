"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { shopForMeSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";

export async function submitShopForMeAction(formData: FormData) {
  const user = await requireUser();
  const raw = Object.fromEntries(formData);
  const parsed = shopForMeSchema.safeParse(raw);

  if (!parsed.success) {
    redirect(`/shop-for-me?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid request")}`);
  }

  const data = parsed.data;

  await db.shopForMeRequest.create({
    data: {
      userId: user.id,
      productUrl: data.productUrl,
      productName: data.productName,
      productImageUrl: data.productImageUrl || undefined,
      quantity: data.quantity,
      size: data.size || undefined,
      color: data.color || undefined,
      destination: data.destination,
      instructions: data.instructions || undefined,
    },
  });

  redirect("/account/shop-for-me?submitted=1");
}
