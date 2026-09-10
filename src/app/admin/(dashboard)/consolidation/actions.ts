"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { warehouseService } from "@/lib/services/warehouseService";
import { revalidatePath } from "next/cache";

export async function markConsolidationReadyAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_CONSOLIDATION);
  const consolidationId = String(formData.get("consolidationId"));

  const links = await db.consolidationPackage.findMany({ where: { consolidationId } });
  await warehouseService.markReadyToShip(links.map((l) => l.packageId));
  await db.consolidation.update({ where: { id: consolidationId }, data: { status: "CLOSED", closedAt: new Date() } });

  revalidatePath("/admin/consolidation");
  revalidatePath("/admin/packages");
}
