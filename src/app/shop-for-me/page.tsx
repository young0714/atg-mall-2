import { db } from "@/lib/db";
import { Container, Section, SectionHeading } from "@/components/ui/Section";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { STORE_COUNTRY_LABELS, STORE_COUNTRY_FLAGS } from "@/lib/store";
import { submitShopForMeAction } from "./actions";
import { getDestination } from "@/lib/destination";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop For Me — We buy it, you receive it",
  description: "Send us a product link from any store — China, USA, UK or anywhere else — and ATG Mall will purchase, inspect, warehouse and ship it to Nigeria or Gambia.",
};

export default async function ShopForMePage({
  searchParams,
}: {
  searchParams: { error?: string; storeId?: string; productUrl?: string; productName?: string; productImageUrl?: string };
}) {
  const destination = getDestination();
  const store = searchParams.storeId
    ? await db.store.findUnique({ where: { id: searchParams.storeId } })
    : null;

  return (
    <Section className="!py-12">
      <Container className="max-w-2xl">
        <SectionHeading
          eyebrow="Shop for Me"
          title="Found something online? We'll buy it for you."
          description="Paste a product link from any store — our team will review it, quote you the full landed cost, and purchase it once you approve."
        />

        {store && (
          <div className="mt-4 rounded-xl2 border border-atgblue-200 bg-atgblue-50 p-4 text-sm text-atgblue-700">
            Requesting from <strong>{store.name}</strong> ({STORE_COUNTRY_FLAGS[store.country]} {STORE_COUNTRY_LABELS[store.country]}) — paste the link to the specific product you want below.
          </div>
        )}

        {searchParams.error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>
        )}

        <form action={submitShopForMeAction} className="card mt-8 space-y-4 p-6">
          {store && <input type="hidden" name="storeId" value={store.id} />}
          <Field label="Product link (URL)" htmlFor="productUrl" required>
            <Input id="productUrl" name="productUrl" type="url" required defaultValue={searchParams.productUrl} placeholder="https://www.1688.com/..." />
          </Field>
          <Field label="Product name" htmlFor="productName" required>
            <Input id="productName" name="productName" required defaultValue={searchParams.productName} />
          </Field>
          <Field label="Product image URL" htmlFor="productImageUrl" hint="Optional — paste an image link if you have one">
            <Input id="productImageUrl" name="productImageUrl" type="url" defaultValue={searchParams.productImageUrl} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Quantity" htmlFor="quantity" required>
              <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} required />
            </Field>
            <Field label="Size" htmlFor="size">
              <Input id="size" name="size" placeholder="e.g. XL, 42" />
            </Field>
            <Field label="Color" htmlFor="color">
              <Input id="color" name="color" placeholder="e.g. Black" />
            </Field>
          </div>
          <Field label="Delivery destination" htmlFor="destination" required>
            <Select id="destination" name="destination" defaultValue={destination.country} required>
              <option value="NIGERIA">🇳🇬 Nigeria</option>
              <option value="GAMBIA">🇬🇲 Gambia</option>
            </Select>
          </Field>
          <Field label="Special instructions" htmlFor="instructions" hint="Anything our team should know — variant, deadline, etc.">
            <Textarea id="instructions" name="instructions" />
          </Field>

          <button type="submit" className="btn-primary w-full">Submit Request</button>
          <p className="text-center text-xs text-navy-400">
            You&apos;ll receive a full quotation (product cost + shipping + ATG fee) before anything is charged.
          </p>
        </form>
      </Container>
    </Section>
  );
}
