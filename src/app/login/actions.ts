"use server";

import { loginSchema, guestCheckoutSchema } from "@/lib/validation/schemas";
import { authenticateUser, AuthError, provisionGuestUser, createMagicLinkToken } from "@/lib/auth/auth-service";
import { createSession } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/rbac";
import { getDestination, setDestinationCookie, syncDestinationToProfile } from "@/lib/destination";
import { notificationService, NOTIFICATION_EVENTS } from "@/lib/services/notificationService";
import { mergeGuestCartIntoUser } from "@/lib/services/cartService";
import { redirect } from "next/navigation";

// Only allow redirecting back to a same-site relative path — an
// unvalidated "next" would be an open-redirect vector once it's echoed
// back into an emailed magic link.
function safeNext(raw: string): string {
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "";
}

export async function continueAsGuestAction(formData: FormData) {
  const parsed = guestCheckoutSchema.safeParse(Object.fromEntries(formData));
  const next = safeNext(String(formData.get("next") ?? ""));
  const nextSuffix = next ? `&next=${encodeURIComponent(next)}` : "";

  if (!parsed.success) {
    redirect(`/login?guestError=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Enter your name and email")}${nextSuffix}`);
  }

  try {
    const destination = await getDestination();
    const result = await provisionGuestUser({ ...parsed.data, countryIso: destination.isoCode });

    if (result.status === "created") {
      await createSession({
        userId: result.user.id,
        role: result.user.role,
        fullName: result.user.fullName,
        email: result.user.email,
      });
      setDestinationCookie(destination.isoCode);
      await mergeGuestCartIntoUser(result.user.id);

      const rawToken = await createMagicLinkToken(result.user.id);
      if (rawToken) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const linkUrl = `${appUrl}/auth/continue?token=${rawToken}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
        await notificationService.notify({
          userId: result.user.id,
          userContact: result.user.email,
          event: NOTIFICATION_EVENTS.ACCOUNT_ACCESS_LINK,
          title: "Continue as a guest on ATG Mall",
          body: `You're shopping as a guest on ATG Mall. Save this link to access your account and orders later, and set a password whenever you're ready: ${linkUrl}`,
          channels: ["EMAIL"],
        });
      }

      redirect(next || "/account");
    }

    // Existing guest, resuming — never create a session from just an email.
    const rawToken = await createMagicLinkToken(result.user.id);
    if (rawToken) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const linkUrl = `${appUrl}/auth/continue?token=${rawToken}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
      await notificationService.notify({
        userId: result.user.id,
        userContact: result.user.email,
        event: NOTIFICATION_EVENTS.ACCOUNT_ACCESS_LINK,
        title: "Continue on ATG Mall",
        body: `Click this link to continue on ATG Mall: ${linkUrl}`,
        channels: ["EMAIL"],
      });
    }

    redirect(`/login?guestLinkSent=1${nextSuffix}`);
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/login?guestError=${encodeURIComponent(err.message)}${nextSuffix}`);
    }
    throw err;
  }
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const next = String(formData.get("next") ?? "");

  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent("Enter a valid email and password")}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  try {
    const user = await authenticateUser(parsed.data);
    await createSession({ userId: user.id, role: user.role, fullName: user.fullName, email: user.email });
    await syncDestinationToProfile(user.id);
    await mergeGuestCartIntoUser(user.id);
    redirect(next || (isStaffRole(user.role) ? "/admin" : "/account"));
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/login?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
}
