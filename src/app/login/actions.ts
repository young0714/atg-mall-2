"use server";

import { loginSchema } from "@/lib/validation/schemas";
import { authenticateUser, AuthError } from "@/lib/auth/auth-service";
import { createSession } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/rbac";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const next = String(formData.get("next") ?? "");

  if (!parsed.success) {
    redirect(`/login?error=${encodeURIComponent("Enter a valid email and password")}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }

  try {
    const user = await authenticateUser(parsed.data);
    await createSession({ userId: user.id, role: user.role, fullName: user.fullName, email: user.email });
    redirect(next || (isStaffRole(user.role) ? "/admin" : "/account"));
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/login?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
}
