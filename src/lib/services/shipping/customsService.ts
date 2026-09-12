import "server-only";
import { db } from "@/lib/db";
import type { CustomsDisclosure } from "./types";
import { CUSTOMS_DISCLAIMER } from "./types";

/**
 * Looks up the optional, admin-managed `CustomsSetting` for a destination
 * country. This is a disclosure/estimate helper only — it never claims
 * duties are included in a price. `isConfigured=false` (the default) means
 * nothing is known about that lane's duties, and callers must still show
 * the disclaimer, just without a numeric estimate.
 */
export interface CustomsService {
  getDisclosure(destinationIso: string): Promise<CustomsDisclosure>;
}

class DefaultCustomsService implements CustomsService {
  async getDisclosure(destinationIso: string): Promise<CustomsDisclosure> {
    const destination = await db.destinationCountry.findFirst({
      where: { isoCode: destinationIso },
      include: { customsSetting: true },
    });

    const setting = destination?.customsSetting;
    if (!setting || !setting.isConfigured) {
      return {
        isConfigured: false,
        estimatedDutyPercent: null,
        importTaxPercent: null,
        customsProcessingFeeMinor: null,
        currency: null,
        notes: null,
        disclaimer: CUSTOMS_DISCLAIMER,
      };
    }

    return {
      isConfigured: true,
      estimatedDutyPercent: setting.estimatedDutyPercent,
      importTaxPercent: setting.importTaxPercent,
      customsProcessingFeeMinor: setting.customsProcessingFeeMinor,
      currency: setting.currency,
      notes: setting.notes,
      disclaimer: CUSTOMS_DISCLAIMER,
    };
  }
}

export const customsService: CustomsService = new DefaultCustomsService();
