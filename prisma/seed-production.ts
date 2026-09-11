/**
 * ATG Mall PRODUCTION seed — structural/reference data only.
 *
 * Unlike prisma/seed.ts (which fills in demo customers, a fake order, and
 * sample products purely so every screen has something to show in
 * development), this script seeds only what a real launch actually needs:
 *   - Product categories (real taxonomy, reused images from Unsplash as
 *     neutral category art — swap for your own photography whenever)
 *   - The initial ATG warehouse (Guangzhou)
 *   - Admin-configurable shipping rates and delivery zones (still labeled
 *     as indicative defaults — update them in Admin → Shipping Rates /
 *     Settings with your real freight agreements before going live)
 *   - ONE real Super Admin account, from environment variables — no
 *     hardcoded password, no demo customers, no fabricated products,
 *     suppliers, or orders.
 *
 * Run with: npm run db:seed:prod
 * Requires SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, SEED_ADMIN_NAME env vars.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  const name = process.env.SEED_ADMIN_NAME || "Super Admin";

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set before running the production seed. " +
        "Set them as one-off environment variables for this command only — do not commit them.",
    );
  }
  if (password.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD should be at least 12 characters for a production account.");
  }

  console.log("Seeding ATG Mall PRODUCTION reference data...");

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
  for (const c of categoryDefs) {
    await db.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
  }
  console.log(`  ✓ ${categoryDefs.length} categories`);

  // ---------------------------------------------------------------------
  // Warehouse
  // ---------------------------------------------------------------------
  await db.warehouse.upsert({
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
  console.log("  ✓ warehouse");

  // ---------------------------------------------------------------------
  // Shipping rates — update these in Admin → Shipping Rates once you have
  // real freight agreements. These are starting defaults, not live rates.
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
        notes: "Starting default — replace with your actual freight agreement rate.",
      },
    });
  }
  console.log(`  ✓ ${rateDefs.length} shipping rates`);

  // ---------------------------------------------------------------------
  // Delivery zones — update fees/ETAs in Admin → Settings as you confirm
  // your real local delivery costs per city.
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
  console.log(`  ✓ ${zoneDefs.length} delivery zones`);

  // ---------------------------------------------------------------------
  // The one real admin account
  // ---------------------------------------------------------------------
  const passwordHash = await bcrypt.hash(password, 12);
  await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      fullName: name,
      phone: process.env.SEED_ADMIN_PHONE || undefined,
      role: "SUPER_ADMIN",
      passwordHash,
    },
  });
  console.log(`  ✓ Super Admin account for ${email}`);

  console.log("\nProduction seed complete. No demo customers, products, or orders were created.");
  console.log("Sign in at /admin/login and add real products/suppliers from the admin console.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
