import "server-only";
import { db } from "@/lib/db";
import { currencyRateService } from "./currencyRateService";
import type { RateProvider } from "./rateProvider";
import type { ShippingRateOption, ShippingRateQuoteResult, ShippingRateRequest } from "./types";

/**
 * Live DHL Express prices via the MyDHL API "Rating" service (GET /rates).
 * Returns the rates on ATG's own DHL account, plus DHL's delivery estimate.
 *
 * Off until ALL of these are true (otherwise checkout keeps using the admin
 * rate cards, exactly as before):
 *   1. DHL_EXPRESS_API_KEY, DHL_EXPRESS_API_SECRET and DHL_EXPRESS_ACCOUNT_NUMBER
 *      are set (the MyDHL API credentials — NOT the tracking key, DHL_API_KEY).
 *   2. A Carrier row with code "DHL" is active and has "Live API enabled" ticked.
 *   3. An active service level named "Express" exists (live DHL prices are
 *      offered to customers as that tier).
 *
 * Customer price = DHL's price + the global markup/handling settings
 * (ShippingGlobalSettings), the same way manual rate cards are marked up.
 * Errors throw — shippingCalculationService logs them and falls back to the
 * manual rate cards; nothing is ever quoted as $0.
 */

const TEST_BASE_URL = "https://express.api.dhl.com/mydhlapi/test";
const REQUEST_TIMEOUT_MS = 6000;
const CACHE_TTL_MS = 10 * 60 * 1000;
const EXPRESS_SERVICE_LEVEL_NAME = "Express";

// DHL requires box dimensions; used only when a product has none saved.
const ASSUMED_DIMENSION_CM = 10;

// DHL wants a city for every lane. Used when the order has no region/city.
const CAPITAL_BY_COUNTRY: Record<string, string> = {
  NG: "Lagos",
  GM: "Banjul",
  GH: "Accra",
  SN: "Dakar",
  CN: "Guangzhou",
  US: "New York",
  GB: "London",
  AE: "Dubai",
  HK: "Hong Kong",
  IN: "Mumbai",
  TR: "Istanbul",
};

interface DhlRatesProduct {
  productName?: string;
  productCode?: string;
  totalPrice?: { currencyType?: string; priceCurrency?: string; price?: number }[];
  deliveryCapabilities?: {
    estimatedDeliveryDateAndTime?: string;
    totalTransitDays?: string | number;
  };
}

interface DhlRatesResponse {
  products?: DhlRatesProduct[];
}

const cache = new Map<string, { at: number; options: ShippingRateOption[] }>();

function env() {
  return {
    key: process.env.DHL_EXPRESS_API_KEY,
    secret: process.env.DHL_EXPRESS_API_SECRET,
    account: process.env.DHL_EXPRESS_ACCOUNT_NUMBER,
    baseUrl: (process.env.DHL_EXPRESS_BASE_URL || TEST_BASE_URL).replace(/\/+$/, ""),
  };
}

// Optional JSON map of origin postal codes, e.g. {"CN":"510000","NG":"100001"}.
function originPostalCode(countryIso: string): string | undefined {
  try {
    const map = JSON.parse(process.env.DHL_EXPRESS_ORIGIN_POSTAL_CODES || "{}") as Record<string, string>;
    return map[countryIso];
  } catch {
    return undefined;
  }
}

