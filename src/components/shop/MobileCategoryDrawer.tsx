"use client";

import { useState } from "react";

/**
 * Mobile-only category picker — a compact trigger button that opens a
 * bottom sheet containing the full category tree. Replaces showing the
 * tree inline (which, once categories gained real nesting, pushed the
 * entire product grid below the fold on phones). Desktop keeps the tree
 * inline in its sidebar — see shop/page.tsx.
 *
 * `children` is the already-rendered category tree (a Server Component
 * tree, built once in shop/page.tsx and reused here and in the desktop
 * sidebar) — this component only owns the open/close UI chrome around it.
 * No close-on-navigate logic needed: the shop page is force-dynamic and
 * fully re-renders on every category link click, which naturally remounts
 * this component with open state reset to false.
 */
export function MobileCategoryDrawer({ activeLabel, children }: { activeLabel: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-lg border border-navy-200 bg-white px-4 py-2.5 text-sm font-medium text-navy-700"
      >
        <span>Category: {activeLabel}</span>
        <span className="text-navy-400">▾</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative max-h-[75vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display font-bold text-navy-900">Categories</h2>
              <button type="button" onClick={() => setOpen(false)} className="text-xl leading-none text-navy-400" aria-label="Close">
                ×
              </button>
            </div>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
