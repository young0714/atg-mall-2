import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { StatusBadge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Form";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { addSourcingOptionAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Source a Product" };
export const dynamic = "force-dynamic";

export default async function AdminSourcingPage({
  searchParams,
}: {
  searchParams: { added?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SOURCING);

  const [requests, suppliers] = await Promise.all([
    db.sourcingRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true, options: { include: { supplier: true } } },
    }),
    db.supplier.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-navy-900">Source a Product — Request Queue</h1>
      {searchParams.added && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Supplier option added.</div>}

      <div className="space-y-4">
        {requests.map((req) => (
          <div key={req.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-navy-800">{req.productName}</p>
                <p className="text-xs text-navy-400">{req.user.fullName} · Qty {req.quantity} · {req.destination} · {formatDate(req.createdAt)}</p>
                {req.notes && <p className="mt-1 text-sm text-navy-500">{req.notes}</p>}
              </div>
              <StatusBadge status={req.status} />
            </div>

            {req.options.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-navy-600">
                {req.options.map((opt) => (
                  <li key={opt.id}>
                    {opt.supplier?.name ?? "ATG Sourcing"} — {formatMoney(opt.unitPriceMinor, opt.currency)}/unit
                    {opt.isSelected && <span className="ml-2 badge bg-atggreen-50 text-atggreen-700">Customer Selected</span>}
                  </li>
                ))}
              </ul>
            )}

            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-atgblue-600">+ Add Supplier Option</summary>
              <form action={addSourcingOptionAction} className="mt-3 grid gap-3 rounded-lg border border-navy-100 p-4 sm:grid-cols-3">
                <input type="hidden" name="requestId" value={req.id} />
                <Field label="Supplier" htmlFor={`sup-${req.id}`}>
                  <Select id={`sup-${req.id}`} name="supplierId" defaultValue="">
                    <option value="">— None / ATG Direct —</option>
                    {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
                <Field label="Unit price" htmlFor={`up-${req.id}`} required><Input id={`up-${req.id}`} name="unitPrice" type="number" step="0.01" required /></Field>
                <Field label="Currency" htmlFor={`cur-${req.id}`} required>
                  <Select id={`cur-${req.id}`} name="currency" defaultValue="USD" required>
                    <option value="USD">USD</option>
                    <option value="NGN">NGN</option>
                    <option value="GMD">GMD</option>
                  </Select>
                </Field>
                <Field label="MOQ" htmlFor={`moq-${req.id}`}><Input id={`moq-${req.id}`} name="moq" type="number" defaultValue={1} /></Field>
                <Field label="Est. shipping" htmlFor={`es-${req.id}`}><Input id={`es-${req.id}`} name="estimatedShipping" type="number" step="0.01" defaultValue={0} /></Field>
                <Field label="Sourcing fee" htmlFor={`sfee-${req.id}`}><Input id={`sfee-${req.id}`} name="sourcingFee" type="number" step="0.01" defaultValue={0} /></Field>
                <Field label="Lead time (days)" htmlFor={`lt-${req.id}`}><Input id={`lt-${req.id}`} name="leadTimeDays" type="number" defaultValue={14} /></Field>
                <Field label="Notes" htmlFor={`notes-${req.id}`}><Input id={`notes-${req.id}`} name="notes" /></Field>
                <button type="submit" className="btn-primary btn-sm sm:col-span-3 sm:w-fit">Add Option</button>
              </form>
            </details>
          </div>
        ))}
        {requests.length === 0 && (
          <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">No requests yet.</div>
        )}
      </div>
    </div>
  );
}
