import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { aliexpressService } from "@/lib/services/aliexpressService";
import { aliexpressAuthIsConfigured, isAliExpressConnected } from "@/lib/services/aliexpressAuthService";
import { AliExpressVariantCheck } from "./AliExpressVariantCheck";
import { AliExpressPriceCheck } from "./AliExpressPriceCheck";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin — Check AliExpress options" };
export const dynamic = "force-dynamic";

export default async function AdminAliExpressVariantCheckPage() {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const ready = aliexpressService.isConfigured() && aliexpressAuthIsConfigured() && (await isAliExpressConnected());

  const products = ready
    ? await db.product.findMany({
        where: { sourcePlatform: "ALIEXPRESS", sourceProductId: { not: null } },
        select: { id: true, name: true, slug: true, isActive: true, sourceUrl: true, _count: { select: { variants: true } } },
        orderBy: { name: "asc" },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Check AliExpress options</h1>
        <p className="text-sm text-navy-500">
          Compares every AliExpress product&apos;s saved sizes, colours and other options with what AliExpress offers
          right now, and shows what&apos;s missing on the website. It only reads — nothing is changed.
        </p>
      </div>
      {!ready ? (
        <div className="rounded-xl2 border border-gold-200 bg-gold-50 p-4 text-sm text-gold-700">
          AliExpress isn&apos;t connected. Connect it on the <a className="underline" href="/admin/aliexpress-import">Import from AliExpress</a> page first.
        </div>
      ) : (
        <>
          <AliExpressVariantCheck
            products={products.map((p) => ({
              id: p.id,
              name: p.name,
              slug: p.slug,
              isActive: p.isActive,
              sourceUrl: p.sourceUrl,
              variantCount: p._count.variants,
            }))}
          />
          <AliExpressPriceCheck
            products={products
              .filter((p) => p.isActive)
              .map((p) => ({ id: p.id, name: p.name, sourceUrl: p.sourceUrl }))}
          />
        </>
      )}
    </div>
  );
}
