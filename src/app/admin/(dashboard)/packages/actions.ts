"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import type { PackageStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function updatePackageStatusAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_WAREHOUSE);
  const packageId = String(formData.get("packageId"));
  const status = String(formData.get("status")) as PackageStatus;

  await db.package.update({ where: { id: packageId }, data: { status } });
  await db.trackingEvent.create({
    data: { packageId, status, description: `Package status updated to ${status.replaceAll("_", " ")}.` },
  });

  revalidatePath("/admin/packages");
}
