import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { acceptQuotationAction, declineQuotationAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Quotations" };
export const dynamic = "force-dynamic";

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: { error?: string; ready?: string };
}) {
  const user = await requireUser();
  const quotations = await db.quotation.findMany({
    where: {
      OR: [{ shopForMeRequest: { userId: user.id } }, { sourcingRequest: { userId: user.id } }],
    },
    orderBy: { createdAt: "desc" },
    include: { lineItems: true, shopForMeRequest: true, sourcingRequest: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-navy-900">Quotations</h1>
      <p className="mt-1 text-sm text-navy-500">Review and accept quotations from your Shop for Me and Sourcing requests.</p>

      {searchParams.error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      {quotations.length === 0 ? (
        <div className="mt-8 rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
          No quotations yet.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {quotations.map((q) => {
            const productName = q.shopForMeRequest?.productName ?? q.sourcingRequest?.productName ?? "Requested item";
            return (
              <div key={q.id} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-navy-800">{productName}</p>
                    <p className="text-xs text-navy-400">Quotation #{q.quotationNumber} · {formatDate(q.createdAt)}</p>
                  </div>
                  <StatusBadge status={q.status} />
                </div>

                <div className="mt-4 grid gap-1.5 text-sm sm:max-w-sm">
                  {q.lineItems.map((li) => (
                    <div key={li.id} className="flex justify-between">
                      <span className="text-navy-500">{li.label}</span>
                      <span className="font-medium text-navy-700">{formatMoney(li.amountMinor, q.currency)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between border-t border-navy-100 pt-1.5">
                    <span className="font-bold text-navy-900">Total</span>
                    <span className="font-bold text-atgblue-600">{formatMoney(q.totalMinor, q.currency)}</span>
                  </div>
                </div>

                {q.status === "PENDING" && (
                  <div className="mt-4 flex gap-2">
                    <form action={acceptQuotationAction}>
                      <input type="hidden" name="quotationId" value={q.id} />
                      <button type="submit" className="btn-primary btn-sm">Accept &amp; Pay</button>
                    </form>
                    <form action={declineQuotationAction}>
                      <input type="hidden" name="quotationId" value={q.id} />
                      <button type="submit" className="btn-ghost btn-sm">Decline</button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
