"use server";

import { consumeMagicLinkToken } from "@/lib/auth/auth-service";
import { createSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

function safeNext(raw: string): string {
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "";
}

export async function confirmMagicLinkAction(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const next = safeNext(String(formData.get("next") ?? ""));

  const user = await consumeMagicLinkToken(token);
  if (!user) {
    redirect("/login?guestError=" + encodeURIComponent("This link is invalid or has expired. Please continue as a guest again."));
  }

  await createSession({ userId: user.id, role: user.role, fullName: user.fullName, email: user.email });
  redirect(next || "/account?welcome=1");
}
