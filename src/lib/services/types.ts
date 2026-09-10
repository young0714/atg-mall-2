// Shared types for the external-integration service layer. Every service in
// this directory is an interface + a Mock implementation. NONE of them call
// a real 1688/Taobao/payment/courier API — that would require credentials
// and legal/commercial agreements ATG Mall does not yet have. When those are
// in place, implement a `Live*` class satisfying the same interface and swap
// it in at the bottom of each file. Nothing in the UI should ever need to
// change when that happens.

export interface RemoteProductSummary {
  externalId: string;
  platform: "MOCK_1688" | "MOCK_TAOBAO";
  title: string;
  imageUrl: string;
  priceMinor: number; // CNY minor units (fen)
  currency: "CNY";
  moq: number;
  supplierName: string;
  supplierLocation: string;
  rating: number;
  sourceUrl: string;
}

export interface RemoteProductDetail extends RemoteProductSummary {
  description: string;
  images: string[];
  variants: { name: string; attributes: Record<string, string> }[];
}
