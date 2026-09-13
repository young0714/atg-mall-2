"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { addressSchema } from "@/lib/validation/schemas";
import { isActiveDestinationIso } from "@/lib/services/destinationCountryService";
import type { Currency } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const VALID_CURRENCIES: Currency[] = ["NGN", "GMD", "USD", "EUR", "GBP", "CNY"];

export async function updateProfileAction(formData: FormData) {
  const user = await requireUser();

  const countryIso = String(formData.get("countryIso") ?? "").trim().toUpperCase();
  if (!(await isActiveDestinationIso(countryIso))) {
    redirect("/account/profile?error=" + encodeURIComponent("Select a valid country."));
  }

  const preferredCurrencyRaw = String(formData.get("preferredCurrency") ?? "");
  if (!VALID_CURRENCIES.includes(preferredCurrencyRaw as Currency)) {
    redirect("/account/profile?error=" + encodeURIComponent("Select a valid currency."));
  }
  const preferredCurrency = preferredCurrencyRaw as Currency;

  await db.user.update({
    where: { id: user.id },
    data: {
      fullName: String(formData.get("fullName") ?? user.fullName),
      phone: String(formData.get("phone") ?? user.phone ?? ""),
      whatsapp: String(formData.get("whatsapp") ?? user.whatsapp ?? ""),
    },
  });

  // `country` used to only be set on `create:` — editing an existing
  // profile's country silently did nothing. Both branches now set it.
  await db.customerProfile.upsert({
    where: { userId: user.id },
    update: {
      countryIso,
      state: String(formData.get("state") ?? ""),
      city: String(formData.get("city") ?? ""),
      preferredCurrency,
    },
    create: {
      userId: user.id,
      countryIso,
      state: String(formData.get("state") ?? ""),
      city: String(formData.get("city") ?? ""),
      preferredCurrency,
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
