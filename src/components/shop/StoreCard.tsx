import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { storeIntegrationTypeLabel } from "@/lib/store";
import type { Store } from "@prisma/client";

export function StoreCard({ store }: { store: Store }) {
  const browseHref = store.internalBrowsePath || store.websiteUrl;
  const isExternal = !store.internalBrowsePath && !!store.websiteUrl;
  const isComingSoon = store.integrationType === "FUTURE";

  return (
    <div className="card flex flex-col p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sand-100">
          {store.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin-entered logo URLs can be any domain, unlike next/image's allowlisted remotePatterns
            <img src={store.logoUrl} alt={store.name} className="h-full w-full object-contain" />
          ) : (
            <span className="text-lg font-display font-bold text-navy-400">{store.name.charAt(0)}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display font-bold text-navy-900">{store.name}</h3>
          <Badge tone={isComingSoon ? "gold" : "neutral"} className="mt-1">
            {storeIntegrationTypeLabel(store.integrationType)}
          </Badge>
        </div>
      </div>

      {store.description && <p className="mt-3 text-sm text-navy-500">{store.description}</p>}

      <div className="mt-5 flex flex-col gap-2">
        {isComingSoon ? (
          <span className="btn-outline pointer-events-none text-center opacity-60">Coming Soon</span>
        ) : (
          browseHref && (
            <a
              href={browseHref}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className="btn-outline text-center"
            >
              {isExternal ? `Shop ${store.name} ↗` : `Browse ${store.name}`}
            </a>
          )
        )}
        {store.shopForMeEnabled && !isComingSoon && (
          <Link href={`/shop-for-me?storeId=${store.id}`} className="btn-primary text-center">
            Send Product Link
          </Link>
        )}
      </div>
    </div>
  );
}
