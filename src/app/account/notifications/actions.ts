"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { revalidatePath } from "next/cache";

export async function markAllNotificationsReadAction() {
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/account/notifications");
}

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireUser();
  const notificationId = String(formData.get("notificationId"));
  await db.notification.updateMany({ where: { id: notificationId, userId: user.id }, data: { isRead: true } });
  revalidatePath("/account/notifications");
}
