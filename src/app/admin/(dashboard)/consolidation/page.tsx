import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { markConsolidationReadyAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Consolidation" };
export const dynamic = "force-dynamic";

export default async function AdminConsolidationPage() {
  await requirePermission(PERMISSIONS.MANAGE_CONSOLIDATION);

  const consolidations = await db.consolidation.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, packages: { include: { package: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Consolidation</h1>
        <p className="text-sm text-navy-500">Customer-requested groupings of packages awaiting shipment.</p>
      </div>

      <div className="space-y-4">
        {consolidations.map((c) => (
          <div key={c.id} className="card p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-navy-800">{c.code}</p>
                <p className="text-xs text-navy-400">{c.user.fullName} · {formatDate(c.createdAt)}</p>
              </div>
              <Badge tone={c.status === "CLOSED" ? "green" : "gold"}>{c.status}</Badge>
            </div>
            <ul className="mt-3 space-y-1 text-sm text-navy-600">
              {c.packages.map((link) => (
                <li key={link.id}>{link.package.packageCode} — {link.package.weightGrams ? `${(link.package.weightGrams / 1000).toFixed(2)}kg` : "weight pending"}</li>
              ))}
            </ul>
            {c.status === "OPEN" && (
              <form action={markConsolidationReadyAction} className="mt-3">
                <input type="hidden" name="consolidationId" value={c.id} />
                <button className="btn-outline btn-sm">Mark Ready to Ship</button>
              </form>
            )}
          </div>
        ))}
        {consolidations.length === 0 && (
          <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
            No consolidation requests yet.
          </div>
        )}
      </div>
    </div>
  );
}
