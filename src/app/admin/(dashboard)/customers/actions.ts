"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

/**
 * Completes a customer-initiated deletion request (see
 * requestAccountDeletionAction and the comment on User.deletionRequestedAt):
 * scrubs personal info while leaving Order/Payment/Review/WalletTransaction
 * rows in place, still pointing at this same userId, for accounting and
 * anti-fraud record-keeping. The account was already disabled (isActive:
 * false) the moment the customer requested this.
 */
export async function completeAccountDeletionAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_CUSTOMERS);
  const userId = String(formData.get("userId"));

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });

  await db.user.update({
    where: { id: userId },
    data: {
      fullName: "Deleted User",
      email: `deleted-${userId}@deleted.atg-mall.com`,
      phone: null,
      whatsapp: null,
      passwordHash: crypto.randomUUID(),
      bvnVerifiedAt: null,
      bvnVerifiedName: null,
      isActive: false,
      deletionRequestedAt: null,
    },
  });

  await db.auditLog.create({
    data: {
      actorId: staff.id,
      action: "CUSTOMER_DELETION_COMPLETED",
      entityType: "User",
      entityId: userId,
      summary: `Anonymized "${user.fullName}" (${user.email}) per their deletion request`,
    },
  });

  revalidatePath("/admin/customers");
}
