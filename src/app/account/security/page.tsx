import { requireUser } from "@/lib/auth/current-user";
import { listCredentials } from "@/lib/services/webauthnService";
import { SecuritySettings } from "@/components/account/SecuritySettings";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Security" };
export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const user = await requireUser();
  const devices = await listCredentials(user.id);

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-navy-900">Security</h1>
      <p className="mt-1 text-sm text-navy-500">
        Add a PIN lock so ATG Mall re-locks itself every time you close and reopen it — separate from your regular
        sign-in.
      </p>

      <div className="mt-6">
        <SecuritySettings
          pinEnabled={user.pinEnabled}
          initialDevices={devices.map((d) => ({
            id: d.id,
            deviceLabel: d.deviceLabel,
            createdAt: d.createdAt.toISOString(),
            lastUsedAt: d.lastUsedAt?.toISOString() ?? null,
          }))}
        />
      </div>
    </div>
  );
}
