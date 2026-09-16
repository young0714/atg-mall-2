import Link from "next/link";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@prisma/client";

export function WelcomeBack({
  firstName,
  wallet,
  recentOrder,
}: {
  firstName: string;
  wallet: { balanceMinor: number; currency: Currency } | null;
  recentOrder: { orderNumber: string } | null;
}) {
  return (
    <section className="relative overflow-hidden bg-navy-gradient text-white">
      <div className="absolute inset-0 opacity-20" aria-hidden>
        <svg width="100%" height="100%" viewBox="0 0 800 500" preserveAspectRatio="none">
          <path d="M0 400 C 200 300, 300 450, 500 350 S 800 250, 800 250" stroke="white" strokeWidth="1.5" fill="none" />
          <path d="M0 300 C 200 200, 300 350, 500 250 S 800 150, 800 150" stroke="white" strokeWidth="1" fill="none" />
        </svg>
      </div>
      <div className="container-atg relative py-12 sm:py-16">
        <h1 className="text-3xl font-display font-extrabold text-white sm:text-4xl">
          Welcome back, {firstName}
        </h1>

        <div className="mt-6 flex flex-wrap items-stretch gap-3">
          {wallet && (
            <div className="flex items-center gap-4 rounded-xl2 bg-white/10 px-5 py-4 backdrop-blur-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wide text-navy-300">Wallet balance</p>
                <p className="font-display text-xl font-bold text-white">{formatMoney(wallet.balanceMinor, wallet.currency)}</p>
              </div>
              <Link href="/account/wallet/send" className="btn-gold whitespace-nowrap">
                Send
              </Link>
            </div>
          )}

          {recentOrder && (
            <Link
              href="/account/orders"
              className="flex items-center gap-2 rounded-xl2 bg-white/10 px-5 py-4 text-sm text-navy-100 backdrop-blur-sm hover:bg-white/15"
            >
              📦 Order <span className="font-semibold text-white">{recentOrder.orderNumber}</span> is on its way →
            </Link>
          )}

          <Link
            href="/shop"
            className="flex items-center gap-2 rounded-xl2 bg-white/10 px-5 py-4 text-sm text-navy-100 backdrop-blur-sm hover:bg-white/15"
          >
            🔍 Search the catalog →
          </Link>
        </div>
      </div>
    </section>
  );
}
