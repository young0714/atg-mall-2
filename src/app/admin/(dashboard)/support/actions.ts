"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { revalidatePath } from "next/cache";

export async function replyToTicketAction(formData: FormData) {
  const staff = await requirePermission(PERMISSIONS.MANAGE_SUPPORT);
  const ticketId = String(formData.get("ticketId"));
  const body = String(formData.get("body") || "").trim();
  if (!body) return;

  await db.supportMessage.create({ data: { ticketId, authorId: staff.id, body } });
  await db.supportTicket.update({ where: { id: ticketId }, data: { status: "IN_PROGRESS", assigneeId: staff.id } });

  revalidatePath("/admin/support");
}

export async function resolveTicketAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_SUPPORT);
  const ticketId = String(formData.get("ticketId"));
  await db.supportTicket.update({ where: { id: ticketId }, data: { status: "RESOLVED" } });
  revalidatePath("/admin/support");
}
