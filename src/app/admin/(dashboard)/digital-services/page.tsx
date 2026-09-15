import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { StatusBadge } from "@/components/ui/Badge";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { reloadlyService } from "@/lib/services/reloadlyService";
import { giftCardService } from "@/lib/services/reloadlyGiftCardService";
import { utilityService } from "@/lib/services/reloadlyUtilityService";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Digital Services" };
export const dynamic = "force-dynamic";

export default async function AdminDigitalServicesPage() {
  await requirePermission(PERMISSIONS.MANAGE_DIGITAL_SERVICES);
  const [orders, balance] = await Promise.all([
    db.digitalServiceOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { user: true },
      take: 100,
    }),
    reloadlyService.getBalance(),
  ]);

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
        </div>

        <div className="rounded-xl2 border border-navy-100 bg-white px-5 py-3 shadow-card">
          <p className="text-[10px] uppercase tracking-wide text-navy-400">Reloadly account balance</p>
          {balance ? (
            <>
              <p className="font-mono text-lg font-bold text-navy-900">
                {balance.currencyCode === "USD"
                  ? formatMoney(balance.balanceMinor, "USD")
                  : `${(balance.balanceMinor / 100).toLocaleString()} ${balance.currencyCode}`}
              </p>
              <p className="text-[11px] text-navy-400">
                This is the business&apos;s own float with Reloadly — fund it via their dashboard, not ATG&apos;s customer wallets.
              </p>
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
    </div>
  );
}
