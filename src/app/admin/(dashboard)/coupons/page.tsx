import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Form";
import { createCouponAction, toggleCouponActiveAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Coupons" };
export const dynamic = "force-dynamic";

export default async function AdminCouponsPage({
  searchParams,
}: {
  searchParams: { created?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_COUPONS);
  const coupons = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-navy-900">Coupons</h1>

      {searchParams.created && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Coupon created.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <form action={createCouponAction} className="card grid gap-4 p-5 sm:grid-cols-4">
        <Field label="Code" htmlFor="code" required><Input id="code" name="code" required placeholder="WELCOME10" /></Field>
        <Field label="Type" htmlFor="type" required>
          <Select id="type" name="type" required>
            <option value="PERCENTAGE">Percentage</option>
            <option value="FIXED">Fixed amount (minor units)</option>
          </Select>
        </Field>
        <Field label="Value" htmlFor="value" required><Input id="value" name="value" type="number" required /></Field>
        <Field label="Usage limit" htmlFor="usageLimit"><Input id="usageLimit" name="usageLimit" type="number" /></Field>
        <button type="submit" className="btn-primary sm:col-span-4 sm:w-fit">Create Coupon</button>
      </form>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr><th className="p-3">Code</th><th className="p-3">Type</th><th className="p-3">Value</th><th className="p-3">Used</th><th className="p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="p-3 font-mono font-medium text-navy-800">{c.code}</td>
                <td className="p-3 text-navy-500">{c.type}</td>
                <td className="p-3 text-navy-500">{c.type === "PERCENTAGE" ? `${c.value}%` : c.value}</td>
                <td className="p-3 text-navy-500">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                <td className="p-3"><Badge tone={c.isActive ? "green" : "neutral"}>{c.isActive ? "Active" : "Inactive"}</Badge></td>
                <td className="p-3">
                  <form action={toggleCouponActiveAction}>
                    <input type="hidden" name="couponId" value={c.id} />
                    <button className="text-xs font-medium text-atgblue-600 hover:underline">{c.isActive ? "Deactivate" : "Activate"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
