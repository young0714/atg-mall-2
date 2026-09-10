"use client";

import { useState } from "react";
import type { Currency } from "@prisma/client";
import { formatMoney } from "@/lib/money";
import { addToCartAction, requestSourcingForProductAction } from "@/app/product/[slug]/actions";
import { LandedCostBreakdown } from "./LandedCostBreakdown";
import type { LandedCostBreakdown as Breakdown } from "@/lib/services/pricingService";

interface Variant {
  id: string;
  name: string;
  priceDeltaMinor: number;
}

export function ProductPurchasePanel({
  productId,
  slug,
  variants,
  moq,
  baseCurrency,
  basePriceMinor,
  breakdown,
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
  breakdown: Breakdown;
  imageUrl: string | null;
  productName: string;
  affiliateUrl?: string | null;
  affiliateProvider?: string | null;
}) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(moq);

  const selectedVariant = variants.find((v) => v.id === variantId);
  const unitPrice = basePriceMinor + (selectedVariant?.priceDeltaMinor ?? 0);

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
        <p className="text-xs uppercase tracking-wide text-navy-400">Supplier price (China)</p>
        <p className="text-2xl font-display font-bold text-navy-900">
          {formatMoney(unitPrice, baseCurrency)}{" "}
          <span className="text-sm font-normal text-navy-400">/ unit</span>
        </p>
      </div>

      {variants.length > 0 && (
        <div>
          <label className="label">Variant</label>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariantId(v.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
                  variantId === v.id
                    ? "border-atgblue-500 bg-atgblue-50 text-atgblue-700"
                    : "border-navy-200 text-navy-600 hover:bg-sand-100"
                }`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

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

      <LandedCostBreakdown breakdown={breakdown} quantity={quantity} />

      <div className="flex flex-col gap-2.5 sm:flex-row">
        <form action={addToCartAction} className="w-full sm:flex-1">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={variantId} />
          <input type="hidden" name="quantity" value={quantity} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="redirectTo" value="/cart" />
          <button type="submit" className="btn-outline w-full">
            Add to Cart
          </button>
        </form>
        <form action={addToCartAction} className="w-full sm:flex-1">
          <input type="hidden" name="productId" value={productId} />
          <input type="hidden" name="variantId" value={variantId} />
          <input type="hidden" name="quantity" value={quantity} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="redirectTo" value="/checkout" />
          <button type="submit" className="btn-primary w-full">
            Buy Now
          </button>
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
        <button type="submit" className="btn-ghost btn-sm mt-2 !px-0">
          Request Sourcing →
        </button>
      </form>
    </div>
  );
}
