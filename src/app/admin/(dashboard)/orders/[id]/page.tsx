import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/ui/Badge";
import { StatusTimeline } from "@/components/tracking/StatusTimeline";
import { Select } from "@/components/ui/Form";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_FLOW } from "@/lib/constants";
import { updateOrderStatusAction } from "../actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Order Detail" };
export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  await requirePermission(PERMISSIONS.MANAGE_ORDERS);

  const order = await db.order.findUnique({
    where: { id: params.id },
    include: {
      user: true,
      address: true,
      items: true,
      payments: true,
      packages: true,
      trackingEvents: { orderBy: { occurredAt: "desc" } },
    },
  });
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy-900">{order.orderNumber}</h1>
          <p className="text-sm text-navy-500">{order.user.fullName} · {order.user.email}</p>
        </div>
        <StatusBadge status={order.status} className="text-sm" />
      </div>

      <form action={updateOrderStatusAction} className="card flex flex-wrap items-center gap-3 p-4">
        <input type="hidden" name="orderId" value={order.id} />
        <label className="text-sm font-medium text-navy-700">Update status:</label>
        <Select name="status" defaultValue={order.status} className="w-auto">
          {ORDER_STATUS_FLOW.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
          <option value="CANCELLED">CANCELLED</option>
          <option value="REFUNDED">REFUNDED</option>
        </Select>
        <button type="submit" className="btn-primary btn-sm">Update</button>
      </form>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">Items</h2>
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between border-b border-navy-50 py-2 text-sm last:border-0">
                <span>{item.nameSnapshot} × {item.quantity}</span>
                <span className="font-medium">{formatMoney(item.unitPriceMinor * item.quantity, item.currency)}</span>
              </div>
            ))}
          </div>
          <div className="card p-5">
            <h2 className="mb-4 font-semibold text-navy-900">Timeline</h2>
            <StatusTimeline events={order.trackingEvents} />
          </div>
        </div>
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="mb-2 font-semibold text-navy-900">Cost</h2>
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatMoney(order.subtotalMinor, order.currency)}</dd></div>
              <div className="flex justify-between"><dt>Service fee</dt><dd>{formatMoney(order.serviceFeeMinor, order.currency)}</dd></div>
              <div className="flex justify-between"><dt>Intl shipping</dt><dd>{formatMoney(order.intlShippingMinor, order.currency)}</dd></div>
              <div className="flex justify-between font-bold"><dt>Total</dt><dd>{formatMoney(order.totalMinor, order.currency)}</dd></div>
            </dl>
          </div>
          {order.address && (
            <div className="card p-5">
              <h2 className="mb-2 font-semibold text-navy-900">Delivery Address</h2>
              <p className="text-sm text-navy-600">{order.address.fullName}<br />{order.address.addressLine1}, {order.address.city}<br />{order.address.phone}</p>
            </div>
          )}
          {order.payments.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-2 font-semibold text-navy-900">Payments</h2>
              {order.payments.map((p) => (
                <div key={p.id} className="flex justify-between text-sm"><span>{p.method}</span><StatusBadge status={p.status} /></div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
