import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { StatusBadge } from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Shop For Me Requests" };
export const dynamic = "force-dynamic";

export default async function ShopForMeRequestsPage({
  searchParams,
}: {
  searchParams: { submitted?: string };
}) {
  const user = await requireUser();
  const requests = await db.shopForMeRequest.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { quotations: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold text-navy-900">Shop For Me Requests</h1>
        <Link href="/shop-for-me" className="btn-primary btn-sm">New Request</Link>
      </div>

      {searchParams.submitted && (
        <div className="mt-4 rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">
          Request submitted! Our team will review it and send you a quotation.
        </div>
      )}

      {requests.length === 0 ? (
        <div className="mt-8 rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
          You haven&apos;t submitted a Shop for Me request yet.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="card flex gap-4 p-4">
              {req.productImageUrl && (
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-sand-100">
                  <Image src={req.productImageUrl} alt={req.productName} fill className="object-cover" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-navy-800">{req.productName}</p>
                  <StatusBadge status={req.status} />
                </div>
                <p className="text-xs text-navy-400">Qty {req.quantity} · Submitted {formatDate(req.createdAt)}</p>
                {req.quotations.length > 0 && (
                  <Link href="/account/quotations" className="mt-1 inline-block text-xs font-medium text-atgblue-600 underline">
                    View quotation →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
