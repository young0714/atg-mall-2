"use client";

import { useRef, useState } from "react";
import {
  applyFixAction,
  checkAliExpressProductAction,
  hideProductAction,
  previewFixAction,
  type FixApplied,
  type FixPreview,
  type HideResult,
  type VariantCheckResult,
} from "./actions";
import { Badge } from "@/components/ui/Badge";

interface ProductRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  sourceUrl: string | null;
  variantCount: number;
}

const STATUS_LABEL: Record<string, { label: string; tone: "green" | "red" | "gold" | "neutral" | "blue" }> = {
  OK: { label: "All options present", tone: "green" },
  MISSING_OPTIONS: { label: "Missing options", tone: "red" },
  NO_VARIANTS_ON_SITE: { label: "No options on site", tone: "red" },
  ONLY_EXTRA_ON_SITE: { label: "Site has options AliExpress dropped", tone: "gold" },
  NOT_FOUND_AT_SOURCE: { label: "Not found on AliExpress", tone: "neutral" },
  SOURCE_ERROR: { label: "Couldn't check", tone: "neutral" },
};
const FIXABLE = new Set(["MISSING_OPTIONS", "NO_VARIANTS_ON_SITE", "ONLY_EXTRA_ON_SITE"]);
const CONCURRENCY = 2;

function csvCell(v: unknown) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

async function runPool<T>(items: T[], size: number, worker: (item: T) => Promise<void>, shouldStop: () => boolean) {
  const queue = [...items];
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (queue.length && !shouldStop()) await worker(queue.shift()!);
    }),
  );
}

