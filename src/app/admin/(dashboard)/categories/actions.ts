"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { categorySchema } from "@/lib/validation/schemas";
import { wouldCreateCycle } from "@/lib/categoryTree";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export async function createCategoryAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_CATEGORIES);
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/categories?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid category")}`);
  }
  await db.category.create({
    data: {
      ...parsed.data!,
      imageUrl: parsed.data!.imageUrl || undefined,
      parentId: parsed.data!.parentId || undefined,
    },
  });
  revalidatePath("/admin/categories");
  redirect("/admin/categories?created=1");
}

export async function updateCategoryAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_CATEGORIES);
  const categoryId = String(formData.get("categoryId"));
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/admin/categories/${categoryId}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid category")}`);
  }
  const data = parsed.data!;
  const parentId = data.parentId || null;

  if (parentId) {
    const all = await db.category.findMany({ select: { id: true, parentId: true } });
    if (wouldCreateCycle(all, categoryId, parentId)) {
      redirect(`/admin/categories/${categoryId}?error=${encodeURIComponent("Can't set a category as a descendant of itself.")}`);
    }
  }

  await db.category.update({
    where: { id: categoryId },
    data: { name: data.name, slug: data.slug, description: data.description || null, imageUrl: data.imageUrl || null, parentId },
  });
  revalidatePath("/admin/categories");
  revalidatePath("/shop");
  redirect(`/admin/categories/${categoryId}?updated=1`);
}

export async function deleteCategoryAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_CATEGORIES);
  const id = String(formData.get("categoryId"));

  const childCount = await db.category.count({ where: { parentId: id } });
  if (childCount > 0) {
    redirect("/admin/categories?error=" + encodeURIComponent("This category has subcategories — move or delete those first."));
  }

  try {
    await db.category.delete({ where: { id } });
  } catch {
    redirect("/admin/categories?error=" + encodeURIComponent("Category has products assigned — reassign them first."));
  }
  revalidatePath("/admin/categories");
}
