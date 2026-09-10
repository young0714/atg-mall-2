import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { walletService } from "@/lib/services/walletService";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { Field, Input, Select } from "@/components/ui/Form";
import { depositToWalletAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Wallet" };
export const dynamic = "force-dynamic";

export default async function WalletPage({
  searchParams,
}: {
  searchParams: { deposited?: string; error?: string };
}) {
  const user = await requireUser();
  const profile = await db.customerProfile.findUnique({ where: { userId: user.id } });
  const wallet = await walletService.getOrCreateWallet(user.id, profile?.preferredCurrency ?? "NGN");
  const transactions = await db.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">ATG Wallet</h1>
        <p className="mt-1 text-sm text-navy-500">Fund your wallet to pay for orders instantly, with a full transaction ledger.</p>
      </div>

      {searchParams.deposited && (
        <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Deposit successful!</div>
      )}
      {searchParams.error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="card">
          <div className="border-b border-navy-100 p-5">
            <h2 className="font-semibold text-navy-900">Transaction History</h2>
          </div>
          {transactions.length === 0 ? (
            <p className="p-5 text-sm text-navy-400">No transactions yet.</p>
          ) : (
            <div className="divide-y divide-navy-100">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium text-navy-800">{tx.description}</p>
                    <p className="text-xs text-navy-400">{formatDateTime(tx.createdAt)} · {tx.type}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${tx.amountMinor >= 0 ? "text-atggreen-600" : "text-red-600"}`}>
                      {tx.amountMinor >= 0 ? "+" : ""}{formatMoney(tx.amountMinor, tx.currency)}
                    </p>
                    <p className="text-xs text-navy-400">Balance: {formatMoney(tx.balanceAfterMinor, tx.currency)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-5 text-center">
            <p className="text-xs uppercase tracking-wide text-navy-400">Available Balance</p>
            <p className="mt-1 text-3xl font-display font-bold text-atggreen-600">
              {formatMoney(wallet.balanceMinor, wallet.currency)}
            </p>
          </div>

          <form action={depositToWalletAction} className="card space-y-3 p-5">
            <h3 className="font-semibold text-navy-900">Deposit Funds</h3>
            <Field label={`Amount (${wallet.currency})`} htmlFor="amountMinor" required>
              <Input id="amountMinor" name="amountMinor" type="number" min={1} step="0.01" required placeholder="5000" />
            </Field>
            <Field label="Method" htmlFor="method" required>
              <Select id="method" name="method" required>
                <option value="CARD">Card (mock)</option>
                <option value="BANK_TRANSFER">Bank Transfer (mock)</option>
              </Select>
            </Field>
            <button type="submit" className="btn-primary w-full">Deposit</button>
            <p className="text-center text-[11px] text-navy-400">
              No real payment gateway is connected yet — deposits are simulated for demo purposes.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
