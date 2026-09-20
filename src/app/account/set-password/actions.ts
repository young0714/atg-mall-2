"use server";

import { requireUser } from "@/lib/auth/current-user";
import { hashPassword } from "@/lib/auth/password";
import { setPasswordSchema } from "@/lib/validation/schemas";
import { db } from "@/lib/db";
import { notificationService, NOTIFICATION_EVENTS } from "@/lib/services/notificationService";
import { renderEmailLayout } from "@/lib/email/emailLayout";
import { redirect } from "next/navigation";

export async function setPasswordAction(formData: FormData) {
  const user = await requireUser();
  const parsed = setPasswordSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/account/set-password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.user.update({ where: { id: user.id }, data: { passwordHash, isGuest: false } });

  await notificationService.notify({
    userId: user.id,
    userContact: user.email,
    event: NOTIFICATION_EVENTS.PASSWORD_CHANGED,
    title: "Your ATG Mall password was changed",
    body: "Your ATG Mall password was just changed. If this wasn't you, contact support immediately.",
    html: await renderEmailLayout({
      eyebrow: "PASSWORD CHANGED",
      heading: "Your password was changed",
      bodyHtml: "Your ATG Mall password was just changed successfully.<br><br>If this wasn't you, contact support immediately so we can secure your account.",
      includeTrending: false,
    }),
    channels: ["IN_APP", "EMAIL"],
  });

  redirect("/account?passwordSet=1");
}
