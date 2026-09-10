import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Audit Log" };
export const dynamic = "force-dynamic";

const ACTION_TONE: Record<string, "green" | "gold" | "red" | "blue" | "neutral"> = {
  ORDER_REFUNDED: "red",
  ORDER_STATUS_CHANGED: "blue",
  WALLET_ADJUSTED: "gold",
  PRODUCT_CREATED: "green",
  PRODUCT_UPDATED: "blue",
  DELIVERY_ZONE_SAVED: "neutral",
};

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  await requirePermission(PERMISSIONS.VIEW_AUDIT_LOG);

  const pageSize = 50;
  const page = Math.max(1, Number(searchParams.page) || 1);

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      include: { actor: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.auditLog.count(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Audit Log</h1>
        <p className="text-sm text-navy-500">
          A record of sensitive staff actions across ATG Mall — status overrides, refunds, wallet adjustments and
          configuration changes. Every entry records who did what and when, and cannot be edited from this screen.
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
          No audit events recorded yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl2 border border-navy-100 bg-white">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
              <tr>
                <th className="p-3">When</th>
                <th className="p-3">Actor</th>
                <th className="p-3">Action</th>
                <th className="p-3">Entity</th>
                <th className="p-3">Summary</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap p-3 text-navy-500">{formatDateTime(log.createdAt)}</td>
                  <td className="p-3 text-navy-700">{log.actor?.fullName ?? "System"}</td>
                  <td className="p-3">
                    <Badge tone={ACTION_TONE[log.action] ?? "neutral"}>{log.action.replaceAll("_", " ")}</Badge>
                  </td>
                  <td className="p-3 text-navy-500">
                    {log.entityType} · <span className="font-mono text-xs">{log.entityId}</span>
                  </td>
                  <td className="p-3 text-navy-600">{log.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-navy-500">
          <span>
            Page {page} of {totalPages} ({total} events)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a className="btn-outline btn-sm" href={`/admin/audit-log?page=${page - 1}`}>
                Previous
              </a>
            )}
            {page < totalPages && (
              <a className="btn-outline btn-sm" href={`/admin/audit-log?page=${page + 1}`}>
                Next
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
