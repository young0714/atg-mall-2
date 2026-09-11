import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { notFound } from "next/navigation";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { STORE_COUNTRY_LABELS, STORE_COUNTRY_FLAGS } from "@/lib/store";
import { updateStoreAction } from "../actions";
import Link from "next/link";
import type { Metadata } from "next";
import type { StoreCountry } from "@prisma/client";

export const metadata: Metadata = { title: "Admin — Edit Store" };
export const dynamic = "force-dynamic";

const COUNTRY_ORDER: StoreCountry[] = ["CHINA", "USA", "UK"];

export default async function AdminStoreDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { updated?: string; error?: string };
}) {
  await requirePermission(PERMISSIONS.MANAGE_STORES);

  const store = await db.store.findUnique({ where: { id: params.id } });
  if (!store) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/international-stores" className="text-xs font-medium text-atgblue-600 hover:underline">
          ← Back to International Stores
        </Link>
        <h1 className="mt-1 text-2xl font-display font-bold text-navy-900">{store.name}</h1>
        <p className="text-sm text-navy-500">{STORE_COUNTRY_FLAGS[store.country]} {STORE_COUNTRY_LABELS[store.country]}</p>
      </div>

      {searchParams.updated && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Saved.</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <section className="card p-5">
        <form action={updateStoreAction} className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="storeId" value={store.id} />
          <Field label="Name" htmlFor="name" required><Input id="name" name="name" defaultValue={store.name} required /></Field>
          <Field label="Slug" htmlFor="slug" required hint="lowercase-with-hyphens">
            <Input id="slug" name="slug" defaultValue={store.slug} required />
          </Field>
          <Field label="Country" htmlFor="country" required>
            <Select id="country" name="country" defaultValue={store.country} required>
              {COUNTRY_ORDER.map((c) => <option key={c} value={c}>{STORE_COUNTRY_FLAGS[c]} {STORE_COUNTRY_LABELS[c]}</option>)}
            </Select>
          </Field>
          <Field label="Integration type" htmlFor="integrationType" required>
            <Select id="integrationType" name="integrationType" defaultValue={store.integrationType} required>
              <option value="API">API (live catalog)</option>
              <option value="AFFILIATE">Affiliate</option>
              <option value="DIRECT_LINK">Direct external link</option>
              <option value="SHOP_FOR_ME">Shop for Me</option>
              <option value="FUTURE">Future integration</option>
            </Select>
          </Field>
          <Field label="Logo URL" htmlFor="logoUrl"><Input id="logoUrl" name="logoUrl" type="url" defaultValue={store.logoUrl ?? ""} /></Field>
          <Field label="Website URL" htmlFor="websiteUrl" hint="External 'Browse' destination — leave blank for a link-only catch-all store">
            <Input id="websiteUrl" name="websiteUrl" type="url" defaultValue={store.websiteUrl ?? ""} />
          </Field>
          <Field label="Internal browse path" htmlFor="internalBrowsePath" hint="e.g. /shop-from-china/1688 — overrides Website URL for Browse when set">
            <Input id="internalBrowsePath" name="internalBrowsePath" defaultValue={store.internalBrowsePath ?? ""} />
          </Field>
          <Field label="Affiliate URL" htmlFor="affiliateUrl" hint="Only used when Integration type = Affiliate">
            <Input id="affiliateUrl" name="affiliateUrl" type="url" defaultValue={store.affiliateUrl ?? ""} />
          </Field>
          <Field label="API status" htmlFor="apiStatus" hint='Honest free-text note, e.g. "Not yet configured"'>
            <Input id="apiStatus" name="apiStatus" defaultValue={store.apiStatus ?? ""} />
          </Field>
          <Field label="Sort order" htmlFor="sortOrder"><Input id="sortOrder" name="sortOrder" type="number" defaultValue={store.sortOrder} /></Field>
          <Field label="Description" htmlFor="description">
            <Textarea id="description" name="description" defaultValue={store.description ?? ""} />
          </Field>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" value="true" defaultChecked={store.isActive} /> Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="shopForMeEnabled" value="true" defaultChecked={store.shopForMeEnabled} /> Shop for Me enabled
            </label>
            <span className="text-sm text-navy-500">Ships to:</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="supportedDestinations" value="NIGERIA" defaultChecked={store.supportedDestinations.includes("NIGERIA")} /> Nigeria
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="supportedDestinations" value="GAMBIA" defaultChecked={store.supportedDestinations.includes("GAMBIA")} /> Gambia
            </label>
          </div>
          <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Save changes</button>
        </form>
      </section>
    </div>
  );
}
