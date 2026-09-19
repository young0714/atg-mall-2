/**
 * One-time data script — adds the gender/type category taxonomy agreed on
 * in chat under the existing "Fashion" and "Shoes" top-level categories.
 * Fully idempotent — matches by name+parent (not just slug, since a
 * category created manually through the admin form, like "Women's
 * Clothing" already was, could have a different slug than this script
 * would generate) — so safe to re-run if it's interrupted partway.
 *
 * Run with: DATABASE_URL="<neon-url>" npx tsx prisma/seed-fashion-categories.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function getOrCreate(name: string, slug: string, parentId: string) {
  const existing = await db.category.findFirst({ where: { name, parentId } });
  if (existing) {
    console.log(`Already exists, skipping: ${name} (existing slug: ${existing.slug})`);
    return existing;
  }
  const created = await db.category.create({ data: { name, slug, parentId } });
  console.log(`Created: ${name} (${slug})`);
  return created;
}

async function main() {
  const fashion = await db.category.findUnique({ where: { slug: "fashion" } });
  if (!fashion) throw new Error('Top-level "Fashion" category (slug: fashion) not found — expected to already exist.');

  const shoes = await db.category.findUnique({ where: { slug: "shoes" } });
  if (!shoes) throw new Error('Top-level "Shoes" category (slug: shoes) not found — expected to already exist.');

  await getOrCreate("Women's Clothing", "womens-clothing", fashion.id);
  await getOrCreate("Men's Clothing", "mens-clothing", fashion.id);

  const womensShoes = await getOrCreate("Women's Shoes", "womens-shoes", shoes.id);
  const mensShoes = await getOrCreate("Men's Shoes", "mens-shoes", shoes.id);

  const womensShoeTypes = ["Sneakers", "Boots", "Sandals", "Heels", "Flats"];
  for (const name of womensShoeTypes) {
    await getOrCreate(name, `womens-${name.toLowerCase()}`, womensShoes.id);
  }

  const mensShoeTypes = ["Sneakers", "Boots", "Sandals", "Loafers"];
  for (const name of mensShoeTypes) {
    await getOrCreate(name, `mens-${name.toLowerCase()}`, mensShoes.id);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
