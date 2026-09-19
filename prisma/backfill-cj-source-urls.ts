/**
 * One-time fix for CJ-imported products whose Product.sourceUrl was stored
 * using the old, broken https://cjdropshipping.com/product/{pid}.html
 * pattern (see cjDropshippingService.ts — fixed to the real
 * /product/{slug}-p-{pid}.html format going forward, but that fix only
 * applies to new fetches, not rows already written to the DB).
 *
 * Run with: DATABASE_URL="<neon-url>" npx tsx prisma/backfill-cj-source-urls.ts
 * Safe to run more than once — only touches rows still matching the old
 * pattern, so already-fixed rows are left alone.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

async function main() {
  const products = await db.product.findMany({
    where: {
      sourcePlatform: "CJDROPSHIPPING",
      sourceUrl: { not: null },
      sourceProductId: { not: null },
    },
    select: { id: true, name: true, sourceUrl: true, sourceProductId: true },
  });

  const oldPattern = /^https:\/\/cjdropshipping\.com\/product\/[^/]+\.html$/;
  const alreadyFixedPattern = /-p-[^/]+\.html$/;

  const toFix = products.filter(
    (p) => p.sourceUrl && oldPattern.test(p.sourceUrl) && !alreadyFixedPattern.test(p.sourceUrl),
  );

  console.log(`Found ${toFix.length} CJ product(s) with the old broken sourceUrl (of ${products.length} total CJ products).`);

  for (const p of toFix) {
    const newUrl = `https://cjdropshipping.com/product/${slugify(p.name)}-p-${p.sourceProductId}.html`;
    await db.product.update({ where: { id: p.id }, data: { sourceUrl: newUrl } });
    console.log(`Fixed "${p.name}": ${p.sourceUrl} -> ${newUrl}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
