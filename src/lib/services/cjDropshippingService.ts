import "server-only";

/**
 * CjDropshippingService — a REAL, LIVE integration against CJdropshipping's
 * public API (https://developers.cjdropshipping.com), unlike every other
 * service in this directory. It only does two things: search CJ's catalog,
 * and fetch one product's full detail — both read-only. Nothing here places
 * an order or moves money; importing a product into ATG's own catalog
 * (creating a `Product` row) is a separate, explicit admin action.
 *
 * Requires `CJ_API_KEY` (from CJ dashboard → My CJ → API → Generate API
 * Key). Without it, every method throws a clear "not configured" error
 * rather than silently returning fake data.
 *
 * CJ's free/starter tier is rate-limited to 1 request/second — this class
 * serializes calls and waits between them rather than bursting, and caches
 * the access token (valid 15 days) instead of re-authenticating every call.
 */

const BASE_URL = "https://developers.cjdropshipping.com/api2.0/v1";
const MIN_REQUEST_INTERVAL_MS = 1100;

export interface CjProductSummary {
  pid: string;
  name: string;
  sku: string;
  imageUrl: string;
  sellPriceMinorUsd: number;
  categoryName: string | null;
  warehouseInventory: number | null;
  sourceUrl: string;
}

export interface CjProductVariant {
  vid: string;
  name: string;
  sku: string;
  priceMinorUsd: number;
  weightGrams: number | null;
  attributes: Record<string, string>;
}

export interface CjProductDetail extends CjProductSummary {
  description: string | null;
  images: string[];
  weightGrams: number | null;
  variants: CjProductVariant[];
}

export interface CjDropshippingService {
  isConfigured(): boolean;
  search(keyword: string, page?: number): Promise<CjProductSummary[]>;
  getById(pid: string): Promise<CjProductDetail | null>;
  /**
   * Registers a product in CJ's own "My Products" list (visible in your CJ
   * dashboard) — purely for your own tracking of what you're sourcing
   * through CJ. Does not place an order or move money. Returns false rather
   * than throwing on failure, since this is a best-effort side effect —
   * callers should still treat the ATG import itself as successful.
   */
  addToMyProduct(pid: string): Promise<boolean>;
}

interface CjApiEnvelope<T> {
  code: number;
  result: boolean;
  message: string;
  data: T;
}

class LiveCjDropshippingService implements CjDropshippingService {
  private accessToken: string | null = null;
  private accessTokenExpiresAt = 0;
  private lastRequestAt = 0;

  isConfigured(): boolean {
    return !!process.env.CJ_API_KEY;
  }

  private requireConfigured() {
    if (!this.isConfigured()) {
      throw new Error(
        "CJdropshipping is not configured — set CJ_API_KEY (from CJ dashboard → My CJ → API) before using this integration.",
      );
    }
  }

  private async throttle() {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, MIN_REQUEST_INTERVAL_MS - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.accessTokenExpiresAt) {
      return this.accessToken;
    }

