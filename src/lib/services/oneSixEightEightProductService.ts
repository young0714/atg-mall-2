import "server-only";
import type { RemoteProductDetail, RemoteProductSummary } from "./types";

/**
 * 1688ProductService — integration seam for 1688.com.
 *
 * IMPORTANT: There is no live 1688 API integration in this codebase. 1688
 * has no public self-serve API; a production integration requires either an
 * authorized 1688/Alibaba open-platform agreement or a licensed data
 * partner. Until ATG Mall has that in place, `MockOneSixEightEightProductService`
 * below returns clearly-labeled realistic mock data so the UI, pricing, and
 * ordering flows can be built and demoed honestly.
 *
 * To go live: implement `LiveOneSixEightEightProductService` against the
 * authorized API and swap the export at the bottom of this file. Nothing
 * elsewhere in the codebase should need to change, because callers only
 * depend on the `OneSixEightEightProductService` interface.
 */
export interface OneSixEightEightProductService {
  search(query: string): Promise<RemoteProductSummary[]>;
  getById(externalId: string): Promise<RemoteProductDetail | null>;
}

const MOCK_CATALOG: RemoteProductDetail[] = [
  {
    externalId: "1688-77213456",
    platform: "MOCK_1688",
    title: "Wireless Bluetooth Earbuds Pro — Bulk Lot",
    imageUrl: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800",
    priceMinor: 3500,
    currency: "CNY",
    moq: 20,
    supplierName: "Shenzhen Yunfeng Electronics Co., Ltd.",
    supplierLocation: "Shenzhen, Guangdong",
    rating: 4.7,
    sourceUrl: "https://www.1688.com/mock/77213456",
    description:
      "TWS Bluetooth 5.3 earbuds with charging case, sold by the carton. Mock listing for demonstration — pricing and MOQ are illustrative pending a live 1688 integration.",
    images: [
      "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800",
      "https://images.unsplash.com/photo-1590658165737-15a047b7c823?w=800",
    ],
    variants: [
      { name: "Black", attributes: { color: "Black" } },
      { name: "White", attributes: { color: "White" } },
    ],
  },
  {
    externalId: "1688-88451209",
    platform: "MOCK_1688",
    title: "Stainless Steel Kitchen Knife Set (7-Piece)",
    imageUrl: "https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800",
    priceMinor: 4800,
    currency: "CNY",
    moq: 12,
    supplierName: "Yangjiang Hongli Kitchenware Factory",
    supplierLocation: "Yangjiang, Guangdong",
    rating: 4.6,
    sourceUrl: "https://www.1688.com/mock/88451209",
    description:
      "7-piece kitchen knife set with acrylic stand, wholesale pricing. Mock listing pending live 1688 API access.",
    images: ["https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800"],
    variants: [{ name: "Standard", attributes: {} }],
  },
  {
    externalId: "1688-90233871",
    platform: "MOCK_1688",
    title: "Men's Cargo Pants — Wholesale Carton (12 pcs)",
    imageUrl: "https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800",
    priceMinor: 5200,
    currency: "CNY",
    moq: 12,
    supplierName: "Guangzhou Meihao Garment Co.",
    supplierLocation: "Guangzhou, Guangdong",
    rating: 4.4,
    sourceUrl: "https://www.1688.com/mock/90233871",
    description: "Mixed-size cargo pants carton, assorted colors. Mock listing.",
    images: ["https://images.unsplash.com/photo-1517438476312-10d79c077509?w=800"],
    variants: [
      { name: "Khaki / M-XL mix", attributes: { color: "Khaki" } },
      { name: "Black / M-XL mix", attributes: { color: "Black" } },
    ],
  },
];

class MockOneSixEightEightProductService implements OneSixEightEightProductService {
  async search(query: string): Promise<RemoteProductSummary[]> {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_CATALOG;
    return MOCK_CATALOG.filter((p) => p.title.toLowerCase().includes(q));
  }

  async getById(externalId: string): Promise<RemoteProductDetail | null> {
    return MOCK_CATALOG.find((p) => p.externalId === externalId) ?? null;
  }
}

export const oneSixEightEightProductService: OneSixEightEightProductService =
  new MockOneSixEightEightProductService();
