import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { Field, Input, Select } from "@/components/ui/Form";
import { updateProfileAction, addProfileAddressAction, deleteAddressAction } from "./actions";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profile & Addresses" };
export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { saved?: string; error?: string };
}) {
  const user = await requireUser();
  const [profile, addresses] = await Promise.all([
    db.customerProfile.findUnique({ where: { userId: user.id } }),
    db.address.findMany({ where: { userId: user.id }, orderBy: { isDefault: "desc" } }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy-900">Profile &amp; Addresses</h1>
      </div>

      {searchParams.saved && <div className="rounded-lg bg-atggreen-50 p-3 text-sm text-atggreen-700">Saved!</div>}
      {searchParams.error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</div>}

      <form action={updateProfileAction} className="card grid gap-4 p-6 sm:grid-cols-2">
        <h2 className="font-semibold text-navy-900 sm:col-span-2">Personal Information</h2>
        <Field label="Full name" htmlFor="fullName" required>
          <Input id="fullName" name="fullName" defaultValue={user.fullName} required />
        </Field>
        <Field label="Email" htmlFor="email">
          <Input id="email" value={user.email} disabled className="bg-sand-100" />
        </Field>
        <Field label="Phone" htmlFor="phone">
          <Input id="phone" name="phone" defaultValue={user.phone ?? ""} />
        </Field>
        <Field label="WhatsApp" htmlFor="whatsapp">
          <Input id="whatsapp" name="whatsapp" defaultValue={user.whatsapp ?? ""} />
        </Field>
        <Field label="Country" htmlFor="country">
          <Select id="country" name="country" defaultValue={profile?.country ?? "NIGERIA"}>
            <option value="NIGERIA">Nigeria</option>
            <option value="GAMBIA">Gambia</option>
          </Select>
        </Field>
        <Field label="Preferred currency" htmlFor="preferredCurrency">
          <Select id="preferredCurrency" name="preferredCurrency" defaultValue={profile?.preferredCurrency ?? "NGN"}>
            <option value="NGN">NGN</option>
            <option value="GMD">GMD</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
        <Field label="State/Region" htmlFor="state">
          <Input id="state" name="state" defaultValue={profile?.state ?? ""} />
        </Field>
        <Field label="City" htmlFor="city">
          <Input id="city" name="city" defaultValue={profile?.city ?? ""} />
        </Field>
        <button type="submit" className="btn-primary sm:col-span-2 sm:w-fit">Save Profile</button>
      </form>

      <div className="card p-6">
        <h2 className="mb-4 font-semibold text-navy-900">Delivery Addresses</h2>
        <div className="space-y-2">
          {addresses.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-lg border border-navy-100 p-3 text-sm">
              <div>
                <p className="font-medium text-navy-800">{a.label}{a.isDefault && <span className="ml-2 badge bg-navy-50 text-navy-500">Default</span>}</p>
                <p className="text-navy-500">{a.fullName} · {a.addressLine1}, {a.city}, {a.state}, {a.country === "NIGERIA" ? "Nigeria" : "Gambia"}</p>
              </div>
              <form action={deleteAddressAction}>
                <input type="hidden" name="addressId" value={a.id} />
                <button type="submit" className="text-xs font-medium text-red-600 hover:underline">Remove</button>
              </form>
            </div>
          ))}
        </div>

        <form action={addProfileAddressAction} className="mt-5 grid gap-3 rounded-xl2 border border-dashed border-navy-200 p-4 sm:grid-cols-2">
          <input type="hidden" name="label" value="Other" />
          <Field label="Full name" htmlFor="a-fullName" required><Input id="a-fullName" name="fullName" required /></Field>
          <Field label="Phone" htmlFor="a-phone" required><Input id="a-phone" name="phone" required /></Field>
          <Field label="Country" htmlFor="a-country" required>
            <Select id="a-country" name="country" required>
              <option value="NIGERIA">Nigeria</option>
              <option value="GAMBIA">Gambia</option>
            </Select>
          </Field>
          <Field label="State" htmlFor="a-state" required><Input id="a-state" name="state" required /></Field>
          <Field label="City" htmlFor="a-city" required><Input id="a-city" name="city" required /></Field>
          <Field label="Address" htmlFor="a-addressLine1" required><Input id="a-addressLine1" name="addressLine1" required /></Field>
          <button type="submit" className="btn-outline btn-sm sm:col-span-2">Add Address</button>
        </form>
      </div>
    </div>
  );
}
