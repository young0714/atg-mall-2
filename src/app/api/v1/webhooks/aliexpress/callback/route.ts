import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { exchangeAliExpressCode } from "@/lib/services/aliexpressAuthService";

/**
 * Where the admin's browser lands after approving ATG Mall's AliExpress app
 * (the registered Callback URL in the AliExpress App Console). Gated to an
 * authenticated admin session — same as starting the flow — since this
 * exchanges a one-time code for a real, business-wide API token.
 */
export async function GET(req: Request) {
  await requirePermission(PERMISSIONS.MANAGE_PRODUCTS);

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL(`/admin/aliexpress-import?error=${encodeURIComponent("AliExpress didn't return an authorization code")}`, req.url));
  }

  try {
    await exchangeAliExpressCode(code);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to connect AliExpress";
    return NextResponse.redirect(new URL(`/admin/aliexpress-import?error=${encodeURIComponent(message)}`, req.url));
  }

  return NextResponse.redirect(new URL("/admin/aliexpress-import?connected=1", req.url));
}
