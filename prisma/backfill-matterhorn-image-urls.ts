/**
 * One-time fix for ProductImage rows already saved with Matterhorn's
 * plain http:// URLs (their API returns http, not https — see
 * matterhornService.ts) — these silently fail to render since Next's
 * image allowlist is protocol-specific and only https is whitelisted
 * for matterhorn-wholesale.com.
 *
 * Run with: DATABASE_URL="<neon-url>" npx tsx prisma/backfill-matterhorn-image-urls.ts
 * Safe to run more than once — only touches rows still on http://.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const images = await db.productImage.findMany({
    where: { url: { startsWith: "http://matterhorn-wholesale.com" } },
  });

  console.log(`Found ${images.length} Matterhorn image(s) with http:// URLs.`);

  for (const image of images) {
    const newUrl = image.url.replace(/^http:\/\//, "https://");
    await db.productImage.update({ where: { id: image.id }, data: { url: newUrl } });
    console.log(`Fixed: ${image.url} -> ${newUrl}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
