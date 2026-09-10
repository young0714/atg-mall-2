import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Field, Input } from "@/components/ui/Form";
import { createCategoryAction, deleteCategoryAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Categories" };
export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage({
  searchParams,
}: {
  searchParams: { created?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_CATEGORIES);
  const categories = await db.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-navy-900">Categories</h1>

      {searchParams.created && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Category created.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <form action={createCategoryAction} className="card grid gap-4 p-5 sm:grid-cols-3">
        <Field label="Name" htmlFor="name" required><Input id="name" name="name" required /></Field>
        <Field label="Slug" htmlFor="slug" required><Input id="slug" name="slug" required /></Field>
        <Field label="Image URL" htmlFor="imageUrl"><Input id="imageUrl" name="imageUrl" type="url" /></Field>
        <button type="submit" className="btn-primary sm:col-span-3 sm:w-fit">Add Category</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <div key={c.id} className="card flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-navy-800">{c.name}</p>
              <p className="text-xs text-navy-400">{c._count.products} products</p>
            </div>
            <form action={deleteCategoryAction}>
              <input type="hidden" name="categoryId" value={c.id} />
              <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
