"use client";

import { useState } from "react";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { formatMoney } from "@/lib/money";
import { slugify } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ImportableProduct, ImportSource } from "@/lib/services/importTypes";
import { searchCjProductsAction, lookupProductAction, importBatchAction, type ImportDraftInput, type ImportBatchResult } from "@/app/admin/(dashboard)/product-import/actions";

/**
 * DSer-style batch-staging import UI, shared by the CJ and AliExpress admin
 * import pages. Browse/find products, open one at a time to price it, trim
 * its variants/images, and "Save to batch" — nothing is written to the ATG
 * catalog yet. Repeat across as many products as you like, then "Import All
 * Saved" commits the whole batch in one go.
 */

interface Draft {
  draftId: string;
  product: ImportableProduct;
  name: string;
  slug: string;
  categoryId: string;
  description: string;
  basePriceMinorText: string;
  weightGramsText: string;
  importVariants: boolean;
  removedImages: Set<string>;
  removedVariantIds: Set<string>;
}

function toDraft(product: ImportableProduct, defaultCategoryId: string): Draft {
  return {
    draftId: crypto.randomUUID(),
    product,
    name: product.name,
    slug: slugify(product.name),
    categoryId: defaultCategoryId,
    description: product.description ?? "",
    basePriceMinorText: String(product.suggestedPriceMinorUsd || 0),
    weightGramsText: String(product.weightGrams ?? 500),
    importVariants: product.variants.length > 0,
    removedImages: new Set(),
    removedVariantIds: new Set(),
  };
}

export function ProductImportWorkspace({
  source,
  categories,
}: {
  source: ImportSource;
  categories: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ImportableProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [findError, setFindError] = useState<string | null>(null);

  const [editing, setEditing] = useState<Draft | null>(null);
  const [batch, setBatch] = useState<Draft[]>([]);
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
      setEditing(toDraft(res.product, defaultCategoryId));
    } finally {
      setLookingUp(false);
    }
  }

  function saveDraftToBatch(draft: Draft) {
    setBatch((prev) => {
      const withoutThis = prev.filter((d) => d.draftId !== draft.draftId);
      return [...withoutThis, draft];
    });
    setEditing(null);
  }

  function removeFromBatch(draftId: string) {
    setBatch((prev) => prev.filter((d) => d.draftId !== draftId));
  }

  async function handleImportAll() {
    if (batch.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const inputs: ImportDraftInput[] = batch.map((d) => ({
        draftId: d.draftId,
        source: d.product.source,
        externalId: d.product.externalId,
        name: d.name,
        slug: d.slug,
        categoryId: d.categoryId,
        description: d.description,
        basePriceMinor: Number(d.basePriceMinorText),
        weightGrams: Number(d.weightGramsText),
        importVariants: d.importVariants,
        keptImageUrls: d.product.images.filter((url) => !d.removedImages.has(url)),
        keptVariantExternalIds: d.product.variants.map((v) => v.externalId).filter((id) => !d.removedVariantIds.has(id)),
      }));
      const result = await importBatchAction(inputs);
      setImportResult(result);
      const succeededIds = new Set(result.succeeded.map((s) => s.draftId));
      setBatch((prev) => prev.filter((d) => !succeededIds.has(d.draftId)));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {editing ? (
          <EditPanel
            draft={editing}
            categories={categories}
            onChange={setEditing}
            onSave={() => saveDraftToBatch(editing)}
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
                <img src={d.product.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-navy-800">{d.name}</p>
                  <p className="text-xs text-navy-400">{formatMoney(Number(d.basePriceMinorText) || 0, "USD")}</p>
                </div>
                <button onClick={() => setEditing(d)} className="text-xs font-medium text-atgblue-600 hover:underline">
                  Edit
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
  categories,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Draft;
  categories: { id: string; name: string }[];
  onChange: (draft: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const keptImages = draft.product.images.filter((url) => !draft.removedImages.has(url));
  const canSave =
    draft.name.trim() &&
    draft.slug.trim() &&
    draft.categoryId &&
    Number.isFinite(Number(draft.basePriceMinorText)) &&
    Number.isFinite(Number(draft.weightGramsText)) &&
    keptImages.length > 0;

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

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
      <div className="space-y-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- external supplier CDN */}
        <img
          src={keptImages[0] ?? draft.product.imageUrl}
          alt={draft.name}
          className="aspect-square w-full rounded-xl2 object-cover"
        />
        <div className="grid grid-cols-4 gap-2">
          {draft.product.images.map((url) => {
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

        {draft.product.variants.length > 0 && (
          <div className="card p-4 text-sm">
            <p className="mb-2 font-semibold text-navy-800">Variants ({draft.product.variants.length})</p>
            <ul className="space-y-1">
              {draft.product.variants.map((v) => {
                const removed = draft.removedVariantIds.has(v.externalId);
                return (
                  <li key={v.externalId} className="flex items-center justify-between gap-2">
                    <span className={cn("text-navy-600", removed && "text-navy-300 line-through")}>{v.name}</span>
                    <button type="button" onClick={() => toggleVariant(v.externalId)} className="text-xs font-medium text-atgblue-600 hover:underline">
                      {removed ? "Restore" : "Remove"}
                    </button>
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
          {draft.product.source === "CJ" ? "CJ" : "AliExpress"} ID {draft.product.externalId}
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
            hint={`Pre-filled at supplier cost (${formatMoney(draft.product.suggestedPriceMinorUsd, "USD")}) — set your own price.`}
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
          {draft.product.variants.length > 0 && (
            <label className="flex items-center gap-2 text-sm sm:col-span-2">
              <input
                type="checkbox"
                checked={draft.importVariants}
                onChange={(e) => onChange({ ...draft, importVariants: e.target.checked })}
              />{" "}
              Import variants
            </label>
          )}
          <div className="flex gap-3 sm:col-span-2">
            <button type="button" onClick={onSave} disabled={!canSave} className="btn-primary">
              Save to Batch
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
