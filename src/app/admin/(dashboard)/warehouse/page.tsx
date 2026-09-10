import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { receivePackageAction } from "./actions";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Warehouse" };
export const dynamic = "force-dynamic";

export default async function AdminWarehousePage({
  searchParams,
}: {
  searchParams: { received?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_WAREHOUSE);

  const [customers, recentReceipts, warehouses] = await Promise.all([
    db.user.findMany({ where: { role: "CUSTOMER" }, orderBy: { fullName: "asc" } }),
    db.warehouseReceipt.findMany({ orderBy: { receivedAt: "desc" }, take: 10, include: { package: true } }),
    db.warehouse.findMany(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">China Warehouse</h1>
        <p className="text-sm text-navy-500">{warehouses[0]?.name ?? "No warehouse configured"}</p>
      </div>

      {searchParams.received && (
        <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
          Package <strong>{searchParams.received}</strong> received and logged.
        </div>
      )}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <form action={receivePackageAction} className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="font-semibold text-navy-900 sm:col-span-2">Receive New Package</h2>
        <Field label="Customer" htmlFor="userId" required>
          <Select id="userId" name="userId" required>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.fullName} ({c.email})</option>)}
          </Select>
        </Field>
        <Field label="Related order ID" htmlFor="orderId" hint="Optional — leave blank if not linked to a catalog order">
          <Input id="orderId" name="orderId" />
        </Field>
        <Field label="Supplier name" htmlFor="supplierName"><Input id="supplierName" name="supplierName" /></Field>
        <Field label="Inbound tracking number" htmlFor="trackingNumberIn"><Input id="trackingNumberIn" name="trackingNumberIn" /></Field>
        <Field label="Weight (grams)" htmlFor="weightGrams" required><Input id="weightGrams" name="weightGrams" type="number" required /></Field>
        <Field label="Destination" htmlFor="destination" required>
          <Select id="destination" name="destination" required>
            <option value="NIGERIA">Nigeria</option>
            <option value="GAMBIA">Gambia</option>
          </Select>
        </Field>
        <Field label="Length (cm)" htmlFor="lengthCm"><Input id="lengthCm" name="lengthCm" type="number" /></Field>
        <Field label="Width (cm)" htmlFor="widthCm"><Input id="widthCm" name="widthCm" type="number" /></Field>
        <Field label="Height (cm)" htmlFor="heightCm"><Input id="heightCm" name="heightCm" type="number" /></Field>
        <Field label="Notes" htmlFor="notes"><Textarea id="notes" name="notes" /></Field>
        <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Log Received Package</button>
      </form>

      <div className="card">
        <div className="border-b border-navy-100 p-5"><h2 className="font-semibold text-navy-900">Recent Receipts</h2></div>
        <div className="divide-y divide-navy-100">
          {recentReceipts.map((r) => (
            <div key={r.id} className="flex justify-between p-4 text-sm">
              <span className="font-medium text-navy-800">{r.package.packageCode}</span>
              <span className="text-navy-500">{(r.weightGrams / 1000).toFixed(2)}kg · {formatDate(r.receivedAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
