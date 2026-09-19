import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Field, Input, Select } from "@/components/ui/Form";
import { createCategoryAction, deleteCategoryAction } from "./actions";
import { buildCategoryTree, type CategoryTreeNode } from "@/lib/categoryTree";
import Link from "next/link";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/SubmitButton";

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
  const productCountById = new Map(categories.map((c) => [c.id, c._count.products]));
  const tree = buildCategoryTree(categories);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-navy-900">Categories</h1>

      {searchParams.created && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Category created.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <form action={createCategoryAction} className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-4">
        <Field label="Name" htmlFor="name" required><Input id="name" name="name" required /></Field>
        <Field label="Slug" htmlFor="slug" required><Input id="slug" name="slug" required /></Field>
        <Field label="Parent category" htmlFor="parentId" hint="Optional — leave blank for a top-level category">
          <Select id="parentId" name="parentId" defaultValue="">
            <option value="">— Top level —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Image URL" htmlFor="imageUrl"><Input id="imageUrl" name="imageUrl" type="url" /></Field>
        <SubmitButton className="btn-primary sm:col-span-4 sm:w-fit">Add Category</SubmitButton>
      </form>

      <div className="card divide-y divide-navy-100">
        {tree.map((node) => (
          <CategoryRow key={node.id} node={node} depth={0} productCountById={productCountById} />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({
  node,
  depth,
  productCountById,
}: {
  node: CategoryTreeNode;
  depth: number;
  productCountById: Map<string, number>;
}) {
  return (
    <>
      <div className="flex items-center justify-between p-4" style={{ paddingLeft: `${1 + depth * 1.5}rem` }}>
        <div>
          <Link href={`/admin/categories/${node.id}`} className="font-medium text-navy-800 hover:text-atgblue-600 hover:underline">
            {depth > 0 && <span className="mr-1.5 text-navy-300">↳</span>}
            {node.name}
          </Link>
          <p className="text-xs text-navy-400">{productCountById.get(node.id) ?? 0} products</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/admin/categories/${node.id}`} className="text-xs font-medium text-atgblue-600 hover:underline">
            Edit
          </Link>
          <form action={deleteCategoryAction}>
            <input type="hidden" name="categoryId" value={node.id} />
            <SubmitButton className="text-xs font-medium text-red-600 hover:underline">Delete</SubmitButton>
          </form>
        </div>
      </div>
      {node.children.map((child) => (
        <CategoryRow key={child.id} node={child} depth={depth + 1} productCountById={productCountById} />
      ))}
    </>
  );
}
