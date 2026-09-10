"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { warehouseService } from "@/lib/services/warehouseService";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const shippingMethodSchema = z.enum(["AIR_FREIGHT", "SEA_FREIGHT", "COURIER", "LCL", "FCL"]);

export async function requestShipmentAction(formData: FormData) {
  const user = await requireUser();
  const packageIds = formData.getAll("packageIds").map(String);
  const methodParsed = shippingMethodSchema.safeParse(formData.get("shippingMethod"));

  if (packageIds.length === 0 || !methodParsed.success) {
    redirect("/account/ship-package?error=Select+at+least+one+package+and+a+shipping+method");
  }
  const shippingMethod = methodParsed.data!;

  const owned = await db.package.findMany({
    where: { id: { in: packageIds }, userId: user.id },
  });
  if (owned.length !== packageIds.length) {
    redirect("/account/ship-package?error=Invalid+package+selection");
  }

  await db.package.updateMany({
    where: { id: { in: packageIds } },
    data: { shippingMethod },
  });

  await warehouseService.createConsolidation({ userId: user.id, packageIds });

  revalidatePath("/account/packages");
  redirect("/account/ship-package?submitted=1");
}
