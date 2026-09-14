"use client";

import { useState } from "react";
import { deleteProductVariantsAction } from "./actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

interface VariantRow {
  id: string;
  name: string;
  sku: string | null;
  stock: number;
  attributes: unknown;
}

export function VariantsTable({
  productId,
  variants,
}: {
  productId: string;
  variants: VariantRow[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = variants.length > 0 && selected.size === variants.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(variants.map((v) => v.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSubmit(e: React.FormEvent) {
    if (selected.size === 0) {
      e.preventDefault();
      return;
    }
    const plural = selected.size === 1 ? "variant" : "variants";
    if (!confirm(`Delete ${selected.size} selected ${plural}? This can't be undone.`)) {
      e.preventDefault();
    }
  }

  return (
    <form action={deleteProductVariantsAction} onSubmit={handleSubmit}>
      <input type="hidden" name="productId" value={productId} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
            <tr>
              <th className="p-2">
                <button
                  type="button"
                  onClick={toggleAll}
                  aria-label={allSelected ? "Deselect all variants" : "Select all variants"}
                  className={`h-4 w-4 rounded-full border-2 ${
                    allSelected ? "border-atgblue-600 bg-atgblue-600" : "border-navy-300"
                  }`}
                />
              </th>
              <th className="p-2">Name</th>
              <th className="p-2">SKU</th>
              <th className="p-2">Stock</th>
              <th className="p-2">Attributes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100">
            {variants.map((v) => {
              const isSelected = selected.has(v.id);
              return (
                <tr key={v.id} className={isSelected ? "bg-atgblue-50/50" : undefined}>
                  <td className="p-2">
                    <button
                      type="button"
                      onClick={() => toggleOne(v.id)}
                      aria-label={isSelected ? `Deselect ${v.name}` : `Select ${v.name}`}
                      className={`h-4 w-4 rounded-full border-2 ${
                        isSelected ? "border-atgblue-600 bg-atgblue-600" : "border-navy-300"
                      }`}
                    />
                    {isSelected && <input type="hidden" name="variantIds" value={v.id} />}
                  </td>
                  <td className="p-2 font-medium text-navy-800">{v.name}</td>
                  <td className="p-2 text-navy-500">{v.sku ?? "—"}</td>
                  <td className="p-2 text-navy-500">{v.stock}</td>
                  <td className="p-2 text-navy-400">{JSON.stringify(v.attributes)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <SubmitButton
        disabled={selected.size === 0}
        className="btn-outline btn-sm mt-3 !text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Delete selected {selected.size > 0 ? `(${selected.size})` : ""}
      </SubmitButton>
    </form>
  );
}
