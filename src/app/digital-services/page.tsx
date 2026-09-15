import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { walletService } from "@/lib/services/walletService";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { Container, Section } from "@/components/ui/Section";
import { StatusBadge } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Digital Services" };
export const dynamic = "force-dynamic";

export default async function DigitalServicesPage() {
  const user = await requireUser();
  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  const wallet = await walletService.getOrCreateWallet(user.id, profile?.preferredCurrency ?? "NGN");
  const recentOrders = await db.digitalServiceOrder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return (
    <Section className="!py-12">
      <Container className="max-w-2xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-display font-bold text-navy-900">Digital Services</h1>
            <p className="mt-1 text-sm text-navy-500">Paid instantly from your ATG Wallet — no card or bank redirect needed.</p>
          </div>
          <div className="rounded-full border border-navy-100 bg-white px-4 py-2 shadow-card">
            <p className="text-[10px] uppercase tracking-wide text-navy-400">Wallet balance</p>
            <p className="font-mono text-sm font-bold text-navy-900">{formatMoney(wallet.balanceMinor, wallet.currency)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link href="/digital-services/airtime" className="card p-5">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-atgblue-50 text-lg">📱</div>
            <h3 className="font-semibold text-navy-900">Airtime &amp; Data</h3>
            <p className="mt-1 text-xs text-navy-500">Top up any network, in Nigeria, Gambia or abroad.</p>
          </Link>
          <div className="card cursor-not-allowed p-5 opacity-60">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gold-50 text-lg">🎁</div>
            <h3 className="font-semibold text-navy-900">Gift Cards</h3>
            <p className="mt-1 text-xs text-navy-500">Coming soon.</p>
          </div>
          <div className="card cursor-not-allowed p-5 opacity-60">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-atggreen-50 text-lg">🧾</div>
            <h3 className="font-semibold text-navy-900">Pay a Bill</h3>
            <p className="mt-1 text-xs text-navy-500">Coming soon.</p>
          </div>
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-navy-400">Recent purchases</h2>
          <div className="card">
            {recentOrders.length === 0 ? (
              <p className="p-5 text-sm text-navy-400">No digital purchases yet.</p>
            ) : (
              <div className="divide-y divide-navy-100">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-navy-800">
                        {order.operatorName} — {order.recipientPhone}
                      </p>
                      <p className="text-xs text-navy-400">{formatDateTime(order.createdAt)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm font-semibold text-navy-800">{formatMoney(order.amountMinor, order.currency)}</p>
                      <StatusBadge status={order.status} className="text-[10px]" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Container>
    </Section>
  );
}
