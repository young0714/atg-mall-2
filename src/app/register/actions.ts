"use server";

import { registerSchema } from "@/lib/validation/schemas";
import { registerUser, AuthError } from "@/lib/auth/auth-service";
import { createSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function registerAction(formData: FormData) {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/register?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  try {
    const user = await registerUser(parsed.data!);
    await createSession({ userId: user.id, role: user.role, fullName: user.fullName, email: user.email });
    redirect("/account");
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/register?error=${encodeURIComponent(err.message)}`);
    }
    throw err;
  }
}
