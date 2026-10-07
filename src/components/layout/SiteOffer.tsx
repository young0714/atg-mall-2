import { cookies } from "next/headers";
import { getPublicOffer } from "@/lib/services/couponService";
import { OfferBar } from "./OfferBar";
import { OFFER_COOKIE } from "@/lib/offerCookie";
import { getActiveSale } from "@/lib/services/saleService";
import { defaultSaleHeadline } from "@/lib/salePricing";
import { SaleBar } from "./SaleBar";

/** Server side of the offer bar: decides whether there is an offer to show this visitor, and whether they already claimed it. */
export async function SiteOffer({ userId }: { userId: string | null }) {
  // A live site-wide sale takes the bar. (If the sale lookup fails it simply returns null.)
  const sale = await getActiveSale();
  if (sale) {
    return <SaleBar headline={sale.headline?.trim() || defaultSaleHeadline(sale.percentOff)} endsAtIso={sale.endsAt.toISOString()} showCountdown={sale.showCountdown} />;
  }

  let offer = null;
  try {
    offer = await getPublicOffer(userId);
  } catch {
    // The offer bar must never be able to take a page down.
    return null;
  }
  if (!offer) return null;
  const claimed = cookies().get(OFFER_COOKIE)?.value === offer.code;
  return <OfferBar offer={offer} initiallyClaimed={claimed} />;
}
