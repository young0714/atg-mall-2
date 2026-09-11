import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { StatusBadge } from "@/components/ui/Badge";
import { Field, Input, Select } from "@/components/ui/Form";
import { formatDate } from "@/lib/utils";
import { issueShopForMeQuotationAction, markShopForMeUnderReviewAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Shop For Me" };
export const dynamic = "force-dynamic";

export default async function AdminShopForMePage({
  searchParams,
}: {
  searchParams: { quoted?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_SHOP_FOR_ME);

  const requests = await db.shopForMeRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, quotations: true, store: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-navy-900">Shop For Me — Request Queue</h1>
      {searchParams.quoted && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Quotation sent to customer.</div>}

      <div className="space-y-4">
        {requests.map((req) => (
          <div key={req.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-navy-800">{req.productName}</p>
                <p className="text-xs text-navy-400">
                  {req.user.fullName} · Qty {req.quantity} · {req.destination} · {formatDate(req.createdAt)}
                  {req.store && <> · <span className="font-medium text-atgblue-600">{req.store.name}</span></>}
                </p>
                <a href={req.productUrl} target="_blank" rel="noreferrer" className="text-xs text-atgblue-600 underline">
                  View product link
                </a>
              </div>
              <StatusBadge status={req.status} />
            </div>

            {req.status === "SUBMITTED" && (
              <form action={markShopForMeUnderReviewAction} className="mt-3">
                <input type="hidden" name="requestId" value={req.id} />
                <button className="btn-outline btn-sm">Start Review</button>
              </form>
            )}

            {(req.status === "SUBMITTED" || req.status === "UNDER_REVIEW") && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-atgblue-600">Issue Quotation</summary>
                <form action={issueShopForMeQuotationAction} className="mt-3 grid gap-3 rounded-lg border border-navy-100 p-4 sm:grid-cols-3">
                  <input type="hidden" name="requestId" value={req.id} />
                  <Field label="Product cost" htmlFor={`pc-${req.id}`} required><Input id={`pc-${req.id}`} name="productCost" type="number" step="0.01" required /></Field>
                  <Field label="China shipping" htmlFor={`cs-${req.id}`}><Input id={`cs-${req.id}`} name="chinaShipping" type="number" step="0.01" defaultValue={0} /></Field>
                  <Field label="ATG service fee" htmlFor={`sf-${req.id}`} required><Input id={`sf-${req.id}`} name="serviceFee" type="number" step="0.01" required /></Field>
                  <Field label="Intl shipping" htmlFor={`is-${req.id}`} required><Input id={`is-${req.id}`} name="intlShipping" type="number" step="0.01" required /></Field>
                  <Field label="Other charges" htmlFor={`oc-${req.id}`}><Input id={`oc-${req.id}`} name="otherCharges" type="number" step="0.01" defaultValue={0} /></Field>
                  <Field label="Currency" htmlFor={`cur-${req.id}`} required>
                    <Select id={`cur-${req.id}`} name="currency" defaultValue={req.destination === "NIGERIA" ? "NGN" : "GMD"} required>
                      <option value="NGN">NGN</option>
                      <option value="GMD">GMD</option>
                      <option value="USD">USD</option>
                    </Select>
                  </Field>
                  <button type="submit" className="btn-primary btn-sm sm:col-span-3 sm:w-fit">Send Quotation</button>
                </form>
              </details>
            )}
          </div>
        ))}
        {requests.length === 0 && (
          <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">No requests yet.</div>
        )}
      </div>
    </div>
  );
}
