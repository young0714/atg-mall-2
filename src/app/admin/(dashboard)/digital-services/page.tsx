import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { StatusBadge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { reloadlyService } from "@/lib/services/reloadlyService";
import { giftCardService } from "@/lib/services/reloadlyGiftCardService";
import { utilityService } from "@/lib/services/reloadlyUtilityService";
import type { Currency } from "@prisma/client";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Digital Services" };
export const dynamic = "force-dynamic";

// Used only when Reloadly's own account-level threshold (set on their
// dashboard, read live via getBalance()) isn't configured — seen live as 0
// on this account. Without a fallback the warning would just never fire
// until the business configures one on Reloadly's side.
const DEFAULT_LOW_BALANCE_THRESHOLD_MINOR = 5000; // $50.00

const PAGE_SIZE = 100;

export default async function AdminDigitalServicesPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_DIGITAL_SERVICES);

  const currentPage = Math.max(1, Math.trunc(Number(searchParams.page)) || 1);

  const [totalCount, orders, recentForFeeSummary, balance] = await Promise.all([
    db.digitalServiceOrder.count(),
    db.digitalServiceOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    // Deliberately its own query, independent of the table's pagination
    // above — the "last 100 orders" fee tile must always mean the same
    // 100 regardless of which page of the table is currently showing.
    db.digitalServiceOrder.findMany({
      orderBy: { createdAt: "desc" },
      select: { status: true, currency: true, feeMinor: true },
      take: 100,
    }),
    reloadlyService.getBalance(),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function pageHref(page: number): string {
    return page > 1 ? `/admin/digital-services?page=${page}` : "/admin/digital-services";
  }

  const lowBalanceThresholdMinor =
    balance?.lowBalanceThresholdMinor && balance.lowBalanceThresholdMinor > 0
      ? balance.lowBalanceThresholdMinor
      : DEFAULT_LOW_BALANCE_THRESHOLD_MINOR;
  const isLowBalance = !!balance && balance.balanceMinor < lowBalanceThresholdMinor;

  // Service fee is ATG's own margin, always in each order's own currency —
  // only meaningful to sum within a single currency, so group rather than
  // add across orders that may be priced in NGN, USD, etc.
  const feeTotalsByCurrency = new Map<Currency, number>();
  for (const order of recentForFeeSummary) {
    if (order.status !== "SUCCESSFUL") continue;
    feeTotalsByCurrency.set(order.currency, (feeTotalsByCurrency.get(order.currency) ?? 0) + order.feeMinor);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy-900">Digital Services</h1>
          <p className="text-sm text-navy-500">
            {reloadlyService.isLive() && giftCardService.isLive() && utilityService.isLive()
              ? "Airtime, gift card, and bill payment orders are processed live via Reloadly, paid from the customer's ATG Wallet."
              : "No live Reloadly credentials are configured for at least one product — orders here may be processed via the mock provider."}
          </p>
          <p className="mt-1 text-sm text-navy-500">
            {totalCount === 0
              ? "0 orders"
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, totalCount)} of ${totalCount} order${totalCount === 1 ? "" : "s"}`}
          </p>
        </div>

        {feeTotalsByCurrency.size > 0 && (
          <div className="rounded-xl2 border border-navy-100 bg-white px-5 py-3 shadow-card">
            <p className="text-[10px] uppercase tracking-wide text-navy-400">Service fee earned (last 100 orders)</p>
            <p className="font-mono text-lg font-bold text-atggreen-600">
              {[...feeTotalsByCurrency.entries()].map(([currency, total]) => formatMoney(total, currency)).join(" + ")}
            </p>
          </div>
        )}

        <div
          className={`rounded-xl2 border px-5 py-3 shadow-card ${
            isLowBalance ? "border-gold-300 bg-gold-50" : "border-navy-100 bg-white"
          }`}
        >
          <p className={`text-[10px] uppercase tracking-wide ${isLowBalance ? "text-gold-700" : "text-navy-400"}`}>
            Reloadly account balance
          </p>
          {balance ? (
            <>
              <p className={`font-mono text-lg font-bold ${isLowBalance ? "text-gold-800" : "text-navy-900"}`}>
                {balance.currencyCode === "USD"
                  ? formatMoney(balance.balanceMinor, "USD")
                  : `${(balance.balanceMinor / 100).toLocaleString()} ${balance.currencyCode}`}
              </p>
              {isLowBalance ? (
                <p className="text-[11px] font-semibold text-gold-700">
                  ⚠ Below your{" "}
                  {balance.lowBalanceThresholdMinor && balance.lowBalanceThresholdMinor > 0 ? "Reloadly-configured" : "default"} warning
                  threshold of {formatMoney(lowBalanceThresholdMinor, "USD")} — fund it via Reloadly&apos;s dashboard soon, or live
                  purchases will start failing.
                </p>
              ) : (
                <p className="text-[11px] text-navy-400">
                  This is the business&apos;s own float with Reloadly — fund it via their dashboard, not ATG&apos;s customer wallets.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-navy-400">
              {reloadlyService.isLive() ? "Couldn't reach Reloadly to check the balance." : "Not available in mock mode."}
            </p>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-3">Customer</th>
              <th className="p-3">Type</th>
              <th className="p-3">Item</th>
              <th className="p-3">Recipient</th>
              <th className="p-3">Charged</th>
              <th className="p-3">Fee</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="p-3">
                  <p className="font-medium text-navy-800">{order.user.fullName}</p>
                  <p className="text-xs text-navy-400">{order.user.email}</p>
                </td>
                <td className="p-3">{order.type.replaceAll("_", " ")}</td>
                <td className="p-3">
                  {order.operatorName} ({order.countryIso})
                </td>
                <td className="p-3 font-mono text-xs">
                  {order.recipientPhone ?? order.recipientEmail ?? order.subscriberAccountNumber}
                  {order.validatedCustomerName && <p className="text-navy-400">{order.validatedCustomerName}</p>}
                </td>
                <td className="p-3 font-mono">{formatMoney(order.amountMinor, order.currency)}</td>
                <td className="p-3 font-mono text-atggreen-600">{formatMoney(order.feeMinor, order.currency)}</td>
                <td className="p-3">
                  <StatusBadge status={order.status} />
                  {order.failureReason && <p className="mt-1 text-xs text-red-500">{order.failureReason}</p>}
                </td>
                <td className="p-3 text-xs text-navy-400">{formatDateTime(order.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && (
          <p className="p-6 text-center text-sm text-navy-400">No digital service orders yet.</p>
        )}
      </div>

      <Pagination currentPage={currentPage} totalPages={totalPages} hrefForPage={pageHref} />
    </div>
  );
}
