/**
 * ATG Mall seed script — realistic MOCK data for local development/demo.
 *
 * Run with: npm run db:seed
 *
 * Everything here is clearly-labeled placeholder data: product listings,
 * suppliers, shipping rates, and sample orders exist so every screen in the
 * MVP has something real to render. None of it represents a live 1688/
 * Taobao feed, a live payment transaction, or a real courier rate — see
 * src/lib/services/* for the abstractions that will replace these with live
 * integrations in Phase 2.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding ATG Mall database...");

  // ---------------------------------------------------------------------
  // Categories
  // ---------------------------------------------------------------------
  const categoryDefs = [
    { name: "Electronics", slug: "electronics", imageUrl: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=600" },
    { name: "Phones & Accessories", slug: "phones-accessories", imageUrl: "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=600" },
    { name: "Computers", slug: "computers", imageUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600" },
    { name: "Fashion", slug: "fashion", imageUrl: "https://images.unsplash.com/photo-1445205170230-053b83016050?w=600" },
    { name: "Shoes", slug: "shoes", imageUrl: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600" },
    { name: "Bags", slug: "bags", imageUrl: "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600" },
    { name: "Beauty", slug: "beauty", imageUrl: "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=600" },
    { name: "Home & Kitchen", slug: "home-kitchen", imageUrl: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=600" },
    { name: "Furniture", slug: "furniture", imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600" },
    { name: "Baby & Kids", slug: "baby-kids", imageUrl: "https://images.unsplash.com/photo-1522771930-78848d9293e8?w=600" },
    { name: "Automotive", slug: "automotive", imageUrl: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=600" },
    { name: "Tools", slug: "tools", imageUrl: "https://images.unsplash.com/photo-1581147036324-c1c89c2c8b5c?w=600" },
    { name: "Machinery", slug: "machinery", imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=600" },
    { name: "Office Supplies", slug: "office-supplies", imageUrl: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=600" },
    { name: "Sports & Outdoor", slug: "sports-outdoor", imageUrl: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600" },
    { name: "Jewelry & Accessories", slug: "jewelry-accessories", imageUrl: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600" },
    { name: "Wholesale", slug: "wholesale", imageUrl: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=600" },
    { name: "Business Equipment", slug: "business-equipment", imageUrl: "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600" },
  ];

  const categories: Record<string, { id: string }> = {};
  for (const c of categoryDefs) {
    categories[c.slug] = await db.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c,
    });
  }

  // ---------------------------------------------------------------------
  // Suppliers
  // ---------------------------------------------------------------------
  const supplierDefs = [
    { name: "Shenzhen Yunfeng Electronics Co., Ltd.", platform: "MOCK_1688" as const, location: "Shenzhen, Guangdong", rating: 4.7, verified: true },
    { name: "Guangzhou Meihao Garment Co.", platform: "MOCK_1688" as const, location: "Guangzhou, Guangdong", rating: 4.4, verified: true },
    { name: "Yiwu Xinrui Trading Co.", platform: "MOCK_1688" as const, location: "Yiwu, Zhejiang", rating: 4.5, verified: false },
    { name: "Jingdezhen Yushan Ceramics", platform: "MOCK_TAOBAO" as const, location: "Jingdezhen, Jiangxi", rating: 4.8, verified: true },
    { name: "Ningbo Liangzi Home Tech", platform: "MOCK_TAOBAO" as const, location: "Ningbo, Zhejiang", rating: 4.5, verified: true },
    { name: "Foshan Junyao Furniture Factory", platform: "MOCK_1688" as const, location: "Foshan, Guangdong", rating: 4.3, verified: true },
    { name: "ATG Direct Sourcing", platform: "ALIBABA" as const, location: "Guangzhou, China", rating: 4.9, verified: true },
  ];
  const suppliers = [];
  for (const s of supplierDefs) {
    suppliers.push(await db.supplier.create({ data: s }));
  }

  // ---------------------------------------------------------------------
  // Products
  // ---------------------------------------------------------------------
  type SeedProduct = {
    name: string;
    slug: string;
    categorySlug: string;
    supplierIdx: number;
    priceMinorCny: number;
    moq: number;
    weightGrams: number;
    wholesale?: boolean;
    featured?: boolean;
    images: string[];
    description: string;
    variants: { name: string; delta?: number; attrs: Record<string, string> }[];
  };

  const productDefs: SeedProduct[] = [
    {
      name: "Wireless Bluetooth Earbuds Pro — TWS 5.3",
      slug: "wireless-bluetooth-earbuds-pro",
      categorySlug: "phones-accessories",
      supplierIdx: 0,
      priceMinorCny: 3500,
      moq: 1,
      weightGrams: 120,
      featured: true,
      images: [
        "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=900",
        "https://images.unsplash.com/photo-1590658165737-15a047b7c823?w=900",
      ],
      description:
        "True wireless earbuds with Bluetooth 5.3, active noise cancellation, and a compact charging case. Great for resale or personal use — also available by the carton for wholesale buyers.",
      variants: [
        { name: "Black", attrs: { color: "Black" } },
        { name: "White", attrs: { color: "White" } },
      ],
    },
    {
      name: "6.7in Android Smartphone — 128GB Dual SIM",
      slug: "android-smartphone-128gb",
      categorySlug: "phones-accessories",
      supplierIdx: 0,
      priceMinorCny: 68000,
      moq: 1,
      weightGrams: 380,
      featured: true,
      images: ["https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=900"],
      description:
        "6.7-inch display, 128GB storage, dual SIM Android smartphone suitable for resale across Nigeria and Gambia. Supplier offers volume pricing at higher quantities.",
      variants: [
        { name: "128GB / Black", attrs: { storage: "128GB", color: "Black" } },
        { name: "128GB / Blue", attrs: { storage: "128GB", color: "Blue" } },
      ],
    },
    {
      name: "15.6in Business Laptop — 8GB/256GB SSD",
      slug: "business-laptop-15in",
      categorySlug: "computers",
      supplierIdx: 6,
      priceMinorCny: 219000,
      moq: 1,
      weightGrams: 1800,
      images: ["https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900"],
      description:
        "Slim 15.6-inch business laptop, 8GB RAM, 256GB SSD. Sourced directly through ATG's China procurement partner network.",
      variants: [{ name: "Standard", attrs: {} }],
    },
    {
      name: "Men's Cargo Pants — Wholesale Carton (12 pcs)",
      slug: "mens-cargo-pants-wholesale",
      categorySlug: "fashion",
      supplierIdx: 1,
      priceMinorCny: 5200,
      moq: 12,
      weightGrams: 6000,
      wholesale: true,
      images: ["https://images.unsplash.com/photo-1517438476312-10d79c077509?w=900"],
      description: "Mixed-size cargo pants, assorted colors, sold per carton of 12 pieces. Popular wholesale line for resellers.",
      variants: [
        { name: "Khaki mix", attrs: { color: "Khaki" } },
        { name: "Black mix", attrs: { color: "Black" } },
      ],
    },
    {
      name: "Women's Ankara Print Dress",
      slug: "womens-ankara-print-dress",
      categorySlug: "fashion",
      supplierIdx: 2,
      priceMinorCny: 8900,
      moq: 1,
      weightGrams: 400,
      images: ["https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=900"],
      description: "African-print inspired dress manufactured to order, available in multiple sizes.",
      variants: [
        { name: "Size M", attrs: { size: "M" } },
        { name: "Size L", attrs: { size: "L" } },
        { name: "Size XL", attrs: { size: "XL" } },
      ],
    },
    {
      name: "Men's Leather Sneakers",
      slug: "mens-leather-sneakers",
      categorySlug: "shoes",
      supplierIdx: 2,
      priceMinorCny: 12500,
      moq: 2,
      weightGrams: 900,
      images: ["https://images.unsplash.com/photo-1549298916-b41d501d3772?w=900"],
      description: "Genuine-leather-look sneakers, available in bulk pairs at reduced unit pricing.",
      variants: [
        { name: "Size 42", attrs: { size: "42" } },
        { name: "Size 43", attrs: { size: "43" } },
        { name: "Size 44", attrs: { size: "44" } },
      ],
    },
    {
      name: "Quilted Leather Handbag",
      slug: "quilted-leather-handbag",
      categorySlug: "bags",
      supplierIdx: 2,
      priceMinorCny: 9800,
      moq: 1,
      weightGrams: 700,
      featured: true,
      images: ["https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=900"],
      description: "Premium-look quilted handbag with gold-tone hardware.",
      variants: [
        { name: "Black", attrs: { color: "Black" } },
        { name: "Tan", attrs: { color: "Tan" } },
      ],
    },
    {
      name: "Stainless Steel Kitchen Knife Set (7-Piece)",
      slug: "stainless-kitchen-knife-set",
      categorySlug: "home-kitchen",
      supplierIdx: 2,
      priceMinorCny: 4800,
      moq: 5,
      weightGrams: 1600,
      images: ["https://images.unsplash.com/photo-1593618998160-e34014e67546?w=900"],
      description: "7-piece kitchen knife set with acrylic display stand — wholesale pricing available.",
      variants: [{ name: "Standard", attrs: {} }],
    },
    {
      name: "Minimalist Ceramic Dinnerware Set (16-Piece)",
      slug: "ceramic-dinnerware-set-16pc",
      categorySlug: "home-kitchen",
      supplierIdx: 3,
      priceMinorCny: 12800,
      moq: 1,
      weightGrams: 5200,
      images: ["https://images.unsplash.com/photo-1544816155-12df9643f363?w=900"],
      description: "16-piece ceramic dinnerware set in a minimalist finish.",
      variants: [
        { name: "White", attrs: { color: "White" } },
        { name: "Sage Green", attrs: { color: "Sage Green" } },
      ],
    },
    {
      name: "Smart LED Desk Lamp with Wireless Charging",
      slug: "smart-led-desk-lamp",
      categorySlug: "home-kitchen",
      supplierIdx: 4,
      priceMinorCny: 8900,
      moq: 1,
      weightGrams: 850,
      images: ["https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=900"],
      description: "Touch-control LED desk lamp with a built-in Qi wireless charging base.",
      variants: [{ name: "Black", attrs: { color: "Black" } }],
    },
    {
      name: "Modern Fabric Accent Chair",
      slug: "modern-fabric-accent-chair",
      categorySlug: "furniture",
      supplierIdx: 5,
      priceMinorCny: 34000,
      moq: 1,
      weightGrams: 14000,
      images: ["https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=900"],
      description: "Upholstered accent chair with solid wood legs, flat-packed for efficient freight.",
      variants: [
        { name: "Beige", attrs: { color: "Beige" } },
        { name: "Charcoal", attrs: { color: "Charcoal" } },
      ],
    },
    {
      name: "Baby Convertible Car Seat",
      slug: "baby-convertible-car-seat",
      categorySlug: "baby-kids",
      supplierIdx: 6,
      priceMinorCny: 45000,
      moq: 1,
      weightGrams: 8500,
      images: ["https://images.unsplash.com/photo-1519689680058-324335c77eba?w=900"],
      description: "Convertible car seat suitable from infant through toddler stages, safety-tested.",
      variants: [{ name: "Standard", attrs: {} }],
    },
    {
      name: "Cordless Drill Driver Kit",
      slug: "cordless-drill-driver-kit",
      categorySlug: "tools",
      supplierIdx: 6,
      priceMinorCny: 19800,
      moq: 3,
      weightGrams: 2200,
      images: ["https://images.unsplash.com/photo-1581147036324-c1c89c2c8b5c?w=900"],
      description: "21V cordless drill driver kit with two batteries and a carry case.",
      variants: [{ name: "Standard", attrs: {} }],
    },
    {
      name: "A4 Laminator & Office Bundle",
      slug: "a4-laminator-office-bundle",
      categorySlug: "office-supplies",
      supplierIdx: 6,
      priceMinorCny: 15600,
      moq: 2,
      weightGrams: 3100,
      images: ["https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=900"],
      description: "A4 laminator bundled with 100 pouches, ideal for small business/office use.",
      variants: [{ name: "Standard", attrs: {} }],
    },
    {
      name: "Adjustable Dumbbell Set (Pair)",
      slug: "adjustable-dumbbell-set",
      categorySlug: "sports-outdoor",
      supplierIdx: 6,
      priceMinorCny: 42000,
      moq: 1,
      weightGrams: 24000,
      images: ["https://images.unsplash.com/photo-1584735175315-9d5df23860e6?w=900"],
      description: "Space-saving adjustable dumbbell pair, 5–25kg per side.",
      variants: [{ name: "Standard", attrs: {} }],
    },
    {
      name: "18K Gold-Plated Layered Necklace Set",
      slug: "gold-plated-layered-necklace-set",
      categorySlug: "jewelry-accessories",
      supplierIdx: 2,
      priceMinorCny: 3200,
      moq: 3,
      weightGrams: 80,
      images: ["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=900"],
      description: "Layered necklace set, gold-plated finish, sold in small wholesale lots.",
      variants: [{ name: "Gold", attrs: { color: "Gold" } }],
    },
    {
      name: "Commercial Popcorn Machine",
      slug: "commercial-popcorn-machine",
      categorySlug: "business-equipment",
      supplierIdx: 6,
      priceMinorCny: 89000,
      moq: 1,
      weightGrams: 18000,
      images: ["https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=900"],
      description: "Commercial-grade popcorn machine with cart, suited for retail/events business.",
      variants: [{ name: "Standard", attrs: {} }],
    },
    {
      name: "Assorted Wristwatch Wholesale Lot (24 pcs)",
      slug: "assorted-wristwatch-wholesale-lot",
      categorySlug: "wholesale",
      supplierIdx: 1,
      priceMinorCny: 62000,
      moq: 1,
      weightGrams: 7200,
      wholesale: true,
      featured: true,
      images: ["https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=900"],
      description: "Mixed-style wristwatch wholesale carton, 24 assorted pieces — a popular starter lot for resellers.",
      variants: [{ name: "24-piece carton", attrs: {} }],
    },
  ];

  for (const p of productDefs) {
    const category = categories[p.categorySlug];
    const supplier = suppliers[p.supplierIdx];
    const product = await db.product.upsert({
      where: { slug: p.slug },
      update: {},
      create: {
        name: p.name,
        slug: p.slug,
        description: p.description,
        categoryId: category.id,
        supplierId: supplier.id,
        sourcePlatform: supplier.platform,
        basePriceMinor: p.priceMinorCny,
        baseCurrency: "CNY",
        moq: p.moq,
        weightGrams: p.weightGrams,
        isWholesale: !!p.wholesale,
        isFeatured: !!p.featured,
        avgRating: 4.2 + Math.random() * 0.7,
        reviewCount: Math.floor(5 + Math.random() * 120),
        images: { create: p.images.map((url, i) => ({ url, sortOrder: i })) },
        variants: {
          create: p.variants.map((v) => ({
            name: v.name,
            priceDeltaMinor: v.delta ?? 0,
            attributes: v.attrs,
          })),
        },
      },
    });
    void product;
  }

  // ---------------------------------------------------------------------
  // Shipping rates (admin-configurable — illustrative defaults)
  // ---------------------------------------------------------------------
  const rateDefs = [
    { destinationCountry: "NIGERIA" as const, method: "AIR_FREIGHT" as const, pricePerKgMinor: 800, currency: "USD" as const, min: 500, days: [7, 12] },
    { destinationCountry: "NIGERIA" as const, method: "SEA_FREIGHT" as const, pricePerKgMinor: 250, currency: "USD" as const, min: 3000, days: [35, 50] },
    { destinationCountry: "NIGERIA" as const, method: "COURIER" as const, pricePerKgMinor: 1400, currency: "USD" as const, min: 300, days: [5, 9] },
    { destinationCountry: "NIGERIA" as const, method: "LCL" as const, pricePerKgMinor: 300, currency: "USD" as const, min: 5000, days: [30, 45] },
    { destinationCountry: "NIGERIA" as const, method: "FCL" as const, pricePerKgMinor: 180, currency: "USD" as const, min: 50000, days: [30, 45] },
    { destinationCountry: "GAMBIA" as const, method: "AIR_FREIGHT" as const, pricePerKgMinor: 950, currency: "USD" as const, min: 500, days: [10, 16] },
    { destinationCountry: "GAMBIA" as const, method: "SEA_FREIGHT" as const, pricePerKgMinor: 300, currency: "USD" as const, min: 3000, days: [40, 55] },
    { destinationCountry: "GAMBIA" as const, method: "COURIER" as const, pricePerKgMinor: 1600, currency: "USD" as const, min: 300, days: [7, 12] },
    { destinationCountry: "GAMBIA" as const, method: "LCL" as const, pricePerKgMinor: 340, currency: "USD" as const, min: 5000, days: [35, 50] },
  ];
  for (const r of rateDefs) {
    await db.shippingRate.upsert({
      where: {
        originCountry_destinationCountry_method: {
          originCountry: "China",
          destinationCountry: r.destinationCountry,
          method: r.method,
        },
      },
      update: {},
      create: {
        destinationCountry: r.destinationCountry,
        method: r.method,
        pricePerKgMinor: r.pricePerKgMinor,
        currency: r.currency,
        minChargeableWeightGrams: r.min,
        estimatedDaysMin: r.days[0],
        estimatedDaysMax: r.days[1],
        notes: "Indicative admin-configured rate for MVP/demo purposes — not a live carrier rate.",
      },
    });
  }

  // ---------------------------------------------------------------------
  // Delivery zones
  // ---------------------------------------------------------------------
  const zoneDefs = [
    { country: "NIGERIA" as const, city: "Lagos", fee: 150000, currency: "NGN" as const, eta: [1, 2] },
    { country: "NIGERIA" as const, city: "Abuja", fee: 200000, currency: "NGN" as const, eta: [2, 3] },
    { country: "NIGERIA" as const, city: "Port Harcourt", fee: 220000, currency: "NGN" as const, eta: [2, 4] },
    { country: "NIGERIA" as const, city: "Kano", fee: 250000, currency: "NGN" as const, eta: [2, 4] },
    { country: "NIGERIA" as const, city: "Ibadan", fee: 180000, currency: "NGN" as const, eta: [1, 3] },
    { country: "NIGERIA" as const, city: "Benin City", fee: 200000, currency: "NGN" as const, eta: [2, 4] },
    { country: "NIGERIA" as const, city: "Enugu", fee: 210000, currency: "NGN" as const, eta: [2, 4] },
    { country: "NIGERIA" as const, city: "Kaduna", fee: 230000, currency: "NGN" as const, eta: [2, 4] },
    { country: "GAMBIA" as const, city: "Banjul", fee: 15000, currency: "GMD" as const, eta: [1, 2] },
    { country: "GAMBIA" as const, city: "Kanifing", fee: 15000, currency: "GMD" as const, eta: [1, 2] },
    { country: "GAMBIA" as const, city: "Brikama", fee: 20000, currency: "GMD" as const, eta: [2, 3] },
  ];
  for (const z of zoneDefs) {
    await db.deliveryZone.upsert({
      where: { country_city: { country: z.country, city: z.city } },
      update: {},
      create: {
        country: z.country,
        city: z.city,
        localFeeMinor: z.fee,
        currency: z.currency,
        etaDaysMin: z.eta[0],
        etaDaysMax: z.eta[1],
      },
    });
  }

  // ---------------------------------------------------------------------
  // Warehouse
  // ---------------------------------------------------------------------
  const warehouse = await db.warehouse.upsert({
    where: { id: "seed-warehouse-guangzhou" },
    update: {},
    create: {
      id: "seed-warehouse-guangzhou",
      name: "ATG Guangzhou Consolidation Warehouse",
      city: "Guangzhou",
      country: "China",
      addressLine: "Baiyun District, Guangzhou, Guangdong, China",
    },
  });

  // ---------------------------------------------------------------------
  // Users: staff + demo customers
  // ---------------------------------------------------------------------
  const staffDefs = [
    { email: "admin@atgmall.com", fullName: "Alabi Olasesan", role: "SUPER_ADMIN" as const, phone: "+2347043945345" },
    { email: "ops@atgmall.com", fullName: "Chidinma Okafor", role: "OPERATIONS_ADMIN" as const, phone: "+2348012345001" },
    { email: "sourcing@atgmall.com", fullName: "Tunde Bakare", role: "SOURCING_STAFF" as const, phone: "+2348012345002" },
    { email: "warehouse@atgmall.com", fullName: "Li Wei", role: "WAREHOUSE_STAFF" as const, phone: "+8613800000000" },
    { email: "shipping@atgmall.com", fullName: "Fatou Jallow", role: "SHIPPING_STAFF" as const, phone: "+2207000001" },
    { email: "finance@atgmall.com", fullName: "Ngozi Umeh", role: "FINANCE_STAFF" as const, phone: "+2348012345003" },
    { email: "support@atgmall.com", fullName: "Modou Ceesay", role: "CUSTOMER_SUPPORT" as const, phone: "+2207000002" },
  ];
  const staffPassword = await hash("AtgMall#2026");
  const staffUsers: Record<string, { id: string }> = {};
  for (const s of staffDefs) {
    staffUsers[s.role] = await db.user.upsert({
      where: { email: s.email },
      update: {},
      create: { ...s, passwordHash: staffPassword },
    });
  }

  const customerPassword = await hash("Customer#2026");
  const customer1 = await db.user.upsert({
    where: { email: "amaka.customer@example.com" },
    update: {},
    create: {
      email: "amaka.customer@example.com",
      fullName: "Amaka Nwosu",
      phone: "+2348098765432",
      whatsapp: "+2348098765432",
      role: "CUSTOMER",
      passwordHash: customerPassword,
      customerProfile: {
        create: { country: "NIGERIA", state: "Lagos", city: "Lagos", preferredCurrency: "NGN" },
      },
      wallet: { create: { currency: "NGN", balanceMinor: 0 } },
      addresses: {
        create: {
          label: "Home",
          fullName: "Amaka Nwosu",
          phone: "+2348098765432",
          country: "NIGERIA",
          state: "Lagos",
          city: "Lagos",
          addressLine1: "14 Adeola Odeku Street, Victoria Island",
          isDefault: true,
        },
      },
    },
  });

  const customer2 = await db.user.upsert({
    where: { email: "lamin.customer@example.com" },
    update: {},
    create: {
      email: "lamin.customer@example.com",
      fullName: "Lamin Jatta",
      phone: "+2207001234",
      whatsapp: "+2207001234",
      role: "CUSTOMER",
      passwordHash: customerPassword,
      customerProfile: {
        create: { country: "GAMBIA", state: "Kanifing", city: "Kanifing", preferredCurrency: "GMD" },
      },
      wallet: { create: { currency: "GMD", balanceMinor: 0 } },
      addresses: {
        create: {
          label: "Home",
          fullName: "Lamin Jatta",
          phone: "+2207001234",
          country: "GAMBIA",
          state: "Kanifing",
          city: "Kanifing",
          addressLine1: "Bundung, Kanifing Municipality",
          isDefault: true,
        },
      },
    },
  });

  // Seed a wallet deposit ledger entry for the demo customer.
  const wallet1 = await db.wallet.findUniqueOrThrow({ where: { userId: customer1.id } });
  await db.walletTransaction.create({
    data: {
      walletId: wallet1.id,
      type: "DEPOSIT",
      amountMinor: 25000000, // NGN 250,000.00
      currency: "NGN",
      balanceAfterMinor: 25000000,
      referenceType: "DEPOSIT",
      description: "Wallet funding via bank transfer (demo seed data)",
    },
  });
  await db.wallet.update({ where: { id: wallet1.id }, data: { balanceMinor: 25000000 } });

  // ---------------------------------------------------------------------
  // Sample order + package + shipment + tracking timeline for demo customer 1
  // ---------------------------------------------------------------------
  const laptop = await db.product.findUniqueOrThrow({ where: { slug: "business-laptop-15in" } });
  const address1 = await db.address.findFirstOrThrow({ where: { userId: customer1.id } });

  const demoOrder = await db.order.upsert({
    where: { orderNumber: "ATG-NG-2026000123" },
    update: {},
    create: {
      orderNumber: "ATG-NG-2026000123",
      userId: customer1.id,
      addressId: address1.id,
      source: "CATALOG",
      status: "IN_TRANSIT",
      destination: "NIGERIA",
      currency: "NGN",
      subtotalMinor: 4700000,
      serviceFeeMinor: 235000,
      domesticShippingMinor: 17000,
      intlShippingMinor: 620000,
      totalMinor: 5572000,
      items: {
        create: [
          {
            productId: laptop.id,
            nameSnapshot: laptop.name,
            quantity: 1,
            unitPriceMinor: 4700000,
            currency: "NGN",
          },
        ],
      },
    },
  });

  await db.payment.upsert({
    where: { id: "seed-payment-1" },
    update: {},
    create: {
      id: "seed-payment-1",
      orderId: demoOrder.id,
      method: "CARD",
      status: "SUCCESSFUL",
      amountMinor: 5572000,
      currency: "NGN",
      providerName: "MOCK",
      providerRef: "MOCK-ATG-NG-2026000123-DEMO",
    },
  });

  const demoPackage = await db.package.upsert({
    where: { packageCode: "ATG-PKG-000123" },
    update: {},
    create: {
      packageCode: "ATG-PKG-000123",
      orderId: demoOrder.id,
      userId: customer1.id,
      warehouseId: warehouse.id,
      supplierName: "ATG Direct Sourcing",
      status: "IN_TRANSIT",
      shippingMethod: "AIR_FREIGHT",
      weightGrams: 1800,
      lengthCm: 40,
      widthCm: 30,
      heightCm: 8,
      destination: "NIGERIA",
      addressId: address1.id,
      photos: [],
    },
  });

  const demoShipment = await db.shipment.upsert({
    where: { trackingNumber: "ATG-NG-2026000123" },
    update: {},
    create: {
      trackingNumber: "ATG-NG-2026000123",
      method: "AIR_FREIGHT",
      origin: "Guangzhou, China",
      destinationCountry: "NIGERIA",
      destinationCity: "Lagos",
      status: "IN_TRANSIT",
      estimatedDeliveryAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
      shippedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      totalWeightGrams: 1800,
      packages: { create: [{ packageId: demoPackage.id }] },
    },
  });

  const timeline: { status: string; location: string; description: string; daysAgo: number }[] = [
    { status: "PENDING_PAYMENT", location: "ATG Mall", description: "Order placed. Awaiting payment.", daysAgo: 12 },
    { status: "PAID", location: "ATG Mall", description: "Payment confirmed via card.", daysAgo: 12 },
    { status: "PURCHASED", location: "Guangzhou, China", description: "Item purchased from supplier.", daysAgo: 11 },
    { status: "RECEIVED", location: "ATG Guangzhou Warehouse", description: "Package received and inspected at the China warehouse.", daysAgo: 8 },
    { status: "READY_TO_SHIP", location: "ATG Guangzhou Warehouse", description: "Package packed and ready for international shipment.", daysAgo: 6 },
    { status: "SHIPPED", location: "Guangzhou Baiyun Airport", description: "Shipment departed China via air freight.", daysAgo: 3 },
    { status: "IN_TRANSIT", location: "In transit — international", description: "Shipment is in transit to Nigeria.", daysAgo: 1 },
  ];
  for (const t of timeline) {
    await db.trackingEvent.create({
      data: {
        shipmentId: demoShipment.id,
        packageId: demoPackage.id,
        orderId: demoOrder.id,
        status: t.status,
        location: t.location,
        description: t.description,
        occurredAt: new Date(Date.now() - t.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }

  // A second, earlier package sitting in the warehouse awaiting instruction —
  // good for demonstrating "My Packages" + "Ship My Package".
  await db.package.upsert({
    where: { packageCode: "ATG-PKG-000098" },
    update: {},
    create: {
      packageCode: "ATG-PKG-000098",
      userId: customer1.id,
      warehouseId: warehouse.id,
      supplierName: "Shenzhen Yunfeng Electronics Co., Ltd.",
      status: "AWAITING_CUSTOMER_INSTRUCTION",
      weightGrams: 650,
      lengthCm: 25,
      widthCm: 18,
      heightCm: 10,
      destination: "NIGERIA",
      addressId: address1.id,
      photos: [],
    },
  });

  // ---------------------------------------------------------------------
  // Sample Shop for Me + Source a Product requests
  // ---------------------------------------------------------------------
  await db.shopForMeRequest.create({
    data: {
      userId: customer1.id,
      productUrl: "https://www.1688.com/mock/example-item",
      productName: "Portable Mini Projector",
      productImageUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600",
      quantity: 2,
      destination: "NIGERIA",
      instructions: "Please confirm HDMI cable is included.",
      status: "SUBMITTED",
    },
  });

  const sourcingRequest = await db.sourcingRequest.create({
    data: {
      userId: customer2.id,
      productName: "Industrial Sewing Machines",
      quantity: 5,
      targetPriceMinor: 30000,
      targetCurrency: "USD",
      destination: "GAMBIA",
      notes: "Looking for heavy-duty machines suitable for a tailoring workshop.",
      status: "UNDER_REVIEW",
    },
  });
  await db.sourcingOption.create({
    data: {
      sourcingRequestId: sourcingRequest.id,
      supplierId: suppliers[6].id,
      unitPriceMinor: 28000,
      currency: "USD",
      moq: 5,
      estimatedShippingMinor: 4500,
      sourcingFeeMinor: 1500,
      leadTimeDays: 21,
      notes: "Heavy-duty industrial single-needle machines, 5-unit MOQ.",
      addedById: staffUsers["SOURCING_STAFF"].id,
    },
  });

  // ---------------------------------------------------------------------
  // Coupon
  // ---------------------------------------------------------------------
  await db.coupon.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: { code: "WELCOME10", type: "PERCENTAGE", value: 10, usageLimit: 500 },
  });

  console.log("Seed complete.");
  console.log("---");
  console.log("Staff logins (password: AtgMall#2026):");
  for (const s of staffDefs) console.log(`  ${s.role.padEnd(18)} ${s.email}`);
  console.log("Customer logins (password: Customer#2026):");
  console.log("  amaka.customer@example.com (Nigeria)");
  console.log("  lamin.customer@example.com (Gambia)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
