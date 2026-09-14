"use server";

import { registerSchema } from "@/lib/validation/schemas";
import { registerUser, AuthError } from "@/lib/auth/auth-service";
import { createSession } from "@/lib/auth/session";
import { setDestinationCookie } from "@/lib/destination";
import { mergeGuestCartIntoUser } from "@/lib/services/cartService";
import { notificationService, NOTIFICATION_EVENTS } from "@/lib/services/notificationService";
import { redirect } from "next/navigation";

function safeNext(raw: string): string {
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "";
}

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!parsed.success) {
    redirect(`/register?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  try {
    const user = await registerUser(parsed.data!);
    await createSession({ userId: user.id, role: user.role, fullName: user.fullName, email: user.email });
    setDestinationCookie(parsed.data!.countryIso);
    await mergeGuestCartIntoUser(user.id);
    await notificationService.notify({
      userId: user.id,
      userContact: user.email,
      event: NOTIFICATION_EVENTS.WELCOME,
      title: "Welcome to ATG Mall!",
      body: `Hi ${user.fullName.split(" ")[0]}, your ATG Mall account is ready. Start shopping, sourcing or shipping — we've got the rest covered.`,
      channels: ["EMAIL"],
    });
    redirect(next || "/account?justRegistered=1");
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/register?error=${encodeURIComponent(err.message)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
    }
    throw err;
  }
}
