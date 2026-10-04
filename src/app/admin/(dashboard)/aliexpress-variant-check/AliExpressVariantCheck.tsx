"use client";

import { useRef, useState } from "react";
import { checkAliExpressProductAction, type VariantCheckResult } from "./actions";
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
const PROBLEM = new Set(["MISSING_OPTIONS", "NO_VARIANTS_ON_SITE"]);
const CONCURRENCY = 2;

function csvCell(v: unknown) {
  return `"${String(v ?? "").replace(/"/g, '""')}"`;
}

export function AliExpressVariantCheck({ products }: { products: ProductRow[] }) {
  const [results, setResults] = useState<Record<string, VariantCheckResult>>({});
  const [running, setRunning] = useState(false);
  const [onlyProblems, setOnlyProblems] = useState(true);
  const stopRef = useRef(false);

  const done = Object.keys(results).length;
  const byStatus: Record<string, number> = {};
  for (const r of Object.values(results)) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

  async function start() {
    stopRef.current = false;
    setRunning(true);
    setResults({});
    const queue = [...products];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length && !stopRef.current) {
          const p = queue.shift()!;
          let r: VariantCheckResult;
          try {
            r = await checkAliExpressProductAction(p.id);
          } catch (e) {
            r = {
              productId: p.id, status: "SOURCE_ERROR", siteVariants: p.variantCount, sourceSkus: 0, missingCount: 0,
              whatIsMissing: "", missing: [], extraOnSite: [], soldOutAtSource: 0,
              note: e instanceof Error ? e.message : "Request failed",
            };
          }
          setResults((cur) => ({ ...cur, [p.id]: r }));
        }
      }),
    );
    setRunning(false);
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
    return onlyProblems ? PROBLEM.has(r.status) || r.status === "SOURCE_ERROR" : true;
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
                <th className="p-3">What&apos;s missing on the website</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((p) => {
                const r = results[p.id];
                const st = STATUS_LABEL[r.status];
                return (
                  <tr key={p.id} className="border-t border-navy-100 align-top">
                    <td className="max-w-xs p-3 font-medium text-navy-900">
                      {p.name}
                      {!p.isActive && <span className="ml-2 text-xs text-navy-400">(hidden)</span>}
                    </td>
                    <td className="p-3"><Badge tone={st?.tone ?? "neutral"}>{st?.label ?? r.status}</Badge></td>
                    <td className="whitespace-nowrap p-3 tabular-nums">{r.siteVariants} / {r.sourceSkus}</td>
                    <td className="max-w-md p-3 text-navy-700">
                      {r.whatIsMissing || r.note || "—"}
                      {r.missing.length > 0 && (
                        <details className="mt-1 text-xs text-navy-500">
                          <summary className="cursor-pointer">{r.missing.length} missing option{r.missing.length === 1 ? "" : "s"}</summary>
                          <ul className="mt-1 list-disc pl-4">
                            {r.missing.map((m) => (
                              <li key={m.name}>{m.name} — ${m.priceUsd.toFixed(2)}{m.soldOut ? " (sold out there)" : ""}</li>
                            ))}
                          </ul>
                        </details>
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
