"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { sourcingRequestSchema } from "@/lib/validation/schemas";
import { saveUploadedFile } from "@/lib/storage";
import { redirect } from "next/navigation";

export async function submitSourcingRequestAction(formData: FormData) {
  const user = await requireUser();

  let uploadedImageUrl: string | null = null;
  const file = formData.get("productImageFile");
  if (file instanceof File && file.size > 0) {
    try {
      uploadedImageUrl = await saveUploadedFile(file, "sourcing");
    } catch (err) {
      redirect(`/source-a-product?error=${encodeURIComponent((err as Error).message)}`);
    }
  }

  const raw = Object.fromEntries(formData) as Record<string, string>;
  // The form collects a whole-dollar target price for readability; convert
  // to minor units (cents) before validation/storage.
  if (raw.targetPriceMinor) {
    raw.targetPriceMinor = String(Math.round(Number(raw.targetPriceMinor) * 100));
  }
  const parsed = sourcingRequestSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/source-a-product?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid request")}`);
  }

  const data = parsed.data;

  await db.sourcingRequest.create({
    data: {
      userId: user.id,
      productName: data.productName,
      productImageUrl: uploadedImageUrl ?? (data.productImageUrl || undefined),
      productUrl: data.productUrl || undefined,
      quantity: data.quantity,
      targetPriceMinor: data.targetPriceMinor,
      targetCurrency: "USD",
      destination: data.destination,
      notes: data.notes || undefined,
    },
  });

  redirect("/account/sourcing?submitted=1");
}
