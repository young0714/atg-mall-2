"use server";

import { requireUser } from "@/lib/auth/current-user";
import { hashPassword } from "@/lib/auth/password";
import { setPasswordSchema } from "@/lib/validation/schemas";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function setPasswordAction(formData: FormData) {
  const user = await requireUser();
  const parsed = setPasswordSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    redirect(`/account/set-password?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.user.update({ where: { id: user.id }, data: { passwordHash, isGuest: false } });

  redirect("/account?passwordSet=1");
}
