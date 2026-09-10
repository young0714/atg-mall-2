"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { categorySchema } from "@/lib/validation/schemas";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createCategoryAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_CATEGORIES);
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/categories?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid category")}`);
  }
  await db.category.create({
    data: { ...parsed.data!, imageUrl: parsed.data!.imageUrl || undefined },
  });
  revalidatePath("/admin/categories");
  redirect("/admin/categories?created=1");
}

export async function deleteCategoryAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_CATEGORIES);
  const id = String(formData.get("categoryId"));
  try {
    await db.category.delete({ where: { id } });
  } catch {
    redirect("/admin/categories?error=" + encodeURIComponent("Category has products assigned — reassign them first."));
  }
  revalidatePath("/admin/categories");
}
