"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function createSupplierAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_SUPPLIERS);
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/admin/suppliers?error=Name+is+required");

  await db.supplier.create({
    data: {
      name,
      platform: (formData.get("platform") as never) ?? "MOCK_1688",
      location: String(formData.get("location") ?? "") || undefined,
      contactName: String(formData.get("contactName") ?? "") || undefined,
      contactPhone: String(formData.get("contactPhone") ?? "") || undefined,
      verified: formData.get("verified") === "true",
    },
  });
  revalidatePath("/admin/suppliers");
  redirect("/admin/suppliers?created=1");
}

export async function toggleSupplierVerifiedAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_SUPPLIERS);
  const id = String(formData.get("supplierId"));
  const supplier = await db.supplier.findUniqueOrThrow({ where: { id } });
  await db.supplier.update({ where: { id }, data: { verified: !supplier.verified } });
  revalidatePath("/admin/suppliers");
}