// Next weekday, as DHL needs a planned shipping date.
function plannedShippingDate(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function billingPrice(p: DhlRatesProduct): { price: number; currency: string } | null {
  const prices = p.totalPrice ?? [];
  // BILLC = the account's billing currency, i.e. what DHL will actually invoice.
  const billed = prices.find((t) => t.currencyType === "BILLC") ?? prices[0];
  if (!billed || typeof billed.price !== "number" || !billed.priceCurrency || billed.price <= 0) return null;
  return { price: billed.price, currency: billed.priceCurrency };
}

function transitDays(p: DhlRatesProduct): { min: number; max: number } {
  const caps = p.deliveryCapabilities;
  const days = Number(caps?.totalTransitDays);
  if (Number.isFinite(days) && days > 0) return { min: days, max: days + 1 };
  const eta = caps?.estimatedDeliveryDateAndTime ? Date.parse(caps.estimatedDeliveryDateAndTime) : NaN;
  if (Number.isFinite(eta)) {
    const d = Math.max(1, Math.ceil((eta - Date.now()) / 86_400_000));
    return { min: d, max: d + 1 };
  }
  return { min: 3, max: 7 };
}

class DhlRateProvider implements RateProvider {
  readonly name = "DHL";

  isConfigured(): boolean {
    const { key, secret, account } = env();
    return !!(key && secret && account);
  }

  async getRates(request: ShippingRateRequest): Promise<ShippingRateQuoteResult> {
    const { originIso, destinationIso, destinationRegion, package: pkg } = request;
    const none = (unavailableReason: string): ShippingRateQuoteResult => ({
      originIso,
      destinationIso,
      options: [],
      unavailableReason,
    });

    // Admin switch + the service level live prices are shown under.
    const [carrier, serviceLevel, origin, settings] = await Promise.all([
      db.carrier.findFirst({ where: { code: "DHL", isActive: true } }),
      db.shippingServiceLevel.findFirst({ where: { name: EXPRESS_SERVICE_LEVEL_NAME, isActive: true } }),
      db.shippingOrigin.findFirst({ where: { countryIso: originIso, isActive: true } }),
      db.shippingGlobalSettings.findFirst(),
    ]);
    if (!carrier?.isLiveApiEnabled) return none("DHL live rates are switched off.");
    if (!serviceLevel) return none(`No active "${EXPRESS_SERVICE_LEVEL_NAME}" service level for live DHL rates.`);
    if (!origin) return none(`No active shipping origin configured for "${originIso}".`);
    if (pkg.weightGrams <= 0) return none("Product weight is missing.");

    const assumedDimensions = !(pkg.lengthCm && pkg.widthCm && pkg.heightCm);
    const lengthCm = pkg.lengthCm || ASSUMED_DIMENSION_CM;
    const widthCm = pkg.widthCm || ASSUMED_DIMENSION_CM;
    const heightCm = pkg.heightCm || ASSUMED_DIMENSION_CM;
    const weightKg = Math.round(pkg.weightGrams) / 1000;
    const destinationCity = destinationRegion || CAPITAL_BY_COUNTRY[destinationIso] || destinationIso;
    const originCity = origin.city || CAPITAL_BY_COUNTRY[originIso] || origin.name;

    const cacheKey = [originIso, originCity, destinationIso, destinationCity, weightKg, lengthCm, widthCm, heightCm].join("|");
    const hit = cache.get(cacheKey);
    let options: ShippingRateOption[];
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      options = hit.options;
    } else {
      const { key, secret, account, baseUrl } = env();
      const params = new URLSearchParams({
        accountNumber: account!,
        originCountryCode: originIso,
        originCityName: originCity,
        destinationCountryCode: destinationIso,
        destinationCityName: destinationCity,
        weight: String(weightKg),
        length: String(lengthCm),
        width: String(widthCm),
        height: String(heightCm),
        plannedShippingDate: plannedShippingDate(),
        isCustomsDeclarable: String(originIso !== destinationIso),
        unitOfMeasurement: "metric",
      });
      const originPostal = originPostalCode(originIso);
      if (originPostal) params.set("originPostalCode", originPostal);

      const res = await fetch(`${baseUrl}/rates?${params.toString()}`, {
        headers: {
          Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) {
        const body = (await res.text().catch(() => "")).slice(0, 300);
        throw new Error(`DHL rates request failed (${res.status}): ${body}`);
      }
      const data = (await res.json()) as DhlRatesResponse;

      // Offered as the "Express" tier: the cheapest DHL product that came back.
      const priced = (data.products ?? [])
        .map((p) => ({ p, billed: billingPrice(p) }))
        .filter((x): x is { p: DhlRatesProduct; billed: { price: number; currency: string } } => x.billed !== null)
        .sort((a, b) => a.billed.price - b.billed.price)[0];
      if (!priced) {
        throw new Error("DHL returned no priced products for this lane.");
      }

      const currency = priced.billed.currency;
      const carrierCostMinor = Math.round(priced.billed.price * 100);
      const markupEnabled = settings?.markupEnabled ?? true;
      let markupMinor = 0;
      if (markupEnabled) {
        const fixedMinor = (await currencyRateService.convert(settings?.defaultMarkupFixedMinor ?? 0, "USD", currency)).amountMinor;
        markupMinor = Math.round((carrierCostMinor * (settings?.defaultMarkupPercent ?? 0)) / 100) + fixedMinor;
      }
      const handlingFeeMinor = (await currencyRateService.convert(settings?.defaultHandlingFeeMinor ?? 0, "USD", currency)).amountMinor;
      const days = transitDays(priced.p);
      const volumetricWeightGrams = Math.round(((lengthCm * widthCm * heightCm) / (settings?.volumetricDivisor ?? 5000)) * 1000);

      options = [
        {
          serviceLevelId: serviceLevel.id,
          serviceLevelName: serviceLevel.name,
          serviceLevelSortOrder: serviceLevel.sortOrder,
          carrierName: carrier.name,
          carrierId: carrier.id,
          trackingAvailable: true,
          actualWeightGrams: pkg.weightGrams,
          volumetricWeightGrams,
          chargeableWeightGrams: Math.max(pkg.weightGrams, volumetricWeightGrams),
          carrierCostMinor,
          markupMinor,
          handlingFeeMinor,
          customerPriceMinor: carrierCostMinor + markupMinor + handlingFeeMinor,
          currency,
          estimatedDeliveryDaysMin: days.min,
          estimatedDeliveryDaysMax: days.max,
          rateSource: "LIVE_API",
          rawProviderResponse: {
            productCode: priced.p.productCode,
            productName: priced.p.productName,
            totalPrice: priced.p.totalPrice,
            deliveryCapabilities: priced.p.deliveryCapabilities,
            assumedDimensions,
          },
        },
      ];
      cache.set(cacheKey, { at: Date.now(), options });
    }

    return { originIso, destinationIso, options };
  }
}

export const dhlRateProvider: RateProvider = new DhlRateProvider();
