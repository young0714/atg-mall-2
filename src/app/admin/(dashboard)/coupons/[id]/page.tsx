import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { CouponForm } from "../CouponForm";
import { updateCouponAction } from "../actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Edit coupon" };
export const dynamic = "force-dynamic";

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : "");

export default async function AdminEditCouponPage({ params, searchParams }: { params: { id: string }; searchParams: { error?: string } }) {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);
  const c = await db.coupon.findUnique({ where: { id: params.id }, include: { _count: { select: { redemptions: true } } } });
  if (!c) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/coupons" className="text-sm text-atgblue-700 underline">← All coupons</Link>
        <h1 className="mt-1 text-2xl font-display font-bold text-navy-900">Edit {c.code}</h1>
        <p className="text-sm text-navy-500">
          Used {c._count.redemptions} time{c._count.redemptions === 1 ? "" : "s"}. Changes apply to future orders only; orders already placed keep their discount.
        </p>
      </div>
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}
      <div className="card p-5">
        <CouponForm
          action={updateCouponAction}
          submitLabel="Save changes"
          initial={{
            id: c.id,
            code: c.code,
            percentOff: c.percentOff,
            windowType: c.windowType,
            startsAt: iso(c.startsAt),
            endsAt: iso(c.endsAt),
            daysAfterSignup: c.daysAfterSignup ?? 14,
            maxRedemptions: c.maxRedemptions ?? 0,
            isActive: c.isActive,
          }}
        />
      </div>
    </div>
  );
}
