import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/Badge";
import { StatusTimeline } from "@/components/tracking/StatusTimeline";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { SHIPMENT_STATUS_FLOW } from "@/lib/constants";
import { addTrackingEventAction } from "../actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Shipment Detail" };
export const dynamic = "force-dynamic";

export default async function AdminShipmentDetailPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPMENTS);

  const shipment = await db.shipment.findUnique({
    where: { id: params.id },
    include: { packages: { include: { package: { include: { user: true } } } }, trackingEvents: { orderBy: { occurredAt: "desc" } } },
  });
  if (!shipment) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy-900">{shipment.trackingNumber}</h1>
          <p className="text-sm text-navy-500">{shipment.method.replaceAll("_", " ")} to {shipment.destinationCountry}</p>
        </div>
        <StatusBadge status={shipment.status} className="text-sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Packages in this shipment</h2>
            <ul className="space-y-1.5 text-sm text-navy-600">
              {shipment.packages.map((sp) => (
                <li key={sp.id}>{sp.package.packageCode} — {sp.package.user.fullName}</li>
              ))}
            </ul>
          </div>
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-navy-900">Timeline</h2>
            <StatusTimeline events={shipment.trackingEvents} />
          </div>
        </div>

        <form action={addTrackingEventAction} className="card h-fit space-y-3 p-5">
          <input type="hidden" name="shipmentId" value={shipment.id} />
          <h2 className="font-semibold text-navy-900">Add Status Update</h2>
          <Field label="Status" htmlFor="status" required>
            <Select id="status" name="status" required>
              {SHIPMENT_STATUS_FLOW.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
            </Select>
          </Field>
          <Field label="Location" htmlFor="location"><Input id="location" name="location" placeholder="e.g. Lagos Customs" /></Field>
          <Field label="Description" htmlFor="description"><Textarea id="description" name="description" /></Field>
          <button type="submit" className="btn-primary w-full">Add Update</button>
        </form>
      </div>
    </div>
  );
}
