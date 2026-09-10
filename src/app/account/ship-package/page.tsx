import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Form";
import { requestShipmentAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Ship My Package" };
export const dynamic = "force-dynamic";

const ELIGIBLE_STATUSES = ["RECEIVED", "INSPECTION", "AWAITING_CUSTOMER_INSTRUCTION"] as const;

export default async function ShipPackagePage({
  searchParams,
}: {
  searchParams: { submitted?: string; error?: string };
}) {
  const user = await requireUser();
  const eligiblePackages = await db.package.findMany({
    where: { userId: user.id, status: { in: [...ELIGIBLE_STATUSES] } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-navy-900">Ship My Package</h1>
      <p className="mt-1 text-sm text-navy-500">
        Select packages sitting in our China warehouse and request them to be consolidated and shipped.
      </p>

      {searchParams.submitted && (
        <div className="mt-4 rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
          Shipment request received. Our shipping team will confirm final cost and dispatch your consolidation.
        </div>
      )}
      {searchParams.error && (
        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}

      {eligiblePackages.length === 0 ? (
        <div className="mt-8 rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
          You have no packages currently eligible to ship. Packages become eligible once they&apos;re received and
          inspected at our warehouse.
        </div>
      ) : (
        <form action={requestShipmentAction} className="mt-6 space-y-4">
          <div className="space-y-2">
            {eligiblePackages.map((pkg) => (
              <label key={pkg.id} className="flex items-center justify-between gap-3 rounded-xl2 border border-navy-100 bg-white p-4 has-[:checked]:border-atgblue-400 has-[:checked]:bg-atgblue-50">
                <span className="flex items-center gap-3">
                  <input type="checkbox" name="packageIds" value={pkg.id} />
                  <span className="text-sm">
                    <span className="font-semibold text-navy-800">{pkg.packageCode}</span>
                    {pkg.weightGrams && <span className="text-navy-400"> · {(pkg.weightGrams / 1000).toFixed(2)} kg</span>}
                  </span>
                </span>
                <StatusBadge status={pkg.status} />
              </label>
            ))}
          </div>

          <div className="card max-w-sm p-4">
            <label className="label" htmlFor="shippingMethod">Preferred shipping method</label>
            <Select id="shippingMethod" name="shippingMethod" required defaultValue="AIR_FREIGHT">
              <option value="AIR_FREIGHT">Air Freight</option>
              <option value="SEA_FREIGHT">Sea Freight</option>
              <option value="COURIER">Express Courier</option>
              <option value="LCL">Sea Freight (LCL)</option>
              <option value="FCL">Sea Freight (FCL)</option>
            </Select>
            <button type="submit" className="btn-primary mt-4 w-full">Request Shipment</button>
          </div>
        </form>
      )}
    </div>
  );
}
