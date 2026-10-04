"use client";

import { useEffect, useState } from "react";
import type { Currency } from "@prisma/client";
import { formatMoney } from "@/lib/money";
import { addToCartAction, requestSourcingForProductAction } from "@/app/product/[slug]/actions";
import { Select } from "@/components/ui/Form";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { buildPicker, type PickerVariant } from "@/lib/variantOptions";
import { useProductSelection } from "./ProductSelection";

type Variant = PickerVariant;

export function ProductPurchasePanel({
  productId,
  slug,
  variants,
  moq,
  baseCurrency,
  basePriceMinor,
  imageUrl,
  productName,
  affiliateUrl,
  affiliateProvider,
}: {
  productId: string;
  slug: string;
  variants: Variant[];
  moq: number;
  baseCurrency: Currency;
  basePriceMinor: number;
  imageUrl: string | null;
  productName: string;
  affiliateUrl?: string | null;
  affiliateProvider?: string | null;
}) {
  // Clothing-style products get separate Colour / Size dropdowns; anything
  // else (supplier-imported variants) keeps the single "Variant" dropdown.
  const picker = buildPicker(variants);
  const options = picker.kind === "options" ? picker : null;

  // A colour with nothing left in stock (e.g. retired after the supplier dropped it).
  const colourInStock = (c: string) =>
    !options
      ? false
      : options.hasSize
        ? options.sizes.some((s) => (options.find(c, s)?.stock ?? 0) > 0)
        : (options.find(c, "")?.stock ?? 0) > 0;
  // Offer only colours still in stock — unless none are, then show them all so
  // the product still reads as sold out rather than as having no choices.
  const shownColours = options ? (options.colours.some(colourInStock) ? options.colours.filter(colourInStock) : options.colours) : [];

  const [variantId, setVariantId] = useState(options ? "" : (variants.find((v) => v.stock > 0) ?? variants[0])?.id ?? "");
  const [colour, setColour] = useState(shownColours[0] ?? "");
  const [size, setSize] = useState("");
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(moq);
  const { setColour: shareColour } = useProductSelection();

  useEffect(() => {
    if (colour) shareColour(colour);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickColour(c: string) {
    setColour(c);
    shareColour(c);
    setError("");
    // keep the chosen size only if this colour still offers it in stock
    if (options && size) {
      const v = options.find(c, size);
      if (!v || v.stock <= 0) setSize("");
    }
  }

  const needsSize = !!options?.hasSize;
  const selectedVariant: Variant | undefined = options
    ? needsSize && !size
      ? undefined
      : options.find(colour, size)
    : variants.find((v) => v.id === variantId);
  const unitPrice = basePriceMinor + (selectedVariant?.priceDeltaMinor ?? 0);
  const formVariantId = options ? (selectedVariant?.id ?? "") : variantId;
  const soldOut = !!selectedVariant && selectedVariant.stock <= 0;

  function guardSubmit(e: React.FormEvent) {
    if (!options) {
      if (soldOut) {
        e.preventDefault();
        setError("That choice is sold out. Please pick another.");
      }
      return;
    }
    if (needsSize && !size) {
      e.preventDefault();
      setError("Please choose a size before adding to your cart.");
    } else if (!selectedVariant || soldOut) {
      e.preventDefault();
      setError("That choice is sold out. Please pick another.");
    }
  }

  const availableSizes = options?.sizes.filter((s) => options.colours.length === 0 || options.colours.some((c) => (options.find(c, s)?.stock ?? 0) > 0)) ?? [];

  if (affiliateUrl) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-xs uppercase tracking-wide text-navy-400">Price at partner</p>
          <p className="text-2xl font-display font-bold text-navy-900">
            {formatMoney(unitPrice, baseCurrency)}{" "}
            <span className="text-sm font-normal text-navy-400">/ unit</span>
          </p>
        </div>
        <p className="text-sm text-navy-500">
          This item is sold and fulfilled by {affiliateProvider || "our partner"}, not ATG Mall directly. You&apos;ll
          complete your purchase on their site.
        </p>
        <a
          href={affiliateUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="btn-primary w-full text-center"
        >
          Buy from {affiliateProvider || "Partner"} →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs uppercase tracking-wide text-navy-400">Price</p>
        <p className="text-2xl font-display font-bold text-navy-900">
          {formatMoney(unitPrice, baseCurrency)}{" "}
          <span className="text-sm font-normal text-navy-400">/ unit</span>
        </p>
      </div>

      {options ? (
        <div className="space-y-3">
          {options.hasSize && (
            <p className="text-sm text-navy-600">Available sizes: {availableSizes.join(", ") || "none right now"}</p>
          )}
          <div className={`grid gap-3 ${options.hasColour && options.hasSize ? "sm:grid-cols-2" : ""}`}>
            {options.hasColour && (
              <div>
                <label className="label" htmlFor="colour">Colour</label>
                <Select id="colour" value={colour} onChange={(e) => pickColour(e.target.value)}>
                  {shownColours.map((c) => {
                    const allGone = options.hasSize
                      ? options.sizes.every((s) => (options.find(c, s)?.stock ?? 0) <= 0)
                      : (options.find(c, "")?.stock ?? 0) <= 0;
                    return (
                      <option key={c} value={c} disabled={allGone}>
                        {c}{allGone ? " — sold out" : ""}
                      </option>
                    );
                  })}
                </Select>
              </div>
            )}
            {options.hasSize && (
              <div>
                <label className="label" htmlFor="size">Size</label>
                <Select
                  id="size"
                  value={size}
                  onChange={(e) => { setSize(e.target.value); setError(""); }}
                  className={error && !size ? "!border-red-400" : ""}
                >
                  <option value="">Choose a size</option>
                  {options.sizes.map((s) => {
                    const v = options.find(colour, s);
                    const gone = !v || v.stock <= 0;
                    return (
                      <option key={s} value={s} disabled={gone}>
                        {s}
                        {v && v.priceDeltaMinor !== 0 ? ` (${v.priceDeltaMinor > 0 ? "+" : ""}${formatMoney(v.priceDeltaMinor, baseCurrency)})` : ""}
                        {gone ? (v ? " — sold out" : " — not available") : ""}
                      </option>
                    );
                  })}
                </Select>
              </div>
            )}
          </div>
        </div>
      ) : (
        variants.length > 1 && (
          <div>
            <label className="label" htmlFor="variant">Variant</label>
            <Select id="variant" value={variantId} onChange={(e) => { setVariantId(e.target.value); setError(""); }}>
              {variants.map((v) => (
                <option key={v.id} value={v.id} disabled={v.stock <= 0}>
                  {v.name || "Standard"}{v.stock <= 0 ? " — sold out" : ""}
                  {v.priceDeltaMinor !== 0
                    ? ` (${v.priceDeltaMinor > 0 ? "+" : ""}${formatMoney(v.priceDeltaMinor, baseCurrency)})`
                    : ""}
                </option>
              ))}
            </Select>
          </div>
        )
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700" role="alert">{error}</p>}

      <div>
        <label className="label" htmlFor="quantity">Quantity {moq > 1 && <span className="text-navy-400">(MOQ {moq})</span>}</label>
        <div className="flex w-32 items-center rounded-lg border border-navy-200">
          <button type="button" className="px-3 py-2 text-navy-500" onClick={() => setQuantity((q) => Math.max(moq, q - 1))}>
            −
          </button>
          <input
            id="quantity"
            readOnly
            value={quantity}
            className="w-full border-0 bg-transparent text-center text-sm font-semibold text-navy-900 focus:outline-none"
          />
          <button type="button" className="px-3 py-2 text-navy-500" onClick={() => setQuantity((q) => q + 1)}>
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <form action={addToCartAction} onSubmit={guardSubmit} className="w-full sm:flex-1">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={formVariantId} />
          <input type="hidden" name="quantity" value={quantity} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="redirectTo" value="/cart" />
          <SubmitButton className="btn-outline w-full">
            Add to Cart
          </SubmitButton>
        </form>
        <form action={addToCartAction} onSubmit={guardSubmit} className="w-full sm:flex-1">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={formVariantId} />
          <input type="hidden" name="quantity" value={quantity} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="redirectTo" value="/checkout" />
          <SubmitButton className="btn-primary w-full">
            Buy Now
          </SubmitButton>
        </form>
      </div>

      <form action={requestSourcingForProductAction} className="rounded-xl2 border border-dashed border-navy-200 p-4">
        <input type="hidden" name="productName" value={productName} />
        <input type="hidden" name="productImageUrl" value={imageUrl ?? ""} />
        <input type="hidden" name="quantity" value={quantity} />
        <input type="hidden" name="slug" value={slug} />
        <p className="text-sm font-medium text-navy-800">Not quite what you need?</p>
        <p className="mt-1 text-xs text-navy-500">
          Request sourcing and our team will find alternative suppliers, pricing or MOQ options for this item.
        </p>
        <SubmitButton className="btn-ghost btn-sm mt-2 !px-0">
          Request Sourcing →
        </SubmitButton>
      </form>
    </div>
  );
}