    await this.throttle();
    const res = await fetch(`${BASE_URL}/authentication/getAccessToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: process.env.CJ_API_KEY }),
    });
    const json = (await res.json()) as CjApiEnvelope<{
      accessToken: string;
      accessTokenExpiryDate: string;
    }>;
    if (!res.ok || !json.result || !json.data?.accessToken) {
      throw new Error(`CJdropshipping authentication failed: ${json.message || res.statusText}`);
    }

    this.accessToken = json.data.accessToken;
    // Trust CJ's stated ~15-day expiry, but refresh a day early to be safe.
    this.accessTokenExpiresAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
    return this.accessToken;
  }

  private async authedFetch<T>(path: string, params: Record<string, string | number | undefined>): Promise<T> {
    this.requireConfigured();
    const token = await this.getAccessToken();
    await this.throttle();

    const query = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    );
    const res = await fetch(`${BASE_URL}${path}?${query.toString()}`, {
      headers: { "CJ-Access-Token": token },
    });
    const json = (await res.json()) as CjApiEnvelope<T>;
    if (!res.ok || !json.result) {
      throw new Error(`CJdropshipping API error (${path}): ${json.message || res.statusText}`);
    }
    return json.data;
  }

  private async authedPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
    this.requireConfigured();
    const token = await this.getAccessToken();
    await this.throttle();

    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "CJ-Access-Token": token },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as CjApiEnvelope<T>;
    if (!res.ok || !json.result) {
      throw new Error(`CJdropshipping API error (${path}): ${json.message || res.statusText}`);
    }
    return json.data;
  }

  async search(keyword: string, page = 1): Promise<CjProductSummary[]> {
    // CJ's real response nests results as data.content[].productList[] (not
    // the flat data.list[] their docs summary implied) — verified directly
    // against the live API, not assumed from documentation prose.
    const data = await this.authedFetch<{
      content: Array<{
        productList: Array<{
          id: string;
          nameEn: string;
          sku: string;
          bigImage: string;
          sellPrice: string;
          threeCategoryName?: string | null;
          warehouseInventoryNum?: number;
        }>;
      }>;
    }>("/product/listV2", { keyWord: keyword, page, size: 20 });

    const products = (data.content ?? []).flatMap((c) => c.productList ?? []);
    return products.map((p) => ({
      pid: p.id,
      name: p.nameEn,
      sku: p.sku,
      imageUrl: p.bigImage,
      sellPriceMinorUsd: Math.round(parseFloat(p.sellPrice) * 100),
      categoryName: p.threeCategoryName ?? null,
      warehouseInventory: p.warehouseInventoryNum ?? null,
      sourceUrl: `https://cjdropshipping.com/product/${p.id}.html`,
    }));
  }

  async getById(pid: string): Promise<CjProductDetail | null> {
    // Field types verified directly against the live API: productWeight is
    // a numeric STRING ("35.00"), while variant weight/price come back as
    // actual numbers — an inconsistency in CJ's own API, not a typo here.
    const data = await this.authedFetch<{
      pid: string;
      productNameEn: string;
      productSku: string;
      bigImage: string;
      productImageSet?: string[];
      sellPrice: string;
      description?: string;
      categoryName?: string;
      productWeight?: string;
      variants?: Array<{
        vid: string;
        variantNameEn: string;
        variantSku: string;
        variantSellPrice: number | string;
        variantWeight?: number | string;
        variantKey?: string;
      }>;
    } | null>("/product/query", { pid });

    if (!data) return null;

    return {
      pid: data.pid,
      name: data.productNameEn,
      sku: data.productSku,
      imageUrl: data.bigImage,
      sellPriceMinorUsd: Math.round(parseFloat(data.sellPrice) * 100),
      categoryName: data.categoryName ?? null,
      warehouseInventory: null,
      sourceUrl: `https://cjdropshipping.com/product/${data.pid}.html`,
      description: data.description ? stripHtml(data.description) : null,
      images: data.productImageSet?.length ? data.productImageSet : [data.bigImage],
      weightGrams: data.productWeight ? Math.round(parseFloat(data.productWeight)) : null,
      variants: (data.variants ?? []).map((v) => ({
        vid: v.vid,
        name: v.variantNameEn,
        sku: v.variantSku,
        priceMinorUsd: Math.round(Number(v.variantSellPrice) * 100),
        weightGrams: v.variantWeight != null ? Math.round(Number(v.variantWeight)) : null,
        attributes: (v.variantKey ? { variant: v.variantKey } : {}) as Record<string, string>,
      })),
    };
  }

  async addToMyProduct(pid: string): Promise<boolean> {
    try {
      const data = await this.authedPost<boolean>("/product/addToMyProduct", { productId: pid });
      return data === true;
    } catch {
      return false;
    }
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const cjDropshippingService: CjDropshippingService = new LiveCjDropshippingService();
