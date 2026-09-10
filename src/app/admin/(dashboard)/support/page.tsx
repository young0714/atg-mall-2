import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { StatusBadge } from "@/components/ui/Badge";
import { Textarea } from "@/components/ui/Form";
import { replyToTicketAction, resolveTicketAction } from "./actions";
import { formatDateTime } from "@/lib/utils";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Support" };
export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  await requirePermission(PERMISSIONS.MANAGE_SUPPORT);

  const tickets = await db.supportTicket.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      assignee: true,
      messages: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });

  const open = tickets.filter((t) => t.status !== "RESOLVED" && t.status !== "CLOSED");
  const closed = tickets.filter((t) => t.status === "RESOLVED" || t.status === "CLOSED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-navy-900">Support Tickets</h1>
        <p className="text-sm text-navy-500">
          {open.length} open · {closed.length} resolved
        </p>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
          No support tickets yet.
        </div>
      ) : (
        <div className="space-y-4">
          {[...open, ...closed].map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-navy-800">{t.subject}</p>
                  <p className="text-xs text-navy-400">
                    {t.ticketNumber} · {t.customer.fullName} ({t.customer.email}) · {formatDateTime(t.createdAt)}
                  </p>
                  {t.assignee && (
                    <p className="text-xs text-navy-400">Assigned to {t.assignee.fullName}</p>
                  )}
                </div>
                <StatusBadge status={t.status} />
              </div>

              <div className="mt-3 space-y-2 border-t border-navy-100 pt-3">
                {t.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg p-3 text-sm ${
                      m.authorId === t.customerId ? "bg-navy-50 text-navy-700" : "bg-atgblue-50 text-navy-800"
                    }`}
                  >
                    <p className="mb-1 text-xs font-semibold text-navy-500">
                      {m.author.fullName} · {formatDateTime(m.createdAt)}
                    </p>
                    <p>{m.body}</p>
                  </div>
                ))}
              </div>

              {t.status !== "RESOLVED" && t.status !== "CLOSED" && (
                <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <form action={replyToTicketAction} className="flex gap-2">
                    <input type="hidden" name="ticketId" value={t.id} />
                    <Textarea name="body" placeholder="Type a reply…" rows={2} className="flex-1" required />
                    <button type="submit" className="btn-primary self-end">
                      Reply
                    </button>
                  </form>
                  <form action={resolveTicketAction}>
                    <input type="hidden" name="ticketId" value={t.id} />
                    <button type="submit" className="btn-outline w-full sm:w-auto">
                      Mark Resolved
                    </button>
                  </form>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
