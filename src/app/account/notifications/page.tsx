import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/utils";
import { markAllNotificationsReadAction, markNotificationReadAction } from "./actions";
import type { Metadata } from "next";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata: Metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy-900">Notifications</h1>
          <p className="mt-1 text-sm text-navy-500">Updates on your orders, packages, shipments and support requests.</p>
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsReadAction}>
            <SubmitButton className="btn-outline btn-sm">Mark all as read</SubmitButton>
          </form>
        )}
      </div>

      <div className="card">
        {notifications.length === 0 ? (
          <p className="p-5 text-sm text-navy-400">No notifications yet.</p>
        ) : (
          <div className="divide-y divide-navy-100">
            {notifications.map((n) => (
              <div key={n.id} className={`flex items-start justify-between gap-3 p-4 ${n.isRead ? "" : "bg-sand-50"}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold-500" aria-hidden />}
                    <p className="truncate text-sm font-medium text-navy-800">{n.title}</p>
                  </div>
                  <p className="mt-0.5 text-sm text-navy-600">{n.body}</p>
                  <p className="mt-1 text-xs text-navy-400">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.isRead && (
                  <form action={markNotificationReadAction} className="shrink-0">
                    <input type="hidden" name="notificationId" value={n.id} />
                    <SubmitButton className="text-xs font-medium text-navy-500 hover:text-navy-800">
                      Mark as read
                    </SubmitButton>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
