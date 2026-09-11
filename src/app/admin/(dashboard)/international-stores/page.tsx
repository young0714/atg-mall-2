import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { Badge } from "@/components/ui/Badge";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { STORE_COUNTRY_LABELS, STORE_COUNTRY_FLAGS, storeIntegrationTypeLabel } from "@/lib/store";
import { createStoreAction, toggleStoreActiveAction, deleteStoreAction } from "./actions";
import Link from "next/link";
import type { Metadata } from "next";
import type { StoreCountry } from "@prisma/client";

export const metadata: Metadata = { title: "Admin — International Stores" };
export const dynamic = "force-dynamic";

const COUNTRY_ORDER: StoreCountry[] = ["CHINA", "USA", "UK"];

export default async function AdminInternationalStoresPage({
  searchParams,
}: {
  searchParams: { created?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_STORES);

  const stores = await db.store.findMany({ orderBy: [{ country: "asc" }, { sortOrder: "asc" }, { name: "asc" } ] });
  const byCountry: Record<StoreCountry, typeof stores> = { CHINA: [], USA: [], UK: [] };
  for (const s of stores) byCountry[s.country].push(s);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">International Stores</h1>
        <p className="text-sm text-navy-500">
          Every store ATG offers Shop-for-Me access to, across China, USA and UK. Controls what shows on the public
          Shop from China/USA/UK pages.
        </p>
      </div>

      {searchParams.created && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Store created.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold text-navy-900">+ Add New Store</summary>
        <form action={createStoreAction} className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name" htmlFor="name" required><Input id="name" name="name" required /></Field>
          <Field label="Slug" htmlFor="slug" required hint="lowercase-with-hyphens"><Input id="slug" name="slug" required /></Field>
          <Field label="Country" htmlFor="country" required>
            <Select id="country" name="country" required>
              {COUNTRY_ORDER.map((c) => <option key={c} value={c}>{STORE_COUNTRY_FLAGS[c]} {STORE_COUNTRY_LABELS[c]}</option>)}
            </Select>
          </Field>
          <Field label="Integration type" htmlFor="integrationType" required>
            <Select id="integrationType" name="integrationType" defaultValue="SHOP_FOR_ME" required>
              <option value="API">API (live catalog)</option>
              <option value="AFFILIATE">Affiliate</option>
              <option value="DIRECT_LINK">Direct external link</option>
              <option value="SHOP_FOR_ME">Shop for Me</option>
              <option value="FUTURE">Future integration</option>
            </Select>
          </Field>
          <Field label="Logo URL" htmlFor="logoUrl"><Input id="logoUrl" name="logoUrl" type="url" /></Field>
          <Field label="Website URL" htmlFor="websiteUrl" hint="External 'Browse' destination — leave blank for a link-only catch-all store">
            <Input id="websiteUrl" name="websiteUrl" type="url" />
          </Field>
          <Field label="Internal browse path" htmlFor="internalBrowsePath" hint="e.g. /shop-from-china/1688 — overrides Website URL for Browse when set">
            <Input id="internalBrowsePath" name="internalBrowsePath" />
          </Field>
          <Field label="Affiliate URL" htmlFor="affiliateUrl" hint="Only used when Integration type = Affiliate">
            <Input id="affiliateUrl" name="affiliateUrl" type="url" />
          </Field>
          <Field label="API status" htmlFor="apiStatus" hint='Honest free-text note, e.g. "Not yet configured"'>
            <Input id="apiStatus" name="apiStatus" />
          </Field>
          <Field label="Sort order" htmlFor="sortOrder"><Input id="sortOrder" name="sortOrder" type="number" defaultValue={0} /></Field>
          <Field label="Description" htmlFor="description">
            <Textarea id="description" name="description" />
          </Field>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" value="true" defaultChecked /> Active</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="shopForMeEnabled" value="true" defaultChecked /> Shop for Me enabled</label>
            <span className="text-sm text-navy-500">Ships to:</span>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="supportedDestinations" value="NIGERIA" defaultChecked /> Nigeria</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="supportedDestinations" value="GAMBIA" defaultChecked /> Gambia</label>
          </div>
          <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Create Store</button>
        </form>
      </details>

      {COUNTRY_ORDER.map((country) => {
        const items = byCountry[country];
        if (items.length === 0) return null;
        return (
          <section key={country} className="card p-5">
            <h2 className="mb-3 font-semibold text-navy-900">
              {STORE_COUNTRY_FLAGS[country]} {STORE_COUNTRY_LABELS[country]} <span className="font-normal text-navy-400">({items.length})</span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-navy-100 text-left text-xs uppercase tracking-wide text-navy-400">
                  <tr>
                    <th className="p-2">Store</th>
                    <th className="p-2">Integration</th>
                    <th className="p-2">Shop for Me</th>
                    <th className="p-2">Status</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-100">
                  {items.map((s) => (
                    <tr key={s.id}>
                      <td className="p-2 font-medium text-navy-800">
                        <Link href={`/admin/international-stores/${s.id}`} className="hover:underline">{s.name}</Link>
                      </td>
                      <td className="p-2 text-navy-500">{storeIntegrationTypeLabel(s.integrationType)}</td>
                      <td className="p-2">
                        <Badge tone={s.shopForMeEnabled ? "green" : "neutral"}>{s.shopForMeEnabled ? "Enabled" : "Disabled"}</Badge>
                      </td>
                      <td className="p-2">
                        <Badge tone={s.isActive ? "green" : "neutral"}>{s.isActive ? "Active" : "Inactive"}</Badge>
                      </td>
                      <td className="space-x-2 p-2 text-right">
                        <form action={toggleStoreActiveAction} className="inline">
                          <input type="hidden" name="storeId" value={s.id} />
                          <button className="text-xs font-medium text-atgblue-600 hover:underline">
                            {s.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </form>
                        <form action={deleteStoreAction} className="inline">
                          <input type="hidden" name="storeId" value={s.id} />
                          <button className="text-xs font-medium text-red-600 hover:underline">Delete</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {stores.length === 0 && (
        <div className="rounded-xl2 border border-dashed border-navy-200 p-12 text-center text-navy-400">No stores yet.</div>
      )}
    </div>
  );
}
