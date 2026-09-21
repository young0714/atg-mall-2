import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Field, Input, Select } from "@/components/ui/Form";
import { Pagination } from "@/components/ui/Pagination";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/utils";
import { adjustWalletAction, reverseWalletTransferAction } from "./actions";
import type { Prisma } from "@prisma/client";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "Admin — Wallets" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;
const WALLET_LIST_LIMIT = 20;

export default async function AdminWalletsPage({
  searchParams,
}: {
  searchParams: { adjusted?: string; reversed?: string; error?: string; page?: string; q?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_WALLETS);

  const currentPage = Math.max(1, Math.trunc(Number(searchParams.page)) || 1);
  const q = searchParams.q?.trim();

  // The balances table (and the "Customer" picker above it, which shares
  // this same result) never loads every wallet — that was both an
  // unbounded query and an unusable multi-thousand-option <select>.
  // Instead: top 20 by balance with nothing typed, or top 20 matches once
  // an admin searches by name/email — never both a full list AND a search.
  const walletWhere: Prisma.WalletWhereInput | undefined = q
    ? { user: { OR: [{ fullName: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } }
    : undefined;

  const [totalWalletCount, matchingWalletCount, wallets, transferCount, transfers] = await Promise.all([
    db.wallet.count(),
    db.wallet.count({ where: walletWhere }),
    db.wallet.findMany({ where: walletWhere, orderBy: { balanceMinor: "desc" }, include: { user: true }, take: WALLET_LIST_LIMIT }),
    db.walletTransfer.count(),
    db.walletTransfer.findMany({
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { sender: true, recipient: true, reversedBy: true },
    }),
  ]);
  const totalTransferPages = Math.max(1, Math.ceil(transferCount / PAGE_SIZE));

  const walletListHint = !q
    ? `Showing top ${wallets.length} of ${totalWalletCount} customers by balance.`
    : matchingWalletCount === 0
      ? `No customers match "${q}".`
      : matchingWalletCount > WALLET_LIST_LIMIT
        ? `Filtered to "${q}" — ${matchingWalletCount} matches, showing the top ${wallets.length}. Narrow your search further to see a specific one.`
        : `Filtered to "${q}" — narrows both the picker above and the table below.`;

  function pageHref(page: number): string {
    return page > 1 ? `/admin/wallets?page=${page}` : "/admin/wallets";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-navy-900">Wallets</h1>

      {searchParams.adjusted && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Wallet adjusted.</div>}
      {searchParams.reversed && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Transfer reversed.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <form method="GET" className="max-w-sm">
        <Field label="Search customer" htmlFor="q">
          <Input id="q" name="q" type="search" placeholder="Name or email..." defaultValue={q} />
        </Field>
      </form>
      <p className="-mt-3 text-xs text-navy-400">{walletListHint}</p>

      <form action={adjustWalletAction} className="card grid grid-cols-1 gap-4 p-5 sm:grid-cols-4">
        <Field label="Customer" htmlFor="userId" required>
          <Select id="userId" name="userId" required>
            {wallets.length === 0 ? (
              <option disabled>No matches</option>
            ) : (
              wallets.map((w) => <option key={w.userId} value={w.userId}>{w.user.fullName}</option>)
            )}
          </Select>
        </Field>
        <Field label="Amount (+/-)" htmlFor="amount" required hint="Positive to credit, negative to debit">
          <Input id="amount" name="amount" type="number" step="0.01" required />
        </Field>
        <Field label="Reason" htmlFor="reason" required>
          <Input id="reason" name="reason" required />
        </Field>
        <div className="flex items-end">
          <SubmitButton className="btn-primary w-full">Apply Adjustment</SubmitButton>
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
        {wallets.length === 0 && <p className="p-6 text-center text-sm text-navy-400">No customers match &quot;{q}&quot;.</p>}
      </div>

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-navy-900">Wallet Transfers</h2>
          <p className="text-sm text-navy-500">
            {transferCount === 0
              ? "0 transfers"
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, transferCount)} of ${transferCount}`}
          </p>
        </div>
        <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
              <tr>
                <th className="p-3">From</th>
                <th className="p-3">To</th>
                <th className="p-3">Amount</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Reverse</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {transfers.map((t) => (
                <tr key={t.id}>
                  <td className="p-3 font-medium text-navy-800">{t.sender.fullName}</td>
                  <td className="p-3 font-medium text-navy-800">{t.recipient.fullName}</td>
                  <td className="p-3 font-mono">{formatMoney(t.amountMinor, t.currency)}</td>
                  <td className="p-3 text-xs text-navy-400">{formatDateTime(t.createdAt)}</td>
                  <td className="p-3">
                    {t.status === "REVERSED" ? (
                      <div>
                        <span className="rounded-full bg-navy-100 px-2 py-0.5 text-xs font-medium text-navy-600">Reversed</span>
                        {t.reversedBy && <p className="mt-1 text-xs text-navy-400">by {t.reversedBy.fullName}</p>}
                        {t.reversalReason && <p className="text-xs text-navy-400">{t.reversalReason}</p>}
                      </div>
                    ) : (
                      <span className="rounded-full bg-atggreen-50 px-2 py-0.5 text-xs font-medium text-atggreen-700">Completed</span>
                    )}
                  </td>
                  <td className="p-3">
                    {t.status === "COMPLETED" && (
                      <form action={reverseWalletTransferAction} className="flex items-center gap-1.5">
                        <input type="hidden" name="transferId" value={t.id} />
                        <input
                          type="text"
                          name="reason"
                          placeholder="Reason"
                          required
                          className="w-28 rounded-lg border border-navy-200 px-2 py-1 text-xs"
                        />
                        <SubmitButton className="btn-outline btn-sm">Reverse</SubmitButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transfers.length === 0 && <p className="p-6 text-center text-sm text-navy-400">No wallet transfers yet.</p>}
        </div>
        <Pagination currentPage={currentPage} totalPages={totalTransferPages} hrefForPage={pageHref} />
      </div>
    </div>
  );
}
