import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createHeroImageAction, toggleHeroImageActiveAction, deleteHeroImageAction, updateHeroSettingsAction } from "./actions";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Hero Images" };
export const dynamic = "force-dynamic";

export default async function AdminHeroImagesPage({
  searchParams,
}: {
  searchParams: { created?: string; saved?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const [heroImages, heroSettings] = await Promise.all([
    db.heroImage.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    db.heroSettings.findFirst(),
  ]);
  const slideDurationSeconds = heroSettings?.slideDurationSeconds ?? 5;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Hero Images</h1>
        <p className="text-sm text-navy-500">
          Photos that rotate behind the homepage hero headline. Only enable a photo here once you've looked at it —
          it must have no text or badges baked into the image itself. With none active, the homepage falls back to
          the plain gradient hero.
        </p>
      </div>

      {searchParams.created && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Photo added.</div>}
      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Slide speed updated.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <form action={createHeroImageAction} className="card flex flex-wrap items-end gap-3 p-5">
        <div>
          <label htmlFor="imageFile" className="mb-1 block text-sm font-medium text-navy-700">Add a photo</label>
          <input id="imageFile" name="imageFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif" required className="input" />
        </div>
        <SubmitButton className="btn-primary">Upload</SubmitButton>
      </form>

      <form action={updateHeroSettingsAction} className="card flex flex-wrap items-end gap-3 p-5">
        <div>
          <label htmlFor="slideDurationSeconds" className="mb-1 block text-sm font-medium text-navy-700">Seconds per photo</label>
          <input
            id="slideDurationSeconds"
            name="slideDurationSeconds"
            type="number"
            min={2}
            max={30}
            step={1}
            defaultValue={slideDurationSeconds}
            required
            className="input w-24"
          />
        </div>
        <SubmitButton className="btn-outline">Save speed</SubmitButton>
        <p className="text-xs text-navy-400">How long each photo stays on screen before crossfading to the next (2–30 seconds).</p>
      </form>

      {heroImages.length === 0 ? (
        <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">
          No hero photos yet — the homepage is showing the plain gradient hero.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {heroImages.map((img) => (
            <div key={img.id} className="card overflow-hidden">
              <div className="relative aspect-video w-full bg-sand-100">
                <Image src={img.imageUrl} alt="" fill className="object-cover" />
              </div>
              <div className="flex items-center justify-between gap-2 p-3">
                <Badge tone={img.isActive ? "green" : "neutral"}>{img.isActive ? "Showing" : "Hidden"}</Badge>
                <div className="flex gap-2">
                  <form action={toggleHeroImageActiveAction}>
                    <input type="hidden" name="heroImageId" value={img.id} />
                    <SubmitButton className="text-xs font-medium text-atgblue-600 hover:underline">
                      {img.isActive ? "Hide" : "Show"}
                    </SubmitButton>
                  </form>
                  <form action={deleteHeroImageAction}>
                    <input type="hidden" name="heroImageId" value={img.id} />
                    <SubmitButton className="text-xs font-medium text-red-600 hover:underline">Delete</SubmitButton>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
