import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { notFound } from "next/navigation";
import { Field, Input, Select } from "@/components/ui/Form";
import { updateCategoryAction } from "../actions";
import { collectDescendantIds } from "@/lib/categoryTree";
import Link from "next/link";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "Admin — Edit Category" };
export const dynamic = "force-dynamic";

export default async function AdminCategoryDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { updated?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_CATEGORIES);

  const [category, allCategories] = await Promise.all([
    db.category.findUnique({ where: { id: params.id } }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, parentId: true } }),
  ]);
  if (!category) notFound();

  // A category can't be its own parent, nor a descendant's parent (that
  // would make it its own ancestor) — excluded from the options entirely
  // rather than just blocked server-side, so there's nothing invalid to
  // pick from in the first place.
  const excludedIds = new Set(collectDescendantIds(allCategories, category.id));
  const parentOptions = allCategories.filter((c) => !excludedIds.has(c.id));

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/admin/categories" className="text-xs font-medium text-atgblue-600 hover:underline">
        ← Back to categories
      </Link>
      <h1 className="text-2xl font-display font-bold text-navy-900">Edit Category</h1>

      {searchParams.updated && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <form action={updateCategoryAction} className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
        <input type="hidden" name="categoryId" value={category.id} />
        <Field label="Name" htmlFor="name" required>
          <Input id="name" name="name" defaultValue={category.name} required />
        </Field>
        <Field label="Slug" htmlFor="slug" required>
          <Input id="slug" name="slug" defaultValue={category.slug} required />
        </Field>
        <Field label="Parent category" htmlFor="parentId" hint="Leave blank for a top-level category">
          <Select id="parentId" name="parentId" defaultValue={category.parentId ?? ""}>
            <option value="">— Top level —</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Image URL" htmlFor="imageUrl">
          <Input id="imageUrl" name="imageUrl" type="url" defaultValue={category.imageUrl ?? ""} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description" htmlFor="description">
            <Input id="description" name="description" defaultValue={category.description ?? ""} />
          </Field>
        </div>
        <SubmitButton className="btn-primary sm:col-span-2 sm:w-fit">Save Changes</SubmitButton>
      </form>
    </div>
  );
}
