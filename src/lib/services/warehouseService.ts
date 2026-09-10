import "server-only";
import { db } from "@/lib/db";
import type { Country } from "@prisma/client";
import { generateAtgNumber } from "./trackingService";

/**
 * WarehouseService — China warehouse operations: receiving packages,
 * consolidating them, and marking them ready to ship. This models what a
 * warehouse-management integration (barcode scanners, a WMS) would drive in
 * Phase 2; for now, staff perform these actions manually through
 * `/admin/warehouse`, calling the same service methods.
 */
export interface WarehouseService {
  receivePackage(params: {
    userId: string;
    orderId?: string;
    warehouseId: string;
    supplierId?: string;
    supplierName?: string;
    receivedById: string;
    weightGrams: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    trackingNumberIn?: string;
    photos?: string[];
    notes?: string;
    destination: Country;
  }): Promise<{ packageId: string; packageCode: string }>;

  createConsolidation(params: { userId: string; packageIds: string[] }): Promise<{ consolidationId: string; code: string }>;

  markReadyToShip(packageIds: string[]): Promise<void>;
}

class DefaultWarehouseService implements WarehouseService {
  async receivePackage(params: {
    userId: string;
    orderId?: string;
    warehouseId: string;
    supplierId?: string;
    supplierName?: string;
    receivedById: string;
    weightGrams: number;
    lengthCm?: number;
    widthCm?: number;
    heightCm?: number;
    trackingNumberIn?: string;
    photos?: string[];
    notes?: string;
    destination: Country;
  }) {
    const packageCode = generateAtgNumber("ATG-PKG", params.destination);

    const pkg = await db.package.create({
      data: {
        packageCode,
        orderId: params.orderId,
        userId: params.userId,
        warehouseId: params.warehouseId,
        supplierName: params.supplierName,
        status: "RECEIVED",
        weightGrams: params.weightGrams,
        lengthCm: params.lengthCm,
        widthCm: params.widthCm,
        heightCm: params.heightCm,
        photos: params.photos ?? [],
        destination: params.destination,
      },
    });

    await db.warehouseReceipt.create({
      data: {
        warehouseId: params.warehouseId,
        packageId: pkg.id,
        supplierId: params.supplierId,
        receivedById: params.receivedById,
        trackingNumberIn: params.trackingNumberIn,
        weightGrams: params.weightGrams,
        lengthCm: params.lengthCm,
        widthCm: params.widthCm,
        heightCm: params.heightCm,
        photos: params.photos ?? [],
        notes: params.notes,
      },
    });

    await db.trackingEvent.create({
      data: {
        packageId: pkg.id,
        orderId: params.orderId,
        status: "RECEIVED",
        location: "ATG China Warehouse",
        description: "Package received and logged at the China warehouse.",
      },
    });

    if (params.orderId) {
      await db.order.update({
        where: { id: params.orderId },
        data: { status: "RECEIVED_AT_WAREHOUSE" },
      });
    }

    return { packageId: pkg.id, packageCode };
  }

  async createConsolidation({ userId, packageIds }: { userId: string; packageIds: string[] }) {
    const code = generateAtgNumber("ATG-CONS", "NIGERIA").replace("ATG-PKG", "ATG-CONS");
    const consolidation = await db.consolidation.create({
      data: {
        code: `ATG-CONS-${Math.floor(100000 + Math.random() * 900000)}`,
        userId,
        packages: { create: packageIds.map((packageId) => ({ packageId })) },
      },
    });

    await db.package.updateMany({
      where: { id: { in: packageIds } },
      data: { status: "CONSOLIDATION" },
    });

    return { consolidationId: consolidation.id, code: consolidation.code };
  }

  async markReadyToShip(packageIds: string[]): Promise<void> {
    await db.package.updateMany({
      where: { id: { in: packageIds } },
      data: { status: "READY_TO_SHIP" },
    });
    for (const packageId of packageIds) {
      await db.trackingEvent.create({
        data: {
          packageId,
          status: "READY_TO_SHIP",
          location: "ATG China Warehouse",
          description: "Package packed and ready for international shipment.",
        },
      });
    }
  }
}

export const warehouseService: WarehouseService = new DefaultWarehouseService();
