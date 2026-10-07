import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
import { isSaleLive, type SaleRule } from "@/lib/salePricing";

/**
 * The sale that is live right now, or null. Looked up once per request (React's
 * cache), and it fails safe: if anything goes wrong (for example the sale table
 * doesn't exist yet) the shop simply shows normal prices.
 */
export const getActiveSale = cache(async (): Promise<SaleRule | null> => {
  try {
    const row = await db.siteSale.findFirst({ orderBy: { updatedAt: "desc" } });
    if (!row) return null;
    const rule: SaleRule = {
      percentOff: row.percentOff,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      isActive: row.isActive,
      headline: row.headline,
      showCountdown: row.showCountdown,
    };
    return isSaleLive(rule) ? rule : null;
  } catch {
    return null;
  }
});
