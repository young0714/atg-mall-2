"use client";

import { useState } from "react";
import { addVariantsBulkAction } from "./actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

const PRESET_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

export function BulkVariantForm({
  productId,
  currency,
  existingColours,
  existingSizes,
}: {
  productId: string;
  currency: string;
  existingColours: string[];
  existingSizes: string[];
}) {
  const [colours, setColours] = useState<string[]>(existingColours);
  const [sizes, setSizes] = useState<string[]>(existingSizes);
  const [extraSizes, setExtraSizes] = useState<string[]>(existingSizes.filter((s) => !PRESET_SIZES.includes(s)));
  const [surcharges, setSurcharges] = useState<Record<string, string>>({});
  const [stock, setStock] = useState("999");
  const [newColour, setNewColour] = useState("");
  const [newSize, setNewSize] = useState("");

  const orderedSizes = [...PRESET_SIZES, ...extraSizes].filter((s) => sizes.includes(s));
  const count = Math.max(colours.length, 1) * Math.max(orderedSizes.length, 1);
  const nothing = colours.length === 0 && orderedSizes.length === 0;

  function toggleSize(s: string) {
    setSizes((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }
  function addColour() {
    const v = newColour.trim();
    if (v && !colours.some((c) => c.toLowerCase() === v.toLowerCase())) setColours((c) => [...c, v]);
    setNewColour("");
  }
  function addSize() {
    const v = newSize.trim();
    if (!v) return;
    if (!PRESET_SIZES.includes(v) && !extraSizes.includes(v)) setExtraSizes((e) => [...e, v]);
    if (!sizes.includes(v)) setSizes((s) => [...s, v]);
    setNewSize("");
  }

  const surchargePayload: Record<string, number> = {};
  for (const s of orderedSizes) {
    const n = parseFloat(surcharges[s] ?? "");
    if (Number.isFinite(n) && n !== 0) surchargePayload[s] = n;
  }

  return (
    <form action={addVariantsBulkAction} className="space-y-5">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="colours" value={JSON.stringify(colours)} />
      <input type="hidden" name="sizes" value={JSON.stringify(orderedSizes)} />
      <input type="hidden" name="surcharges" value={JSON.stringify(surchargePayload)} />

      <div>
        <p className="label">Colours</p>
        <div className="flex flex-wrap gap-2">
          {colours.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColours((cur) => cur.filter((x) => x !== c))}
              title="Click to remove"
              className="rounded-full bg-navy-900 px-3 py-1 text-sm font-semibold text-white"
            >
              {c} <span aria-hidden>×</span>
            </button>
          ))}
          {colours.length === 0 && <span className="text-sm text-navy-400">No colours yet (leave empty for sizes only)</span>}
        </div>
        <div className="mt-2 flex max-w-sm gap-2">
          <input
            className="input"
            value={newColour}
            onChange={(e) => setNewColour(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addColour(); } }}
            placeholder="e.g. Red & Black"
            aria-label="New colour"
          />
          <button type="button" onClick={addColour} className="btn-outline btn-sm shrink-0">Add colour</button>
        </div>
      </div>

      <div>
        <p className="label">Sizes</p>
        <div className="flex flex-wrap gap-2">
          {[...PRESET_SIZES, ...extraSizes].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSize(s)}
              aria-pressed={sizes.includes(s)}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                sizes.includes(s) ? "border-navy-900 bg-navy-900 text-white" : "border-navy-200 bg-white text-navy-600"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-2 flex max-w-sm gap-2">
          <input
            className="input"
            value={newSize}
            onChange={(e) => setNewSize(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSize(); } }}
            placeholder="e.g. 6XL or Kids 10"
            aria-label="New size"
          />
          <button type="button" onClick={addSize} className="btn-outline btn-sm shrink-0">Add size</button>
        </div>
      </div>

      {orderedSizes.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="label">Extra charge per size ({currency}, optional)</p>
            <div className="space-y-1.5">
              {orderedSizes.map((s) => (
                <div key={s} className="flex items-center gap-3 text-sm">
                  <span className="w-12 font-medium text-navy-700">{s}</span>
                  <input
                    className="input !w-28 !py-1.5"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0"
                    value={surcharges[s] ?? ""}
                    onChange={(e) => setSurcharges((cur) => ({ ...cur, [s]: e.target.value }))}
                    aria-label={`Extra charge for ${s}`}
                  />
                </div>
              ))}
            </div>
            <p className="mt-1 text-xs text-navy-400">Whole amounts like 2 or 2.50, added to the product price for that size.</p>
          </div>
          <div>
            <label className="label" htmlFor="bulk-stock">Stock for each combination</label>
            <input id="bulk-stock" name="stock" type="number" min="0" className="input" value={stock} onChange={(e) => setStock(e.target.value)} />
            <p className="mt-1 text-xs text-navy-400">999 means always available. Set a combination to 0 later to show it as sold out.</p>
          </div>
        </div>
      )}
      {orderedSizes.length === 0 && <input type="hidden" name="stock" value={stock} />}

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-dashed border-navy-200 bg-sand-50 p-4">
        <div>
          <p className="font-display font-bold text-navy-900">{nothing ? "Nothing to create yet" : `${count} variant${count === 1 ? "" : "s"} will be created`}</p>
          {!nothing && (
            <p className="text-xs text-navy-500">
              {colours.length > 0 && `${colours.length} colour${colours.length === 1 ? "" : "s"} × `}
              {Math.max(orderedSizes.length, 1)} size{orderedSizes.length === 1 ? "" : "s"}. Combinations that already exist are skipped.
            </p>
          )}
        </div>
        <SubmitButton className="btn-primary" disabled={nothing}>
          Create variants
        </SubmitButton>
      </div>
    </form>
  );
}
