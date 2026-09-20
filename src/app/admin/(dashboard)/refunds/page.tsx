import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Pagination } from "@/components/ui/Pagination";
import { formatMoney } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { issueRefundAction } from "./actions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Refunds" };
export const dynamic = "force-dynamic";

const REFUNDABLE_PAGE_SIZE = 50;
const REFUNDED_PAGE_SIZE = 20;

export default async function AdminRefundsPage({
  searchParams,
}: {
  searchParams: { refundablePage?: string; refundedPage?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_REFUNDS);

  const refundablePage = Math.max(1, Math.trunc(Number(searchParams.refundablePage)) || 1);
  const refundedPage = Math.max(1, Math.trunc(Number(searchParams.refundedPage)) || 1);

  const [refundableCount, refundable, refundedCount, refunded] = await Promise.all([
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING", "CANCELLED"] } } }),
    db.order.findMany({
      where: { status: { in: ["PAID", "PROCESSING", "CANCELLED"] } },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (refundablePage - 1) * REFUNDABLE_PAGE_SIZE,
      take: REFUNDABLE_PAGE_SIZE,
    }),
    db.order.count({ where: { status: "REFUNDED" } }),
    db.order.findMany({
      where: { status: "REFUNDED" },
      include: { user: true },
      orderBy: { updatedAt: "desc" },
      skip: (refundedPage - 1) * REFUNDED_PAGE_SIZE,
      take: REFUNDED_PAGE_SIZE,
    }),
  ]);
  const totalRefundablePages = Math.max(1, Math.ceil(refundableCount / REFUNDABLE_PAGE_SIZE));
  const totalRefundedPages = Math.max(1, Math.ceil(refundedCount / REFUNDED_PAGE_SIZE));

  // Each list paginates independently — the other list's page stays put
  // when you page through this one.
  function refundableHref(page: number): string {
    const params = new URLSearchParams();
    if (searchParams.refundedPage) params.set("refundedPage", searchParams.refundedPage);
    if (page > 1) params.set("refundablePage", String(page));
    const qs = params.toString();
    return qs ? `/admin/refunds?${qs}` : "/admin/refunds";
  }
  function refundedHref(page: number): string {
    const params = new URLSearchParams();
    if (searchParams.refundablePage) params.set("refundablePage", searchParams.refundablePage);
    if (page > 1) params.set("refundedPage", String(page));
    const qs = params.toString();
    return qs ? `/admin/refunds?${qs}` : "/admin/refunds";
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Refunds</h1>
        <p className="text-sm text-navy-500">Refunds are credited back to the customer&apos;s ATG Wallet as a ledgered transaction.</p>
      </div>

      <div className="card">
        <div className="flex items-baseline justify-between border-b border-navy-100 p-5">
          <h2 className="font-semibold text-navy-900">Eligible Orders</h2>
          <p className="text-sm text-navy-500">
            {refundableCount === 0
              ? "0 orders"
              : `Showing ${(refundablePage - 1) * REFUNDABLE_PAGE_SIZE + 1}–${Math.min(refundablePage * REFUNDABLE_PAGE_SIZE, refundableCount)} of ${refundableCount}`}
          </p>
        </div>
        <div className="divide-y divide-navy-100">
          {refundable.map((o) => (
            <div key={o.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium text-navy-800">{o.orderNumber}</p>
                <p className="text-xs text-navy-400">{o.user.fullName} · {formatDate(o.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-medium">{formatMoney(o.totalMinor, o.currency)}</span>
                <form action={issueRefundAction}>
                  <input type="hidden" name="orderId" value={o.id} />
                  <SubmitButton className="btn-outline btn-sm">Refund to Wallet</SubmitButton>
                </form>
              </div>
            </div>
          ))}
          {refundable.length === 0 && <p className="p-4 text-sm text-navy-400">No orders currently eligible for refund.</p>}
        </div>
        <div className="px-5 pb-5">
          <Pagination currentPage={refundablePage} totalPages={totalRefundablePages} hrefForPage={refundableHref} />
        </div>
      </div>

      <div className="card">
        <div className="flex items-baseline justify-between border-b border-navy-100 p-5">
          <h2 className="font-semibold text-navy-900">Recently Refunded</h2>
          <p className="text-sm text-navy-500">
            {refundedCount === 0
              ? "0 refunds"
              : `Showing ${(refundedPage - 1) * REFUNDED_PAGE_SIZE + 1}–${Math.min(refundedPage * REFUNDED_PAGE_SIZE, refundedCount)} of ${refundedCount}`}
          </p>
        </div>
        <div className="divide-y divide-navy-100">
          {refunded.map((o) => (
            <div key={o.id} className="flex items-center justify-between p-4 text-sm">
              <span className="font-medium text-navy-800">{o.orderNumber}</span>
              <span className="text-navy-500">{formatMoney(o.totalMinor, o.currency)}</span>
            </div>
          ))}
          {refunded.length === 0 && <p className="p-4 text-sm text-navy-400">No refunds issued yet.</p>}
        </div>
        <div className="px-5 pb-5">
          <Pagination currentPage={refundedPage} totalPages={totalRefundedPages} hrefForPage={refundedHref} />
        </div>
      </div>
    </div>
  );
}
