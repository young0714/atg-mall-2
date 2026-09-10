import { trackingService } from "@/lib/services/trackingService";
import { StatusTimeline } from "@/components/tracking/StatusTimeline";
import { StatusBadge } from "@/components/ui/Badge";
import { Container, Section } from "@/components/ui/Section";
import { SHIPPING_METHOD_LABELS, COUNTRY_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import type { Country, ShippingMethod } from "@prisma/client";

export const metadata: Metadata = { title: "Track Shipment" };
export const dynamic = "force-dynamic";

export default async function TrackResultPage({ params }: { params: { trackingNumber: string } }) {
  const result = await trackingService.track(decodeURIComponent(params.trackingNumber));

  return (
    <Section className="!py-12">
      <Container className="max-w-2xl">
        <Link href="/track" className="text-sm text-atgblue-600">← Track another shipment</Link>

        {!result ? (
          <div className="mt-6 rounded-xl2 border border-dashed border-navy-200 p-12 text-center">
            <p className="font-semibold text-navy-800">No shipment found</p>
            <p className="mt-1 text-sm text-navy-500">
              We couldn&apos;t find a shipment with tracking number &ldquo;{params.trackingNumber}&rdquo;. Double-check
              the number or contact support if you believe this is an error.
            </p>
          </div>
        ) : (
          <div className="mt-6">
            <div className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-navy-400">Tracking Number</p>
                  <p className="text-xl font-display font-bold text-navy-900">{result.trackingNumber}</p>
                </div>
                <StatusBadge status={result.status} className="text-sm" />
              </div>
              <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                <div><dt className="text-navy-400">Method</dt><dd className="font-medium text-navy-800">{SHIPPING_METHOD_LABELS[result.method as ShippingMethod]}</dd></div>
                <div><dt className="text-navy-400">Destination</dt><dd className="font-medium text-navy-800">{COUNTRY_LABELS[result.destinationCountry as Country]}{result.destinationCity ? `, ${result.destinationCity}` : ""}</dd></div>
                <div><dt className="text-navy-400">Est. delivery</dt><dd className="font-medium text-navy-800">{result.estimatedDeliveryAt ? formatDate(result.estimatedDeliveryAt) : "TBC"}</dd></div>
              </dl>
              {result.packages.length > 0 && (
                <div className="mt-4 border-t border-navy-100 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">Packages in this shipment</p>
                  <ul className="mt-2 space-y-1 text-sm text-navy-600">
                    {result.packages.map((p) => (
                      <li key={p.packageCode}>{p.packageCode} — {p.weightGrams ? `${(p.weightGrams / 1000).toFixed(2)} kg` : "weight pending"}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="card mt-6 p-6">
              <h2 className="mb-4 font-semibold text-navy-900">Shipment Timeline</h2>
              <StatusTimeline events={result.timeline} />
            </div>
          </div>
        )}
      </Container>
    </Section>
  );
}
