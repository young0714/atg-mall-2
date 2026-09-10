"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { addressSchema } from "@/lib/validation/schemas";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();

  await db.user.update({
    where: { id: user.id },
    data: {
      fullName: String(formData.get("fullName") ?? user.fullName),
      phone: String(formData.get("phone") ?? user.phone ?? ""),
      whatsapp: String(formData.get("whatsapp") ?? user.whatsapp ?? ""),
    },
  });

  await db.customerProfile.upsert({
    where: { userId: user.id },
    update: {
      state: String(formData.get("state") ?? ""),
      city: String(formData.get("city") ?? ""),
      preferredCurrency: String(formData.get("preferredCurrency") ?? "NGN") as never,
    },
    create: {
      userId: user.id,
      country: String(formData.get("country") ?? "NIGERIA") as never,
      state: String(formData.get("state") ?? ""),
      city: String(formData.get("city") ?? ""),
      preferredCurrency: String(formData.get("preferredCurrency") ?? "NGN") as never,
    },
  });

  revalidatePath("/account/profile");
  redirect("/account/profile?saved=1");
}

export async function addProfileAddressAction(formData: FormData) {
  const user = await requireUser();
  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/account/profile?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid address")}`);
  }
  const count = await db.address.count({ where: { userId: user.id } });
  await db.address.create({ data: { ...parsed.data!, userId: user.id, isDefault: count === 0 } });
  revalidatePath("/account/profile");
  redirect("/account/profile?saved=1");
}

export async function deleteAddressAction(formData: FormData) {
  const user = await requireUser();
  const addressId = String(formData.get("addressId"));
  await db.address.deleteMany({ where: { id: addressId, userId: user.id } });
  revalidatePath("/account/profile");
}
