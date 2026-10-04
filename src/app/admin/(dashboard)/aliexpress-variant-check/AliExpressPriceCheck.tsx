"use client";

import { useRef, useState } from "react";
import { checkPricesAction, type PriceCheckView } from "./actions";
import { Badge } from "@/components/ui/Badge";

interface ProductRow {
  id: string;
  name: string;
  sourceUrl: string | null;
}

const STATUS: Record<string, { label: string; tone: "green" | "red" | "gold" | "neutral" }> = {
  BELOW_COST: { label: "Selling below cost", tone: "red" },
  THIN: { label: "Thin margin", tone: "gold" },
  OK: { label: "Healthy margin", tone: "green" },
  NO_MATCH: { label: "Nothing to compare", tone: "neutral" },
  ERROR: { label: "Couldn't check", tone: "neutral" },
};
const ORDER = ["BELOW_COST", "THIN", "ERROR", "NO_MATCH", "OK"];
const CONCURRENCY = 2;

const usd = (n: number) => `$${n.toFixed(2)}`;
const csvCell = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export function AliExpressPriceCheck({ products }: { products: ProductRow[] }) {
  const [thinPct, setThinPct] = useState(20);
  const [targetPct, setTargetPct] = useState(30);
  const [results, setResults] = useState<Record<string, PriceCheckView>>({});
  const [running, setRunning] = useState(false);
  const [onlyProblems, setOnlyProblems] = useState(true);
  const stopRef = useRef(false);

  const done = Object.keys(results).length;
  const counts: Record<string, number> = {};
  for (const r of Object.values(results)) counts[r.status] = (counts[r.status] ?? 0) + 1;

  async function start() {
    stopRef.current = false;
    setRunning(true);
    setResults({});
    const queue = [...products];
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        while (queue.length && !stopRef.current) {
          const p = queue.shift()!;
          let r: PriceCheckView;
          try {
            r = await checkPricesAction(p.id, thinPct, targetPct);
          } catch (e) {
            r = { productId: p.id, ok: false, note: e instanceof Error ? e.message : "Request failed", status: "ERROR", considered: 0, belowCost: 0, thin: 0, unmatchedLive: 0, worstMarginPct: null, flagged: [] };
          }
          setResults((cur) => ({ ...cur, [p.id]: r }));
        }
      }),
    );
    setRunning(false);
  }

  const rows = products
    .filter((p) => results[p.id])
    .filter((p) => !onlyProblems || ["BELOW_COST", "THIN", "ERROR"].includes(results[p.id].status))
    .sort((a, b) => {
      const ra = results[a.id], rb = results[b.id];
      const o = ORDER.indexOf(ra.status) - ORDER.indexOf(rb.status);
      return o !== 0 ? o : (ra.worstMarginPct ?? 999) - (rb.worstMarginPct ?? 999);
    });

  function downloadCsv() {
    const lines = [["product", "status", "option", "you_sell_usd", "aliexpress_now_usd", "margin_pct", "aliexpress_at_import_usd", `price_for_${targetPct}pct_margin_usd`, "note", "admin_page", "aliexpress_link"].join(",")];
    for (const p of products) {
      const r = results[p.id];
      if (!r) continue;
      if (r.flagged.length === 0) lines.push([p.name, r.status, "", "", "", "", "", "", r.note ?? "", `/admin/products/${p.id}`, p.sourceUrl ?? ""].map(csvCell).join(","));
      for (const o of r.flagged)
        lines.push([p.name, r.status, o.name, o.sellUsd.toFixed(2), o.aeUsd.toFixed(2), o.marginPct.toFixed(1), o.importUsd?.toFixed(2) ?? "", o.suggestedUsd.toFixed(2), "", `/admin/products/${p.id}`, p.sourceUrl ?? ""].map(csvCell).join(","));
    }
    const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "aliexpress-price-check.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5 border-t border-navy-100 pt-8">
      <div>
        <h2 className="text-xl font-display font-bold text-navy-900">Price check</h2>
        <p className="text-sm text-navy-500">
          Compares what each live option sells for with what AliExpress charges right now, so you can spot options
          selling below cost after the supplier raised prices. Read-only — nothing is changed. Margin is before
          shipping and payment fees.
        </p>
      </div>

      <div className="card flex flex-wrap items-end gap-4 p-5">
        <div>
          <label className="label" htmlFor="thin">Flag margins below (%)</label>
          <input id="thin" type="number" min={0} max={90} className="input w-28" value={thinPct} onChange={(e) => setThinPct(Number(e.target.value))} disabled={running} />
        </div>
        <div>
          <label className="label" htmlFor="target">Suggest prices for (% margin)</label>
          <input id="target" type="number" min={1} max={90} className="input w-28" value={targetPct} onChange={(e) => setTargetPct(Number(e.target.value))} disabled={running} />
        </div>
        {!running ? (
          <button type="button" onClick={start} className="btn-primary">
            {done > 0 ? "Check prices again" : `Check prices of ${products.length} live products`}
          </button>
        ) : (
          <button type="button" onClick={() => { stopRef.current = true; }} className="btn-outline">Stop</button>
        )}
        <div className="min-w-[160px] flex-1">
          <div className="h-2 overflow-hidden rounded-full bg-navy-50">
            <div className="h-full bg-atgblue-500 transition-all" style={{ width: `${products.length ? (done / products.length) * 100 : 0}%` }} />
          </div>
          <p className="mt-1 text-xs text-navy-500">{done} of {products.length} checked{running ? " — keep this page open" : ""}</p>
        </div>
        <button type="button" onClick={downloadCsv} disabled={done === 0} className="btn-outline btn-sm disabled:opacity-50">Download spreadsheet</button>
      </div>

      {done > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {ORDER.filter((s) => counts[s]).map((s) => (
            <Badge key={s} tone={STATUS[s].tone}>{counts[s]} · {STATUS[s].label}</Badge>
          ))}
          <label className="ml-auto flex items-center gap-2 text-navy-600">
            <input type="checkbox" checked={onlyProblems} onChange={(e) => setOnlyProblems(e.target.checked)} />
            Show only products that need attention
          </label>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy-50 text-xs uppercase tracking-wide text-navy-500">
              <tr>
                <th className="p-3">Product</th>
                <th className="p-3">Result</th>
                <th className="p-3">Options flagged</th>
                <th className="p-3">Worst margin</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const r = results[p.id];
                const st = STATUS[r.status];
                return (
                  <tr key={p.id} className="border-t border-navy-100 align-top">
                    <td className="max-w-xs p-3 font-medium text-navy-900">{p.name}</td>
                    <td className="p-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="max-w-md p-3 text-navy-700">
                      {r.ok ? (
                        <>
                          <div>
                            {r.belowCost > 0 && <span className="font-medium text-red-700">{r.belowCost} below cost</span>}
                            {r.belowCost > 0 && r.thin > 0 && " · "}
                            {r.thin > 0 && <span className="text-gold-700">{r.thin} thin</span>}
                            {r.belowCost + r.thin === 0 && "—"}
                            <span className="text-navy-400"> of {r.considered} on sale</span>
                            {r.unmatchedLive > 0 && <span className="text-navy-400"> · {r.unmatchedLive} not found at AliExpress</span>}
                          </div>
                          {r.flagged.length > 0 && (
                            <details className="mt-1 text-xs text-navy-600">
                              <summary className="cursor-pointer">See the options</summary>
                              <table className="mt-1 w-full">
                                <thead className="text-navy-400">
                                  <tr><th className="pr-3 text-left font-normal">Option</th><th className="pr-3 text-right font-normal">You sell</th><th className="pr-3 text-right font-normal">AliExpress now</th><th className="pr-3 text-right font-normal">Margin</th><th className="text-right font-normal">For {targetPct}%</th></tr>
                                </thead>
                                <tbody className="tabular-nums">
                                  {r.flagged.map((o) => (
                                    <tr key={o.name}>
                                      <td className="max-w-[14rem] truncate pr-3">{o.name}</td>
                                      <td className="pr-3 text-right">{usd(o.sellUsd)}</td>
                                      <td className="pr-3 text-right">{usd(o.aeUsd)}{o.importUsd !== null && o.importUsd !== o.aeUsd ? <span className="text-navy-400"> (was {usd(o.importUsd)})</span> : null}</td>
                                      <td className={`pr-3 text-right ${o.marginPct < 0 ? "font-medium text-red-700" : ""}`}>{o.marginPct.toFixed(0)}%</td>
                                      <td className="text-right">{usd(o.suggestedUsd)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </details>
                          )}
                        </>
                      ) : (
                        r.note
                      )}
                    </td>
                    <td className="whitespace-nowrap p-3 tabular-nums">{r.worstMarginPct === null ? "—" : `${r.worstMarginPct.toFixed(0)}%`}</td>
                    <td className="whitespace-nowrap p-3 text-xs">
                      <a className="text-atgblue-700 underline" href={`/admin/products/${p.id}`}>Edit prices</a>
                      {p.sourceUrl && <> · <a className="text-atgblue-700 underline" href={p.sourceUrl} target="_blank" rel="noreferrer">AliExpress</a></>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {done > 0 && !running && rows.length === 0 && (
        <p className="text-sm text-navy-500">Nothing needs attention{onlyProblems ? " — untick the box to see every product" : ""}.</p>
      )}
    </div>
  );
}
