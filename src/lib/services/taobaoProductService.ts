import "server-only";
import type { RemoteProductDetail, RemoteProductSummary } from "./types";

/**
 * TaobaoProductService — integration seam for Taobao.com.
 *
 * Same caveat as 1688ProductService: Taobao does not offer a general
 * self-serve public API for third-party shopping agents. This mock
 * implementation stands in until ATG Mall has an authorized data
 * partnership or Alibaba open-platform agreement in place. See
 * `oneSixEightEightProductService.ts` for the integration pattern to follow.
 */
export interface TaobaoProductService {
  search(query: string): Promise<RemoteProductSummary[]>;
  getById(externalId: string): Promise<RemoteProductDetail | null>;
}

const MOCK_CATALOG: RemoteProductDetail[] = [
  {
    externalId: "taobao-61239987",
    platform: "MOCK_TAOBAO",
    title: "Minimalist Ceramic Dinnerware Set (16-Piece)",
    imageUrl: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800",
    priceMinor: 12800,
    currency: "CNY",
    moq: 1,
    supplierName: "Jingdezhen Yushan Ceramics",
    supplierLocation: "Jingdezhen, Jiangxi",
    rating: 4.8,
    sourceUrl: "https://www.taobao.com/mock/61239987",
    description:
      "16-piece ceramic dinner set, single-unit retail. Mock Taobao listing pending live integration.",
    images: ["https://images.unsplash.com/photo-1544816155-12df9643f363?w=800"],
    variants: [
      { name: "White", attributes: { color: "White" } },
      { name: "Sage Green", attributes: { color: "Sage Green" } },
    ],
  },
  {
    externalId: "taobao-70012234",
    platform: "MOCK_TAOBAO",
    title: "Smart LED Desk Lamp with Wireless Charging",
    imageUrl: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800",
    priceMinor: 8900,
    currency: "CNY",
    moq: 1,
    supplierName: "Ningbo Liangzi Home Tech",
    supplierLocation: "Ningbo, Zhejiang",
    rating: 4.5,
    sourceUrl: "https://www.taobao.com/mock/70012234",
    description: "Touch-control LED desk lamp with Qi charging base. Mock listing.",
    images: ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800"],
    variants: [{ name: "Black", attributes: { color: "Black" } }],
  },
];

class MockTaobaoProductService implements TaobaoProductService {
  async search(query: string): Promise<RemoteProductSummary[]> {
    const q = query.trim().toLowerCase();
    if (!q) return MOCK_CATALOG;
    return MOCK_CATALOG.filter((p) => p.title.toLowerCase().includes(q));
  }

  async getById(externalId: string): Promise<RemoteProductDetail | null> {
    return MOCK_CATALOG.find((p) => p.externalId === externalId) ?? null;
  }
}

export const taobaoProductService: TaobaoProductService = new MockTaobaoProductService();
