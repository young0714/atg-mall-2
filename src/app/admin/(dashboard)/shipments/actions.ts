"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/current-user";
import { PERMISSIONS } from "@/lib/rbac";
import { generateAtgNumber } from "@/lib/services/trackingService";
import type { Country, OrderStatus, PackageStatus, ShipmentStatus, ShippingMethod } from "@prisma/client";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ShipmentStatus and OrderStatus/PackageStatus share most literal values but
// are NOT identical enums (e.g. ShipmentStatus.READY_TO_SHIP corresponds to
// OrderStatus.READY_FOR_SHIPPING) — never cast one enum to another blindly.
const SHIPMENT_TO_PACKAGE_STATUS: Record<ShipmentStatus, PackageStatus> = {
  READY_TO_SHIP: "READY_TO_SHIP",
  SHIPPED: "SHIPPED",
  IN_TRANSIT: "IN_TRANSIT",
  CUSTOMS: "CUSTOMS",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
};

const SHIPMENT_TO_ORDER_STATUS: Record<ShipmentStatus, OrderStatus> = {
  READY_TO_SHIP: "READY_FOR_SHIPPING",
  SHIPPED: "SHIPPED",
  IN_TRANSIT: "IN_TRANSIT",
  CUSTOMS: "CUSTOMS",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
};

export async function createShipmentAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPMENTS);

  const packageIds = formData.getAll("packageIds").map(String);
  const method = String(formData.get("method")) as ShippingMethod;
  const destinationCountry = String(formData.get("destinationCountry")) as Country;
  const destinationCity = String(formData.get("destinationCity") || "") || undefined;

  if (packageIds.length === 0) {
    redirect("/admin/shipments/new?error=Select+at+least+one+package");
  }

  const packages = await db.package.findMany({ where: { id: { in: packageIds } } });
  const totalWeightGrams = packages.reduce((sum, p) => sum + (p.weightGrams ?? 0), 0);
  const trackingNumber = generateAtgNumber("ATG", destinationCountry);

  const shipment = await db.shipment.create({
    data: {
      trackingNumber,
      method,
      destinationCountry,
      destinationCity,
      status: "READY_TO_SHIP",
      totalWeightGrams,
      packages: { create: packageIds.map((packageId) => ({ packageId })) },
    },
  });

  await db.package.updateMany({ where: { id: { in: packageIds } }, data: { status: "READY_TO_SHIP", shippingMethod: method } });

  for (const packageId of packageIds) {
    const pkg = packages.find((p) => p.id === packageId);
    await db.trackingEvent.create({
      data: {
        shipmentId: shipment.id,
        packageId,
        orderId: pkg?.orderId ?? undefined,
        status: "READY_TO_SHIP",
        location: "ATG China Warehouse",
        description: `Shipment ${trackingNumber} created for this package.`,
      },
    });
  }

  revalidatePath("/admin/shipments");
  redirect(`/admin/shipments/${shipment.id}`);
}

export async function addTrackingEventAction(formData: FormData) {
  await requirePermission(PERMISSIONS.MANAGE_SHIPMENTS);
  const shipmentId = String(formData.get("shipmentId"));
  const status = String(formData.get("status")) as ShipmentStatus;
  const location = String(formData.get("location") || "") || undefined;
  const description = String(formData.get("description") || `Shipment status updated to ${status.replaceAll("_", " ")}.`);

  const shipment = await db.shipment.findUniqueOrThrow({ where: { id: shipmentId }, include: { packages: true } });

  await db.shipment.update({
    where: { id: shipmentId },
    data: {
      status,
      shippedAt: status === "SHIPPED" ? new Date() : undefined,
      deliveredAt: status === "DELIVERED" ? new Date() : undefined,
    },
  });

  await db.trackingEvent.create({ data: { shipmentId, status, location, description } });

  const packageIds = shipment.packages.map((p) => p.packageId);
  const packageStatus = SHIPMENT_TO_PACKAGE_STATUS[status];
  await db.package.updateMany({ where: { id: { in: packageIds } }, data: { status: packageStatus } });
  for (const packageId of packageIds) {
    await db.trackingEvent.create({ data: { packageId, status: packageStatus, location, description } });
  }

  // Keep any linked orders' status roughly aligned with shipment progress.
  const orderIds = (await db.package.findMany({ where: { id: { in: packageIds } }, select: { orderId: true } }))
    .map((p) => p.orderId)
    .filter((id): id is string => !!id);
  if (orderIds.length > 0) {
    const orderStatus = SHIPMENT_TO_ORDER_STATUS[status];
    await db.order.updateMany({ where: { id: { in: orderIds } }, data: { status: orderStatus } });
  }

  revalidatePath(`/admin/shipments/${shipmentId}`);
  revalidatePath("/admin/packages");
}
