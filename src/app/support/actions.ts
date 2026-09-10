"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/current-user";
import { redirect } from "next/navigation";

export async function createSupportTicketAction(formData: FormData) {
  const user = await requireUser();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (!subject || !message) {
    redirect("/support?error=Please+fill+in+both+fields");
  }

  const ticket = await db.supportTicket.create({
    data: {
      ticketNumber: `TCK-${Date.now().toString(36).toUpperCase()}`,
      customerId: user.id,
      subject,
      messages: { create: [{ authorId: user.id, body: message }] },
    },
  });

  redirect(`/support?created=${ticket.ticketNumber}`);
}
