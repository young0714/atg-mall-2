import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Field, Input, Select } from "@/components/ui/Form";
import { createShipmentAction } from "../actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Create Shipment" };
export const dynamic = "force-dynamic";

export default async function NewShipmentPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPMENTS);

  const readyPackages = await db.package.findMany({
    where: { status: "READY_TO_SHIP" },
    include: { user: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-display font-bold text-navy-900">Create Shipment</h1>
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      {readyPackages.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-navy-200 p-10 text-center text-navy-400">
          No packages are currently marked READY_TO_SHIP. Mark packages ready from the Packages or Consolidation screens first.
        </div>
      ) : (
        <form action={createShipmentAction} className="card space-y-4 p-6">
          <div>
            <p className="label mb-2">Select packages to include</p>
            <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-navy-100 p-2">
              {readyPackages.map((pkg) => (
                <label key={pkg.id} className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-sand-50">
                  <input type="checkbox" name="packageIds" value={pkg.id} />
                  {pkg.packageCode} — {pkg.user.fullName} — {pkg.weightGrams ? `${(pkg.weightGrams / 1000).toFixed(2)}kg` : "weight pending"} — {pkg.destination}
                </label>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Shipping method" htmlFor="method" required>
              <Select id="method" name="method" required>
                <option value="AIR_FREIGHT">Air Freight</option>
                <option value="SEA_FREIGHT">Sea Freight</option>
                <option value="COURIER">Courier</option>
                <option value="LCL">LCL</option>
                <option value="FCL">FCL</option>
              </Select>
            </Field>
            <Field label="Destination country" htmlFor="destinationCountry" required>
              <Select id="destinationCountry" name="destinationCountry" required>
                <option value="NIGERIA">Nigeria</option>
                <option value="GAMBIA">Gambia</option>
              </Select>
            </Field>
            <Field label="Destination city" htmlFor="destinationCity">
              <Input id="destinationCity" name="destinationCity" />
            </Field>
          </div>
          <button type="submit" className="btn-primary">Create Shipment &amp; Generate Tracking Number</button>
        </form>
      )}
    </div>
  );
}
