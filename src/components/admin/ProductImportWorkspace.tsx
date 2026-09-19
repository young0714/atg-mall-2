"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { formatMoney } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ImportableProduct, ImportSource } from "@/lib/services/importTypes";
import {
  searchCjProductsAction,
  lookupProductAction,
  importBatchAction,
  saveImportDraftAction,
  removeImportDraftAction,
  type ImportDraftInput,
  type ImportBatchResult,
  type PersistedDraft,
} from "@/app/admin/(dashboard)/product-import/actions";

/**
 * DSer-style batch-staging import UI, shared by the CJ and AliExpress admin
 * import pages. Browse/find products, open one at a time to price it, trim
 * its variants/images, and "Save to batch" — nothing is written to the ATG
 * catalog yet. Repeat across as many products as you like, then "Import All
 * Saved" commits the whole batch in one go.
 *
 * Every "Save to Batch" persists immediately via saveImportDraftAction, so
 * the batch survives leaving the page — `batch` here is a client-side
 * mirror of that server state, not the source of truth. Only the item
 * currently open in the edit panel holds the full ImportableProduct (fresh
 * images/variants); the sidebar list only needs the lightweight fields
 * already on Draft, so reopening the page never re-fetches every staged
 * item from the supplier — only the one being edited.
 */

interface Draft {
  draftId: string | null; // null until the first successful save assigns a real id
  source: ImportSource;
  externalId: string;
  thumbnailUrl: string;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  basePriceMinorText: string;
  weightGramsText: string;
  importVariants: boolean;
  includeVideo: boolean;
  isFeatured: boolean;
  removedImages: Set<string>;
  removedVariantIds: Set<string>;
  // externalId -> price, minor units as text (same convention as
  // basePriceMinorText). Defaulted from the supplier's own per-variant
  // price — see ImportableVariant.supplierPriceMinorUsd — so a variant that
  // genuinely costs more at the supplier starts out priced higher than the
  // base, instead of every variant flattening to the same price. Purely a
  // starting point: edit any of these freely, same as the base price.
  variantPrices: Record<string, string>;
}

function draftFromProduct(product: ImportableProduct, defaultCategoryId: string): Draft {
  return {
    draftId: null,
    source: product.source,
    externalId: product.externalId,
    thumbnailUrl: product.imageUrl,
    name: product.name,
    slug: slugify(product.name),
    categoryId: defaultCategoryId,
    description: product.description ?? "",
    basePriceMinorText: String(product.suggestedPriceMinorUsd || 0),
    weightGramsText: String(product.weightGrams ?? 500),
    importVariants: product.variants.length > 0,
    includeVideo: !!product.videoUrl,
    isFeatured: false,
    removedImages: new Set(),
    removedVariantIds: new Set(),
    variantPrices: Object.fromEntries(product.variants.map((v) => [v.externalId, String(v.supplierPriceMinorUsd || 0)])),
  };
}

function draftFromPersisted(p: PersistedDraft): Draft {
  return {
    draftId: p.draftId,
    source: p.source,
    externalId: p.externalId,
    thumbnailUrl: p.thumbnailUrl,
    name: p.name,
    slug: p.slug,
    categoryId: p.categoryId,
    description: p.description,
    basePriceMinorText: p.basePriceMinorText,
    weightGramsText: p.weightGramsText,
    importVariants: p.importVariants,
    includeVideo: p.includeVideo,
    isFeatured: p.isFeatured,
    removedImages: new Set(p.removedImageUrls),
    removedVariantIds: new Set(p.removedVariantExternalIds),
    variantPrices: p.variantPrices,
  };
}

