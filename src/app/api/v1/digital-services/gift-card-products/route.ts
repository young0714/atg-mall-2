import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { giftCardService } from "@/lib/services/reloadlyGiftCardService";
import { SUPPORTED_WALLET_CURRENCIES } from "@/lib/constants";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const countryIso = new URL(request.url).searchParams.get("country");
  if (!countryIso || countryIso.length !== 2) {
    return NextResponse.json({ error: "A 2-letter country code is required" }, { status: 400 });
  }

  const products = await giftCardService.getProducts(countryIso.toUpperCase());
  // Only ever return products priced in a currency ATG can actually convert
  // into a wallet charge — see SUPPORTED_WALLET_CURRENCIES.
  const purchasable = products.filter((p) => SUPPORTED_WALLET_CURRENCIES.includes(p.currencyCode as (typeof SUPPORTED_WALLET_CURRENCIES)[number]));
  return NextResponse.json({ data: purchasable });
}
