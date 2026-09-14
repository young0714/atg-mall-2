"use server";

import { forgotPasswordSchema } from "@/lib/validation/schemas";
import { createMagicLinkToken } from "@/lib/auth/auth-service";
import { db } from "@/lib/db";
import { notificationService, NOTIFICATION_EVENTS } from "@/lib/services/notificationService";
import { redirect } from "next/navigation";

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/forgot-password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Enter a valid email address")}`);
  }

  // Always redirect to the same "check your email" message whether or not
  // the account exists — revealing which emails are registered is a real
  // enumeration risk for a customer-facing reset flow.
  const user = await db.user.findUnique({ where: { email: parsed.data.email } });

  if (user && user.isActive) {
    const rawToken = await createMagicLinkToken(user.id);
    if (rawToken) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const linkUrl = `${appUrl}/auth/continue?token=${rawToken}&next=${encodeURIComponent("/account/set-password")}`;
      await notificationService.notify({
        userId: user.id,
        userContact: user.email,
        event: NOTIFICATION_EVENTS.PASSWORD_RESET_REQUESTED,
        title: "Reset your ATG Mall password",
        body: `We received a request to reset your ATG Mall password. Click this link to sign in and set a new one: ${linkUrl}\n\nIf you didn't request this, you can safely ignore this email.`,
        channels: ["EMAIL"],
      });
    }
  }

  redirect("/forgot-password?sent=1");
}
