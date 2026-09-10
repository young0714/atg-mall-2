import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Field, Input, Select } from "@/components/ui/Form";
import { formatMoney } from "@/lib/money";
import { adjustWalletAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Wallets" };
export const dynamic = "force-dynamic";

export default async function AdminWalletsPage({
  searchParams,
}: {
  searchParams: { adjusted?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_WALLETS);

  const wallets = await db.wallet.findMany({ orderBy: { balanceMinor: "desc" }, include: { user: true } });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-navy-900">Wallets</h1>

      {searchParams.adjusted && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Wallet adjusted.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <form action={adjustWalletAction} className="card grid gap-4 p-5 sm:grid-cols-4">
        <Field label="Customer" htmlFor="userId" required>
          <Select id="userId" name="userId" required>
            {wallets.map((w) => <option key={w.userId} value={w.userId}>{w.user.fullName}</option>)}
          </Select>
        </Field>
        <Field label="Amount (+/-)" htmlFor="amount" required hint="Positive to credit, negative to debit">
          <Input id="amount" name="amount" type="number" step="0.01" required />
        </Field>
        <Field label="Reason" htmlFor="reason" required>
          <Input id="reason" name="reason" required />
        </Field>
        <div className="flex items-end">
          <button type="submit" className="btn-primary w-full">Apply Adjustment</button>
        </div>
      </form>

      <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
        <table className="w-full min-w-[500px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr><th className="p-3">Customer</th><th className="p-3">Balance</th></tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {wallets.map((w) => (
              <tr key={w.id}>
                <td className="p-3 font-medium text-navy-800">{w.user.fullName}</td>
                <td className="p-3 text-navy-700">{formatMoney(w.balanceMinor, w.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
