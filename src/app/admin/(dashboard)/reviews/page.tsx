import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/shop/StarRating";
import { toggleReviewApprovalAction, deleteReviewAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Reviews" };
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requirePermission(PERMISSIONS.MANAGE_REVIEWS);
  const reviews = await db.review.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, product: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-navy-900">Product Reviews</h1>

      {reviews.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">No reviews yet.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-navy-800">{r.product.name}</p>
                  <p className="text-xs text-navy-400">by {r.user.fullName}</p>
                  <StarRating rating={r.rating} />
                  <p className="mt-1 text-sm text-navy-600">{r.body}</p>
                </div>
                <Badge tone={r.isApproved ? "green" : "gold"}>{r.isApproved ? "Approved" : "Hidden"}</Badge>
              </div>
              <div className="mt-2 flex gap-3">
                <form action={toggleReviewApprovalAction}>
                  <input type="hidden" name="reviewId" value={r.id} />
                  <button className="text-xs font-medium text-atgblue-600 hover:underline">{r.isApproved ? "Hide" : "Approve"}</button>
                </form>
                <form action={deleteReviewAction}>
                  <input type="hidden" name="reviewId" value={r.id} />
                  <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
