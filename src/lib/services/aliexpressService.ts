import "server-only";
import { callAliExpressApi, aliexpressIsConfigured } from "./aliexpressClient";
import { getValidAliExpressAccessToken } from "./aliexpressAuthService";
import { stripHtml } from "./cjDropshippingService";

/**
 * AliExpressService — product lookups against AliExpress's real Dropshipping
 * API. Unlike CjDropshippingService, this has NO search/browse capability:
 * ATG Mall's AliExpress app only has the "Drop Shipping" API category
 * approved, and product discovery (keyword search, trending products) lives
 * in AliExpress's separate "Affiliate" API category, which isn't granted —
 * confirmed live (InsufficientPermission) before writing this. Product
 * detail lookup is by exact product ID only (paste a link or ID copied from
 * aliexpress.com), which the Dropshipping API does support.
 *
 * Field names below (subject, image_urls, ae_item_sku_info_dtos, etc.) are
 * the real, verified response shape of aliexpress.ds.product.get.
 */

export interface AliExpressProductVariant {
  skuId: string;
  name: string;
  priceMinorUsd: number;
  stock: number | null;
  attributes: Record<string, string>;
}

export interface AliExpressProductDetail {
  productId: string;
  name: string;
  imageUrl: string;
  images: string[];
  sellPriceMinorUsd: number;
  currency: string;
  categoryId: number | null;
  description: string | null;
  weightGrams: number | null;
  variants: AliExpressProductVariant[];
  sourceUrl: string;
}

export interface AliExpressService {
  isConfigured(): boolean;
  /** Accepts a raw numeric product ID or a full aliexpress.com product URL. Returns null if no ID could be found. */
  parseProductId(idOrUrl: string): string | null;
  getById(productId: string): Promise<AliExpressProductDetail | null>;
}

interface DsProductSkuProperty {
  sku_property_name?: string;
  sku_property_value?: string;
}

interface DsProductSku {
  id?: string | number;
  sku_code?: string;
  sku_price?: string;
  sku_available_stock?: number;
  s_k_u_available_stock?: number;
  aeop_s_k_u_propertys?: DsProductSkuProperty[];
}

interface DsProductResult {
  ae_item_base_info_dto?: {
    product_id?: number;
    subject?: string;
    currency_code?: string;
    detail?: string;
    category_id?: number;
  };
  ae_multimedia_info_dto?: {
    image_urls?: string;
  };
  package_info_dto?: {
    gross_weight?: string;
  };
  ae_item_sku_info_dtos?: DsProductSku[];
}

class LiveAliExpressService implements AliExpressService {
  isConfigured(): boolean {
    return aliexpressIsConfigured();
  }

  private requireConfigured() {
    if (!this.isConfigured()) {
      throw new Error("AliExpress is not configured — set ALIEXPRESS_APP_KEY and ALIEXPRESS_APP_SECRET.");
    }
  }

  parseProductId(idOrUrl: string): string | null {
    const trimmed = idOrUrl.trim();
    if (/^\d+$/.test(trimmed)) return trimmed;

    // Matches https://www.aliexpress.com/item/1005001234567890.html and
    // similar (item/<id>.html, /i/<id>.html, ?productId=<id>).
    const pathMatch = trimmed.match(/\/(?:item|i)\/(\d+)\.html/);
    if (pathMatch) return pathMatch[1];

    const queryMatch = trimmed.match(/[?&]productId=(\d+)/);
    if (queryMatch) return queryMatch[1];

    return null;
  }

  async getById(productId: string): Promise<AliExpressProductDetail | null> {
    this.requireConfigured();
    const accessToken = await getValidAliExpressAccessToken();

    let response: { aliexpress_ds_product_get_response?: { result?: DsProductResult } };
    try {
      response = await callAliExpressApi("aliexpress.ds.product.get", {
        product_id: productId,
        ship_to_country: "US",
        target_currency: "USD",
        target_language: "EN",
      }, accessToken);
    } catch (e) {
      if (e instanceof Error && /not exist|not found|invalid.*product/i.test(e.message)) return null;
      throw e;
    }

    const data = response.aliexpress_ds_product_get_response?.result;
    if (!data?.ae_item_base_info_dto) return null;

    const base = data.ae_item_base_info_dto;
    const images = (data.ae_multimedia_info_dto?.image_urls ?? "")
      .split(/[;,]/)
      .map((u) => u.trim())
      .filter(Boolean);

    const skus = data.ae_item_sku_info_dtos ?? [];
    const skuPrices = skus.map((s) => parseFloat(s.sku_price ?? "")).filter((n) => Number.isFinite(n));
    const sellPriceMinorUsd = Math.round((skuPrices.length ? Math.min(...skuPrices) : 0) * 100);

    const grossWeightKg = parseFloat(base ? (data.package_info_dto?.gross_weight ?? "") : "");

    return {
      productId,
      name: base.subject ?? `AliExpress product ${productId}`,
      imageUrl: images[0] ?? "",
      images,
      sellPriceMinorUsd,
      currency: base.currency_code ?? "USD",
      categoryId: base.category_id ?? null,
      description: base.detail ? stripHtml(base.detail) : null,
      weightGrams: Number.isFinite(grossWeightKg) && grossWeightKg > 0 ? Math.round(grossWeightKg * 1000) : null,
      variants: skus.map((s) => ({
        skuId: String(s.id ?? s.sku_code ?? ""),
        name:
          (s.aeop_s_k_u_propertys ?? [])
            .map((p) => p.sku_property_value)
            .filter(Boolean)
            .join(" / ") || (s.sku_code ?? "Variant"),
        priceMinorUsd: Math.round(parseFloat(s.sku_price ?? "0") * 100),
        stock: s.sku_available_stock ?? s.s_k_u_available_stock ?? null,
        attributes: Object.fromEntries(
          (s.aeop_s_k_u_propertys ?? [])
            .filter((p) => p.sku_property_name && p.sku_property_value)
            .map((p) => [p.sku_property_name as string, p.sku_property_value as string]),
        ),
      })),
      sourceUrl: `https://www.aliexpress.com/item/${productId}.html`,
    };
  }
}

export const aliexpressService: AliExpressService = new LiveAliExpressService();