export function ProductImportWorkspace({
  source,
  categories,
  initialBatch,
}: {
  source: ImportSource;
  categories: { id: string; name: string }[];
  initialBatch: PersistedDraft[];
}) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ImportableProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);

  const [editing, setEditing] = useState<{ draft: Draft; product: ImportableProduct } | null>(null);
  const [saving, setSaving] = useState(false);
  const [openingDraftId, setOpeningDraftId] = useState<string | null>(null);
  const [batch, setBatch] = useState<Draft[]>(() => initialBatch.map(draftFromPersisted));
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportBatchResult | null>(null);

  const defaultCategoryId = categories[0]?.id ?? "";

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setFindError(null);
    try {
      const results = await searchCjProductsAction(query);
      setSearchResults(results);
    } catch (e) {
      setFindError(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  }

  async function openForEditing(idOrQuery: string) {
    setLookingUp(true);
    setFindError(null);
    try {
      const res = await lookupProductAction(source, idOrQuery);
      if (!res.ok) {
        setFindError(res.error);
        return;
      }
      setEditing({ draft: draftFromProduct(res.product, defaultCategoryId), product: res.product });
    } finally {
      setLookingUp(false);
    }
  }

  /** Re-fetches full product detail before reopening an already-staged batch item — the sidebar only keeps the lightweight fields, never the full image/variant list. */
  async function editBatchItem(draft: Draft) {
    setOpeningDraftId(draft.draftId);
    setFindError(null);
    try {
      const res = await lookupProductAction(draft.source, draft.externalId);
      if (!res.ok) {
        setFindError(res.error);
        return;
      }
      setEditing({ draft, product: res.product });
    } finally {
      setOpeningDraftId(null);
    }
  }

  async function saveDraftToBatch(draft: Draft, product: ImportableProduct) {
    setSaving(true);
    try {
      const result = await saveImportDraftAction({
        draftId: draft.draftId,
        source: draft.source,
        externalId: draft.externalId,
        thumbnailUrl: product.imageUrl,
        name: draft.name,
        slug: draft.slug,
        categoryId: draft.categoryId,
        description: draft.description,
        basePriceMinorText: draft.basePriceMinorText,
        weightGramsText: draft.weightGramsText,
        importVariants: draft.importVariants,
        includeVideo: draft.includeVideo,
        isFeatured: draft.isFeatured,
        removedImageUrls: Array.from(draft.removedImages),
        removedVariantExternalIds: Array.from(draft.removedVariantIds),
        variantPrices: draft.variantPrices,
      });
      const saved: Draft = { ...draft, draftId: result.draftId, thumbnailUrl: product.imageUrl };
      setBatch((prev) => {
        const withoutThis = prev.filter((d) => d.draftId !== saved.draftId);
        return [...withoutThis, saved];
      });
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function removeFromBatch(draftId: string | null) {
    if (!draftId) return;
    setBatch((prev) => prev.filter((d) => d.draftId !== draftId));
    await removeImportDraftAction(draftId);
  }

  async function handleImportAll() {
    if (batch.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const inputs: ImportDraftInput[] = batch
        .filter((d): d is Draft & { draftId: string } => d.draftId !== null)
        .map((d) => ({
          draftId: d.draftId,
          source: d.source,
          externalId: d.externalId,
          name: d.name,
          slug: d.slug,
          categoryId: d.categoryId,
          description: d.description,
          basePriceMinor: Number(d.basePriceMinorText),
          weightGrams: Number(d.weightGramsText),
          importVariants: d.importVariants,
          includeVideo: d.includeVideo,
          isFeatured: d.isFeatured,
          removedImageUrls: Array.from(d.removedImages),
          removedVariantExternalIds: Array.from(d.removedVariantIds),
          variantPrices: Object.fromEntries(Object.entries(d.variantPrices).map(([id, text]) => [id, Number(text)])),
        }));
      const result = await importBatchAction(inputs);
      setImportResult(result);
      const succeededIds = new Set(result.succeeded.map((s) => s.draftId));
      setBatch((prev) => prev.filter((d) => !(d.draftId && succeededIds.has(d.draftId))));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {editing ? (
          <EditPanel
            draft={editing.draft}
            product={editing.product}
            categories={categories}
            saving={saving}
            onChange={(d) => setEditing({ draft: d, product: editing.product })}
            onSave={() => saveDraftToBatch(editing.draft, editing.product)}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            {source === "CJ" ? (
              <form onSubmit={handleSearch} className="card flex gap-3 p-4">
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search CJ's catalog, e.g. 'wireless earbuds'" className="flex-1" />
                <button type="submit" disabled={searching} className="btn-primary">
                  {searching ? "Searching…" : "Search"}
                </button>
              </form>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (query.trim()) openForEditing(query.trim());
                }}
                className="card flex gap-3 p-4"
              >
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Paste an AliExpress product link or ID, e.g. https://www.aliexpress.com/item/1005001234567890.html"
                  className="flex-1"
                />
                <button type="submit" disabled={lookingUp} className="btn-primary shrink-0">
                  {lookingUp ? "Fetching…" : "Fetch Product"}
                </button>
              </form>
            )}

            {findError && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{findError}</div>}

            {source === "CJ" && searchResults.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {searchResults.map((p) => (
                  <div key={p.externalId} className="card flex flex-col overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element -- external supplier CDN */}
                    <img src={p.imageUrl} alt={p.name} className="aspect-square w-full object-cover" />
                    <div className="flex flex-1 flex-col gap-1.5 p-4">
                      <h3 className="line-clamp-2 text-sm font-semibold text-navy-900">{p.name}</h3>
                      <p className="text-xs text-navy-400">{p.categoryNameHint ?? "Uncategorized"}</p>
                      <p className="text-base font-display font-bold text-navy-900">
                        {formatMoney(p.suggestedPriceMinorUsd, "USD")} <span className="text-xs font-normal text-navy-400">/ unit (cost)</span>
                      </p>
                      <button
                        onClick={() => openForEditing(p.externalId)}
                        disabled={lookingUp}
                        className="btn-primary btn-sm mt-auto"
                      >
                        {lookingUp ? "Loading…" : "Edit & Stage"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {importResult && (
          <div className="space-y-2">
            {importResult.succeeded.length > 0 && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
                Imported {importResult.succeeded.length} product{importResult.succeeded.length === 1 ? "" : "s"}:{" "}
                {importResult.succeeded.map((s) => s.name).join(", ")}
              </div>
            )}
            {importResult.failed.length > 0 && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                <p className="font-semibold">{importResult.failed.length} failed:</p>
                <ul className="mt-1 list-disc pl-5">
                  {importResult.failed.map((f) => (
                    <li key={f.draftId}>
                      {f.name}: {f.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <aside className="card h-fit space-y-3 p-4 lg:sticky lg:top-4">
        <h2 className="font-display font-bold text-navy-900">Batch ({batch.length})</h2>
        {batch.length === 0 ? (
          <p className="text-sm text-navy-400">Products you save are staged here. Nothing is imported until you click "Import All Saved".</p>
        ) : (
          <ul className="space-y-2">
            {batch.map((d) => (
              <li key={d.draftId} className="flex items-center gap-2 rounded-lg border border-navy-100 p-2">
                {/* eslint-disable-next-line @next/next/no-img-element -- external supplier CDN */}
                <img src={d.thumbnailUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-navy-800">{d.name}</p>
                  <p className="text-xs text-navy-400">{formatMoney(Number(d.basePriceMinorText) || 0, "USD")}</p>
                </div>
                <button
                  onClick={() => editBatchItem(d)}
                  disabled={openingDraftId === d.draftId}
                  className="text-xs font-medium text-atgblue-600 hover:underline disabled:opacity-50"
                >
                  {openingDraftId === d.draftId ? "Loading…" : "Edit"}
                </button>
                <button onClick={() => removeFromBatch(d.draftId)} className="text-xs font-medium text-red-600 hover:underline">
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          onClick={handleImportAll}
          disabled={batch.length === 0 || importing}
          className="btn-primary w-full"
        >
          {importing ? "Importing…" : `Import All Saved (${batch.length})`}
        </button>
      </aside>
    </div>
  );
}

function EditPanel({
  draft,
  product,
  categories,
  saving,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Draft;
  product: ImportableProduct;
  categories: { id: string; name: string }[];
  saving: boolean;
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const keptImages = product.images.filter((url) => !draft.removedImages.has(url));
  const canSave =
    draft.name.trim() &&
    draft.slug.trim() &&
    draft.categoryId &&
    Number.isFinite(Number(draft.basePriceMinorText)) &&
    Number.isFinite(Number(draft.weightGramsText)) &&
    keptImages.length > 0 &&
    product.variants
      .filter((v) => !draft.removedVariantIds.has(v.externalId))
      .every((v) => Number.isFinite(Number(draft.variantPrices[v.externalId] ?? v.supplierPriceMinorUsd)));

  function toggleImage(url: string) {
    const next = new Set(draft.removedImages);
    if (next.has(url)) next.delete(url);
    else next.add(url);
    onChange({ ...draft, removedImages: next });
  }

  function toggleVariant(id: string) {
    const next = new Set(draft.removedVariantIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange({ ...draft, removedVariantIds: next });
  }

  function setVariantPrice(id: string, priceText: string) {
    onChange({ ...draft, variantPrices: { ...draft.variantPrices, [id]: priceText } });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- external supplier CDN */}
        <img
          src={keptImages[0] ?? product.imageUrl}
          alt={draft.name}
          className="aspect-square w-full rounded-xl2 object-cover"
        />
        <div className="grid grid-cols-4 gap-2">
          {product.images.map((url) => {
            const removed = draft.removedImages.has(url);
            return (
              <button
                key={url}
                type="button"
                onClick={() => toggleImage(url)}
                className={cn("relative aspect-square overflow-hidden rounded-lg", removed && "opacity-30")}
                title={removed ? "Removed — click to restore" : "Click to remove"}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- external supplier CDN */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                {removed && <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-lg text-white">✕</span>}
              </button>
            );
          })}
        </div>
        {keptImages.length === 0 && <p className="text-xs text-red-600">Keep at least one image.</p>}

        {product.variants.length > 0 && (
          <div className="card p-4 text-sm">
            <p className="mb-2 font-semibold text-navy-800">Variants ({product.variants.length})</p>
            <p className="mb-2 text-xs text-navy-400">
              Prices default to what the supplier charges for each — edit any that should differ from your base price.
            </p>
            <ul className="space-y-2">
              {product.variants.map((v) => {
                const removed = draft.removedVariantIds.has(v.externalId);
                return (
                  <li key={v.externalId} className="flex items-center justify-between gap-2">
                    <div>
                      <span className={cn("text-navy-600", removed && "text-navy-300 line-through")}>{v.name}</span>
                      <p className="text-xs text-navy-400">Supplier: {formatMoney(v.supplierPriceMinorUsd, "USD")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        aria-label={`Price for ${v.name} (minor units)`}
                        value={draft.variantPrices[v.externalId] ?? String(v.supplierPriceMinorUsd || 0)}
                        onChange={(e) => setVariantPrice(v.externalId, e.target.value)}
                        disabled={removed}
                        className="w-24 disabled:opacity-40"
                      />
                      <button type="button" onClick={() => toggleVariant(v.externalId)} className="text-xs font-medium text-atgblue-600 hover:underline">
                        {removed ? "Restore" : "Remove"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <section className="card p-5">
        <h1 className="mb-1 text-xl font-display font-bold text-navy-900">Edit Before Staging</h1>
        <p className="mb-4 text-sm text-navy-500">
          {product.source === "CJ" ? "CJ" : "AliExpress"} ID {product.externalId}
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Name" htmlFor="name" required>
              <Input id="name" value={draft.name} onChange={(e) => onChange({ ...draft, name: e.target.value })} required />
            </Field>
          </div>
          <Field label="Slug" htmlFor="slug" required hint="lowercase-with-hyphens">
            <Input id="slug" value={draft.slug} onChange={(e) => onChange({ ...draft, slug: e.target.value })} required />
          </Field>
          <Field label="Category" htmlFor="categoryId" required>
            <Select id="categoryId" value={draft.categoryId} onChange={(e) => onChange({ ...draft, categoryId: e.target.value })} required>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Your price, minor units (USD)"
            htmlFor="basePriceMinor"
            required
            hint={`Pre-filled at supplier cost (${formatMoney(product.suggestedPriceMinorUsd, "USD")}) — set your own price.`}
          >
            <Input
              id="basePriceMinor"
              type="number"
              value={draft.basePriceMinorText}
              onChange={(e) => onChange({ ...draft, basePriceMinorText: e.target.value })}
              required
            />
          </Field>
          <Field label="Weight (grams)" htmlFor="weightGrams" required>
            <Input
              id="weightGrams"
              type="number"
              value={draft.weightGramsText}
              onChange={(e) => onChange({ ...draft, weightGramsText: e.target.value })}
              required
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="description" required>
              <Textarea id="description" value={draft.description} onChange={(e) => onChange({ ...draft, description: e.target.value })} required />
            </Field>
          </div>
          {product.variants.length > 0 && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.importVariants}
                onChange={(e) => onChange({ ...draft, importVariants: e.target.checked })}
              />{" "}
              Import variants
            </label>
          )}
          {product.videoUrl && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.includeVideo}
                onChange={(e) => onChange({ ...draft, includeVideo: e.target.checked })}
              />{" "}
              Include supplier video
            </label>
          )}
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={draft.isFeatured}
              onChange={(e) => onChange({ ...draft, isFeatured: e.target.checked })}
            />{" "}
            Mark as Trending — shows in the homepage's Trending Products section and badge
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <button type="button" onClick={onSave} disabled={!canSave || saving} className="btn-primary">
              {saving ? "Saving…" : "Save to Batch"}
            </button>
            <button type="button" onClick={onCancel} className="btn-outline">
              Cancel
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
