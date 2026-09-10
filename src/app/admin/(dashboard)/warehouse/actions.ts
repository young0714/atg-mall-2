"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { warehouseService } from "@/lib/services/warehouseService";
import { warehouseReceiveSchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function receivePackageAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_WAREHOUSE);
  const parsed = warehouseReceiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/warehouse?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }
  const data = parsed.data!;

  const warehouse = await db.warehouse.findFirst({ where: { isActive: true } });
  if (!warehouse) redirect("/admin/warehouse?error=No+active+warehouse+configured");

  const { packageCode } = await warehouseService.receivePackage({
    userId: data.userId,
    orderId: data.orderId || undefined,
    warehouseId: warehouse!.id,
    supplierName: data.supplierName,
    receivedById: staff.id,
    weightGrams: data.weightGrams,
    lengthCm: data.lengthCm,
    widthCm: data.widthCm,
    heightCm: data.heightCm,
    trackingNumberIn: data.trackingNumberIn,
    notes: data.notes,
    destination: data.destination,
  });

  revalidatePath("/admin/packages");
  redirect(`/admin/warehouse?received=${packageCode}`);
}