export function AliExpressVariantCheck({ products }: { products: ProductRow[] }) {
  const [results, setResults] = useState<Record<string, VariantCheckResult>>({});
  const [running, setRunning] = useState(false);
  const [onlyProblems, setOnlyProblems] = useState(true);
  const [previews, setPreviews] = useState<Record<string, FixPreview>>({});
  const [reviewing, setReviewing] = useState(false);
  const [applied, setApplied] = useState<Record<string, FixApplied>>({});
  const [applying, setApplying] = useState(false);
  const [hidden, setHidden] = useState<Record<string, HideResult>>({});
  const [hiding, setHiding] = useState(false);
  const stopRef = useRef(false);

  const done = Object.keys(results).length;
  const byStatus: Record<string, number> = {};
  for (const r of Object.values(results)) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

  const fixable = products.filter((p) => results[p.id] && FIXABLE.has(results[p.id].status));
  const unfulfillable = products.filter((p) => results[p.id]?.unfulfillable && !hidden[p.id]?.ok);
  const reviewed = fixable.filter((p) => previews[p.id]);
  const reviewable = reviewed.filter((p) => previews[p.id].ok && (previews[p.id].add.length > 0 || previews[p.id].retire.length > 0));
  const totalAdd = reviewable.reduce((n, p) => n + previews[p.id].add.length, 0);
  const totalRetire = reviewable.reduce((n, p) => n + previews[p.id].retire.length, 0);
  const warningCount = reviewable.reduce((n, p) => n + previews[p.id].warnings.length, 0);
  const pendingApply = reviewable.filter((p) => !applied[p.id]?.ok);

  async function start() {
    stopRef.current = false;
    setRunning(true);
    setResults({});
    setPreviews({});
    setApplied({});
    await runPool(
      products,
      CONCURRENCY,
      async (p) => {
        let r: VariantCheckResult;
        try {
          r = await checkAliExpressProductAction(p.id);
        } catch (e) {
          r = {
            productId: p.id, status: "SOURCE_ERROR", siteVariants: p.variantCount, sourceSkus: 0, missingCount: 0,
            whatIsMissing: "", missing: [], extraOnSite: [], soldOutAtSource: 0, unfulfillable: false,
            note: e instanceof Error ? e.message : "Request failed",
          };
        }
        setResults((cur) => ({ ...cur, [p.id]: r }));
      },
      () => stopRef.current,
    );
    setRunning(false);
  }

  async function reviewFixes() {
    setReviewing(true);
    setPreviews({});
    await runPool(
      fixable,
      CONCURRENCY,
      async (p) => {
        let pv: FixPreview;
        try {
          pv = await previewFixAction(p.id);
        } catch (e) {
          pv = { productId: p.id, ok: false, note: e instanceof Error ? e.message : "Request failed", add: [], retire: [], skippedSoldOut: 0, skippedOld: 0, warnings: [] };
        }
        setPreviews((cur) => ({ ...cur, [p.id]: pv }));
      },
      () => false,
    );
    setReviewing(false);
  }

  async function applyAll() {
    const msg = `Apply these changes to ${pendingApply.length} products?\n\n• Add ${totalAdd} options (priced from AliExpress + each product's own markup)\n• Mark ${totalRetire} dropped options as sold out (nothing is deleted)\n\nThis changes your live shop.`;
    if (!window.confirm(msg)) return;
    setApplying(true);
    await runPool(
      pendingApply,
      1,
      async (p) => {
        let r: FixApplied;
        try {
          r = await applyFixAction(p.id);
        } catch (e) {
          r = { productId: p.id, ok: false, note: e instanceof Error ? e.message : "Request failed", added: 0, retired: 0 };
        }
        setApplied((cur) => ({ ...cur, [p.id]: r }));
      },
      () => false,
    );
    setApplying(false);
  }

  async function hideOne(id: string) {
    let r: HideResult;
    try {
      r = await hideProductAction(id);
    } catch (e) {
      r = { productId: id, ok: false, note: e instanceof Error ? e.message : "Request failed" };
    }
    setHidden((cur) => ({ ...cur, [id]: r }));
  }

  async function hideAll() {
    if (!window.confirm(`Hide ${unfulfillable.length} products that AliExpress can't currently supply?\n\nThey disappear from your shop. You can switch each one back on from its admin page.`)) return;
    setHiding(true);
    for (const p of unfulfillable) await hideOne(p.id);
    setHiding(false);
  }

  function downloadCsv() {
    const header = ["status", "active_on_site", "product", "site_variants", "aliexpress_skus", "missing_on_site", "what_is_missing", "missing_options_with_price_usd", "extra_on_site", "sold_out_at_aliexpress", "note", "admin_page", "aliexpress_link"];
    const lines = [header.join(",")];
    for (const p of products) {
      const r = results[p.id];
      if (!r) continue;
      lines.push(
        [
          r.status, p.isActive ? "yes" : "no", p.name, r.siteVariants, r.sourceSkus, r.missingCount, r.whatIsMissing,
          r.missing.map((m) => `${m.name} ($${m.priceUsd.toFixed(2)}${m.soldOut ? ", sold out" : ""})`).join("; "),
          r.extraOnSite.join("; "), r.soldOutAtSource, r.note ?? "", `/admin/products/${p.id}`, p.sourceUrl ?? "",
        ].map(csvCell).join(","),
      );
    }
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "aliexpress-options-check.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const shown = products.filter((p) => {
    const r = results[p.id];
    if (!r) return false;
    if (!onlyProblems) return true;
    return FIXABLE.has(r.status) || r.status === "SOURCE_ERROR" || r.unfulfillable;
  });

  return (
    <div className="space-y-5">
      <div className="card flex flex-wrap items-center gap-4 p-5">
        {!running ? (
          <button type="button" onClick={start} className="btn-primary">
            {done > 0 ? "Check again" : `Check all ${products.length} products`}
          </button>
        ) : (
          <button type="button" onClick={() => { stopRef.current = true; }} className="btn-outline">
            Stop
          </button>
        )}
        <div className="min-w-[200px] flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-navy-50">
            <div className="h-full bg-atgblue-500 transition-all" style={{ width: `${products.length ? (done / products.length) * 100 : 0}%` }} />
          </div>
          <p className="mt-1 text-xs text-navy-500">
            {done} of {products.length} checked{running ? " — keep this page open" : ""}
          </p>
        </div>
        <button type="button" onClick={downloadCsv} disabled={done === 0} className="btn-outline btn-sm disabled:opacity-50">
          Download spreadsheet
        </button>
      </div>

      {done > 0 && !running && (fixable.length > 0 || unfulfillable.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {fixable.length > 0 && (
            <div className="card space-y-3 p-5">
              <div>
                <p className="font-display font-bold text-navy-900">Fix options ({fixable.length} products)</p>
                <p className="text-sm text-navy-500">
                  Adds the in-stock options AliExpress has that your shop lacks, and marks options AliExpress dropped as
                  sold out. Nothing is deleted. Review first — nothing changes until you press Apply.
                </p>
              </div>
              {reviewed.length < fixable.length ? (
                <button type="button" onClick={reviewFixes} disabled={reviewing} className="btn-primary disabled:opacity-60">
                  {reviewing ? `Reviewing… ${reviewed.length}/${fixable.length}` : "Review the fixes"}
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-navy-700">
                    <strong>{totalAdd}</strong> options to add and <strong>{totalRetire}</strong> to mark sold out, across{" "}
                    <strong>{reviewable.length}</strong> products
                    {warningCount > 0 ? <span className="text-gold-700"> · {warningCount} warning{warningCount === 1 ? "" : "s"} (see the table)</span> : null}.
                  </p>
                  <button
                    type="button"
                    onClick={applyAll}
                    disabled={applying || pendingApply.length === 0}
                    className="btn-primary disabled:opacity-60"
                  >
                    {applying
                      ? `Applying… ${reviewable.length - pendingApply.length}/${reviewable.length}`
                      : pendingApply.length === 0
                        ? "All fixes applied"
                        : `Apply all fixes (${pendingApply.length} products)`}
                  </button>
                </div>
              )}
            </div>
          )}

          {unfulfillable.length > 0 && (
            <div className="card space-y-3 p-5">
              <div>
                <p className="font-display font-bold text-navy-900">Can&apos;t be supplied right now ({unfulfillable.length})</p>
                <p className="text-sm text-navy-500">AliExpress shows every option sold out or unsaleable. Hiding removes them from your shop; you can switch them back on later.</p>
              </div>
              <ul className="space-y-1.5 text-sm">
                {unfulfillable.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-navy-800">{p.name}</span>
                    {hidden[p.id] && !hidden[p.id].ok ? (
                      <span className="text-xs text-red-700">{hidden[p.id].note}</span>
                    ) : (
                      <button type="button" onClick={() => hideOne(p.id)} className="btn-outline btn-sm shrink-0">Hide</button>
                    )}
                  </li>
                ))}
              </ul>
              <button type="button" onClick={hideAll} disabled={hiding} className="btn-primary disabled:opacity-60">
                {hiding ? "Hiding…" : `Hide all ${unfulfillable.length}`}
              </button>
            </div>
          )}
        </div>
      )}

      {Object.values(hidden).some((h) => h.ok) && (
        <p className="rounded-lg bg-atggreen-50 px-3 py-2 text-sm text-atggreen-700">
          Hidden: {products.filter((p) => hidden[p.id]?.ok).map((p) => p.name).join("; ")}
        </p>
      )}

      {done > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {Object.entries(byStatus).map(([s, n]) => (
            <Badge key={s} tone={STATUS_LABEL[s]?.tone ?? "neutral"}>
              {n} · {STATUS_LABEL[s]?.label ?? s}
            </Badge>
          ))}
          <label className="ml-auto flex items-center gap-2 text-navy-600">
            <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
            Show only products that need attention
          </label>
        </div>
      )}

      {shown.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-500">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Result</th>
                <th className="p-3">Site / AliExpress</th>
                <th className="p-3">What&apos;s missing, and the planned fix</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const r = results[p.id];
                const st = STATUS_LABEL[r.status];
                const pv = previews[p.id];
                const ap = applied[p.id];
                return (
                  <tr key={p.id} className="border-t border-navy-100 align-top">
                    <td className="max-w-xs p-3 font-medium text-navy-900">
                      {p.name}
                      {(!p.isActive || hidden[p.id]?.ok) && <span className="ml-2 text-xs text-navy-400">(hidden)</span>}
                    </td>
                    <td className="p-3">
                      <Badge tone={st?.tone ?? "neutral"}>{st?.label ?? r.status}</Badge>
                      {r.unfulfillable && <div className="mt-1"><Badge tone="red">Can&apos;t be supplied</Badge></div>}
                    </td>
                    <td className="whitespace-nowrap p-3 tabular-nums">{r.siteVariants} / {r.sourceSkus}</td>
                    <td className="max-w-md space-y-2 p-3 text-navy-700">
                      <div>{r.whatIsMissing || r.note || "—"}</div>
                      {pv && !ap && (
                        <div className="rounded-lg bg-navy-50 p-2 text-xs text-navy-700">
                          {pv.ok ? (
                            <>
                              <strong>Plan:</strong> add {pv.add.length}, mark {pv.retire.length} sold out
                              {pv.skippedSoldOut + pv.skippedOld > 0 ? ` (skipping ${pv.skippedSoldOut} sold out at AliExpress, ${pv.skippedOld} marked "old")` : ""}
                              {pv.add.length + pv.retire.length > 0 && (
                                <details className="mt-1">
                                  <summary className="cursor-pointer">Details</summary>
                                  {pv.add.length > 0 && (
                                    <ul className="mt-1 list-disc pl-4">
                                      {pv.add.map((a) => <li key={a.name}>Add {a.name} — customer pays ${a.sellUsd.toFixed(2)} (AliExpress ${a.costUsd.toFixed(2)})</li>)}
                                    </ul>
                                  )}
                                  {pv.retire.length > 0 && (
                                    <p className="mt-1">Sold out: {pv.retire.join("; ")}</p>
                                  )}
                                </details>
                              )}
                              {pv.warnings.map((w) => <p key={w} className="mt-1 text-gold-700">⚠ {w}</p>)}
                            </>
                          ) : (
                            <span className="text-red-700">Can&apos;t plan a fix: {pv.note}</span>
                          )}
                        </div>
                      )}
                      {ap && (
                        <p className={`text-xs font-medium ${ap.ok ? "text-atggreen-700" : "text-red-700"}`}>
                          {ap.ok ? `✓ Applied: added ${ap.added}, marked ${ap.retired} sold out` : `Not applied: ${ap.note}`}
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3 text-xs">
                      <a className="text-atgblue-700 underline" href={`/admin/products/${p.id}`}>Edit</a>
                      {p.sourceUrl && <> · <a className="text-atgblue-700 underline" href={p.sourceUrl} target="_blank" rel="noreferrer">AliExpress</a></>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {done > 0 && !running && shown.length === 0 && (
        <p className="text-sm text-navy-500">Nothing needs attention{onlyProblems ? " — untick the box to see every product" : ""}.</p>
      )}
    </div>
  );
}
