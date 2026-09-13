import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { StarRating } from "@/components/shop/StarRating";
import { RatingInput } from "@/components/shop/RatingInput";
import { Field, Input, Textarea } from "@/components/ui/Form";
import { toggleReviewApprovalAction, deleteReviewAction, updateReviewAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Reviews" };
export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_REVIEWS);
  const reviews = await db.review.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: true, product: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-display font-bold text-navy-900">Product Reviews</h1>

      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      {reviews.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">No reviews yet.</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div className="min-w-0">
                  <p className="font-medium text-navy-800">{r.product.name}</p>
                  <p className="text-xs text-navy-400">by {r.user.fullName}</p>
                  <StarRating rating={r.rating} />
                  {r.title && <p className="mt-1 text-sm font-medium text-navy-800">{r.title}</p>}
                  <p className="mt-1 text-sm text-navy-600">{r.body}</p>
                </div>
                <Badge tone={r.isApproved ? "green" : "gold"}>{r.isApproved ? "Approved" : "Hidden"}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-3">
                <form action={toggleReviewApprovalAction}>
                  <input type="hidden" name="reviewId" value={r.id} />
                  <button className="text-xs font-medium text-atgblue-600 hover:underline">{r.isApproved ? "Hide" : "Approve"}</button>
                </form>
                <form action={deleteReviewAction}>
                  <input type="hidden" name="reviewId" value={r.id} />
                  <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                </form>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer text-xs font-medium text-navy-500 hover:text-navy-800">Edit review</summary>
                <form action={updateReviewAction} className="mt-3 space-y-3 border-t border-navy-100 pt-3">
                  <input type="hidden" name="reviewId" value={r.id} />
                  <Field label="Rating" htmlFor={`rating-${r.id}-star-5`}>
                    <RatingInput name="rating" defaultValue={r.rating} idPrefix={`rating-${r.id}`} />
                  </Field>
                  <Field label="Title" htmlFor={`title-${r.id}`}>
                    <Input id={`title-${r.id}`} name="title" defaultValue={r.title ?? ""} maxLength={100} />
                  </Field>
                  <Field label="Body" htmlFor={`body-${r.id}`}>
                    <Textarea id={`body-${r.id}`} name="body" defaultValue={r.body} rows={3} minLength={10} maxLength={2000} required />
                  </Field>
                  <button type="submit" className="btn-primary btn-sm">Save changes</button>
                </form>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
