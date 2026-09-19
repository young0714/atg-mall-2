import "server-only";

/**
 * MatterhornService — a REAL, LIVE integration against Matterhorn Wholesale's
 * B2B API (https://matterhorn-wholesale.com/B2BAPI). European women's
 * fashion wholesaler — read-only here, same as
 * cjDropshippingService.ts/aliexpressService.ts: fetches one product's
 * detail, nothing here places an order or moves money.
 *
 * Requires `MATTERHORN_API_KEY` (generated from your Matterhorn account
 * panel). Auth is a single `Authorization: <key>` header — verified live
 * against the real API that it's the raw key, NOT a `Bearer <key>` prefix
 * (the latter returns 403).
 *
 * The published Swagger spec (swaggerhub.com/apis-docs/MatterhornModa/...)
 * is wrong on two counts, found by inspecting a real response directly
 * rather than trusting the docs: there's no `price_net` field — instead a
 * `prices` object keyed by currency code, which conveniently already
 * includes a `USD` value (no conversion needed at all, better than
 * converting from EUR ourselves would have been); and there IS a `weight`
 * field (grams), despite the spec omitting it entirely.
 *
 * Unlike CJ/AliExpress, Matterhorn has no keyword search endpoint — only
 * lookup by exact product id (or filtering by brand/category, not exposed
 * here). The import UI for this source is "paste a product link or ID",
 * same as AliExpress's.
 *
 * Also unlike CJ/AliExpress: variants here are sizes only (not colors —
 * each color is a separate product id, linked via `other_colors`), sizes
 * carry no price of their own (the whole product has one price), and
 * there's no description field at all.
 */

const BASE_URL = "https://matterhorn-wholesale.com/B2BAPI";

export interface MatterhornVariant {
  variantUid: string;
  size: string;
  stock: number;
}

export interface MatterhornProduct {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string;
  images: string[];
  sellPriceMinorUsd: number;
  weightGrams: number | null;
  sourceUrl: string;
  categoryName: string | null;
  variants: MatterhornVariant[];
}

export interface MatterhornService {
  isConfigured(): boolean;
  parseProductId(idOrUrl: string): string | null;
  getById(productId: string): Promise<MatterhornProduct | null>;
}

interface MatterhornApiItem {
  id: number;
  name: string;
  color?: string | null;
  category_name?: string | null;
  category_path?: string | null;
  brand?: string | null;
  // Verified live: no price_net field — a per-currency map instead.
  prices: Record<string, number>;
  weight?: number | string | null; // grams; seen as a plain number live, but treated defensively as possibly-string like several other CJ/Matterhorn numeric fields
  url: string;
  images?: string[];
  variants?: Array<{ variant_uid: number; name: string; stock: number }>;
}

class LiveMatterhornService implements MatterhornService {
  isConfigured(): boolean {
    return !!process.env.MATTERHORN_API_KEY;
  }

  private requireConfigured() {
    if (!this.isConfigured()) {
      throw new Error(
        "Matterhorn is not configured — set MATTERHORN_API_KEY (generated from your Matterhorn account panel) before using this integration.",
      );
    }
  }

  parseProductId(idOrUrl: string): string | null {
    const trimmed = idOrUrl.trim();
    if (/^\d+$/.test(trimmed)) return trimmed;
    // Matterhorn product URLs end in ..._prod_id-<id>.htm
    const match = trimmed.match(/prod_id-(\d+)\.htm/);
    return match ? match[1] : null;
  }

  private async authedFetch<T>(path: string): Promise<T | null> {
    this.requireConfigured();
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Authorization: process.env.MATTERHORN_API_KEY! },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Matterhorn API error (${path}): HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  }

  async getById(productId: string): Promise<MatterhornProduct | null> {
    const data = await this.authedFetch<MatterhornApiItem>(`/ITEMS/${productId}`);
    if (!data) return null;

    // No description field exists in Matterhorn's API at all — this
    // composes a factual one from fields we do have, rather than leaving
    // it blank; still fully editable before staging like everything else.
    const descriptionParts = [data.brand, data.category_name, data.color].filter(Boolean);
    const description = descriptionParts.length > 0 ? descriptionParts.join(" — ") : null;

    const usdPrice = data.prices?.USD;
    if (usdPrice == null) {
      throw new Error(`Matterhorn product ${data.id} has no USD price available`);
    }
    const sellPriceMinorUsd = Math.round(usdPrice * 100);

    const weightGrams = data.weight != null ? Math.round(Number(data.weight)) : null;

    const images = data.images ?? [];

    return {
      id: String(data.id),
      name: data.name,
      description,
      imageUrl: images[0] ?? "",
      images,
      sellPriceMinorUsd,
      weightGrams,
      sourceUrl: data.url.replace(/^http:\/\//, "https://"),
      categoryName: data.category_name ?? null,
      variants: (data.variants ?? []).map((v) => ({
        variantUid: String(v.variant_uid),
        size: v.name,
        stock: v.stock,
      })),
    };
  }
}

export const matterhornService: MatterhornService = new LiveMatterhornService();
