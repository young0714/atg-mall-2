import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Form";
import { createSupplierAction, toggleSupplierVerifiedAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Suppliers" };
export const dynamic = "force-dynamic";

export default async function AdminSuppliersPage({
  searchParams,
}: {
  searchParams: { created?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SUPPLIERS);
  const suppliers = await db.supplier.findMany({ orderBy: { createdAt: "desc" }, include: { _count: { select: { products: true } } } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-navy-900">Suppliers</h1>

      {searchParams.created && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Supplier added.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <form action={createSupplierAction} className="card grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Supplier name" htmlFor="name" required><Input id="name" name="name" required /></Field>
        <Field label="Platform" htmlFor="platform" required>
          <Select id="platform" name="platform" defaultValue="MOCK_1688">
            <option value="MOCK_1688">1688</option>
            <option value="MOCK_TAOBAO">Taobao</option>
            <option value="ALIBABA">Alibaba</option>
            <option value="SELLER">Direct / Seller</option>
          </Select>
        </Field>
        <Field label="Location" htmlFor="location"><Input id="location" name="location" placeholder="e.g. Guangzhou, China" /></Field>
        <Field label="Contact name" htmlFor="contactName"><Input id="contactName" name="contactName" /></Field>
        <Field label="Contact phone" htmlFor="contactPhone"><Input id="contactPhone" name="contactPhone" /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="verified" value="true" /> Verified supplier</label>
        <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Add Supplier</button>
      </form>

      <div className="grid gap-3 sm:grid-cols-2">
        {suppliers.map((s) => (
          <div key={s.id} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-navy-800">{s.name}</p>
                <p className="text-xs text-navy-400">{s.location} · {s._count.products} products</p>
              </div>
              <Badge tone={s.verified ? "green" : "neutral"}>{s.verified ? "Verified" : "Unverified"}</Badge>
            </div>
            <form action={toggleSupplierVerifiedAction} className="mt-2">
              <input type="hidden" name="supplierId" value={s.id} />
              <button className="text-xs font-medium text-atgblue-600 hover:underline">
                Mark as {s.verified ? "unverified" : "verified"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
