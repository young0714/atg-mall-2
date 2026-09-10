"use server";

import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { walletService } from "@/lib/services/walletService";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function adjustWalletAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_WALLETS);
  const userId = String(formData.get("userId"));
  const amountMinor = Math.round(Number(formData.get("amount") || 0) * 100);
  const reason = String(formData.get("reason") || "Manual adjustment by finance team");

  if (!amountMinor) redirect("/admin/wallets?error=Enter+a+non-zero+amount");

  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const profile = await db.customerProfile.findUnique({ where: { userId } });
  await walletService.getOrCreateWallet(userId, profile?.preferredCurrency ?? "NGN");

  if (amountMinor > 0) {
    await walletService.credit({ userId, amountMinor, type: "ADJUSTMENT", description: reason });
  } else {
    await walletService.debit({ userId, amountMinor: Math.abs(amountMinor), description: reason, type: "ADJUSTMENT" });
  }

  await db.auditLog.create({
    data: {
      actorId: staff.id,
      action: "WALLET_ADJUSTED",
      entityType: "Wallet",
      entityId: userId,
      summary: `${amountMinor > 0 ? "Credited" : "Debited"} ${user.fullName}'s wallet by ${Math.abs(amountMinor) / 100} (${reason})`,
    },
  });

  revalidatePath("/admin/wallets");
  redirect("/admin/wallets?adjusted=1");
}
