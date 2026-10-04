/**
 * Turns a product's flat variant list into separate Colour / Size choices.
 *
 * A variant carries `attributes` like { color: "Red", size: "XL" } (the shape
 * the admin's bulk "Add sizes and colours" tool writes). When every variant
 * has a colour and/or a size, the product page shows real Colour and Size
 * dropdowns; otherwise (supplier-imported variants with free-form names) it
 * keeps the original single "Variant" dropdown. Shared by the product page
 * (client) and the add-to-cart check (server), so both agree on what counts
 * as "a size must be chosen".
 */

export interface PickerVariant {
  id: string;
  name: string;
  priceDeltaMinor: number;
  stock: number;
  attributes: unknown;
}

export interface OptionsPicker {
  kind: "options";
  colours: string[];
  sizes: string[];
  hasColour: boolean;
  hasSize: boolean;
  find: (colour: string, size: string) => PickerVariant | undefined;
}

export type VariantPicker = { kind: "flat" } | OptionsPicker;

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "XXXL", "4XL", "5XL", "6XL", "7XL"];

function attr(v: PickerVariant, ...keys: string[]): string {
  const a = v.attributes;
  if (!a || typeof a !== "object" || Array.isArray(a)) return "";
  const rec = a as Record<string, unknown>;
  for (const k of keys) {
    const val = rec[k];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

export const variantColour = (v: PickerVariant) => attr(v, "color", "colour", "Color", "Colour");
export const variantSize = (v: PickerVariant) => attr(v, "size", "Size");

function sortSizes(sizes: string[]): string[] {
  const rank = (s: string) => {
    const i = SIZE_ORDER.indexOf(s.toUpperCase());
    if (i >= 0) return i;
    const n = parseFloat(s);
    return Number.isFinite(n) ? 100 + n : 1000;
  };
  return [...sizes].sort((a, b) => rank(a) - rank(b));
}

export function buildPicker(variants: PickerVariant[]): VariantPicker {
  if (variants.length < 2) return { kind: "flat" };
  const colours = variants.map(variantColour);
  const sizes = variants.map(variantSize);
  const hasColour = colours.every(Boolean);
  const hasSize = sizes.every(Boolean);
  // Every variant must be fully described by the dimensions we show, or the
  // dropdowns couldn't reach it — fall back to the plain variant list.
  if (!hasColour && !hasSize) return { kind: "flat" };
  if (colours.some(Boolean) && !hasColour) return { kind: "flat" };
  if (sizes.some(Boolean) && !hasSize) return { kind: "flat" };

  const uniq = (xs: string[]) => [...new Set(xs)];
  const byKey = new Map<string, PickerVariant>();
  variants.forEach((v, i) => byKey.set(`${hasColour ? colours[i] : ""}||${hasSize ? sizes[i] : ""}`, v));
  // Colour + size must tell every variant apart. Supplier-imported products
  // often carry a third option ("Specification", "Plug Type", "Ships From")
  // or duplicate colour names; two dropdowns would silently hide some
  // choices, so those keep the full single list instead.
  if (byKey.size !== variants.length) return { kind: "flat" };
  return {
    kind: "options",
    colours: hasColour ? uniq(colours) : [],
    sizes: hasSize ? sortSizes(uniq(sizes)) : [],
    hasColour,
    hasSize,
    find: (colour, size) => byKey.get(`${hasColour ? colour : ""}||${hasSize ? size : ""}`),
  };
}

/** Pretty variant name for new variants, e.g. "Red & Black / XL". */
export function variantLabel(colour: string, size: string): string {
  return [colour, size].filter(Boolean).join(" / ");
}
