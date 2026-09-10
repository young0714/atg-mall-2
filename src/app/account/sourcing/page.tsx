import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { approveSourcingOptionAction } from "./actions";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sourcing Requests" };
export const dynamic = "force-dynamic";

export default async function SourcingRequestsPage({
  searchParams,
}: {
  searchParams: { submitted?: string; error?: string };
}) {
  const user = await requireUser();
  const requests = await db.sourcingRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { options: { include: { supplier: true }, orderBy: { createdAt: "asc" } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-navy-900">Sourcing Requests</h1>
        <Link href="/source-a-product" className="btn-primary btn-sm">New Request</Link>
      </div>

      {searchParams.submitted && (
        <div className="mt-4 rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
          Request submitted! Our sourcing team will add supplier options here soon.
        </div>
      )}
      {searchParams.error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      {requests.length === 0 ? (
        <div className="mt-8 rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
          You haven&apos;t submitted a sourcing request yet.
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {requests.map((req) => (
            <div key={req.id} className="card p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-navy-800">{req.productName}</p>
                  <p className="text-xs text-navy-400">Qty {req.quantity} · Submitted {formatDate(req.createdAt)}</p>
                </div>
                <StatusBadge status={req.status} />
              </div>

              {req.options.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Supplier options</p>
                  {req.options.map((opt) => (
                    <div key={opt.id} className="flex flex-col gap-2 rounded-lg border border-navy-100 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-sm">
                        <p className="font-medium text-navy-800">{opt.supplier?.name ?? "ATG Sourcing"}</p>
                        <p className="text-navy-500">
                          {formatMoney(opt.unitPriceMinor, opt.currency)}/unit · MOQ {opt.moq} · ships in ~{opt.leadTimeDays} days
                        </p>
                        {opt.notes && <p className="text-xs text-navy-400">{opt.notes}</p>}
                      </div>
                      {opt.isSelected ? (
                        <span className="badge bg-atggreen-50 text-atggreen-700">Selected</span>
                      ) : req.status === "UNDER_REVIEW" ? (
                        <form action={approveSourcingOptionAction}>
                          <input type="hidden" name="optionId" value={opt.id} />
                          <button type="submit" className="btn-outline btn-sm">Approve this option</button>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
