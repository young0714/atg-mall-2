"use client";

import { Select } from "@/components/ui/Form";

export function SortSelect({ defaultValue }: { defaultValue: string }) {
  return (
    <Select
      name="sort"
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.submit()}
    >
      <option value="newest">Newest</option>
      <option value="price_asc">Price: Low to High</option>
      <option value="price_desc">Price: High to Low</option>
      <option value="rating">Top Rated</option>
    </Select>
  );
}
