// Shared types for the external-integration service layer. Most services in
// this directory are an interface + a Mock implementation, since ATG Mall
// doesn't yet have credentials/agreements for 1688, Taobao, payment or
// courier APIs. `cjDropshippingService.ts` is the exception — CJdropshipping
// has a real self-serve API, so that one is a genuine `Live*` implementation
// once `CJ_API_KEY` is configured (see that file's own doc comment and its
// own types, which intentionally don't reuse these — CJ's real response
// shape differs enough from this mock-oriented one to not force-fit it).
// When other integrations go live, implement a `Live*` class satisfying the
// same interface and swap it in at the bottom of each file — nothing in the
// UI should need to change.

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
