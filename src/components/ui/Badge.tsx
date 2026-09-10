import { cn } from "@/lib/utils";

type Tone = "navy" | "blue" | "green" | "gold" | "red" | "neutral";

const toneClass: Record<Tone, string> = {
  navy: "bg-navy-800 text-white",
  blue: "bg-atgblue-50 text-atgblue-700",
  green: "bg-atggreen-50 text-atggreen-700",
  gold: "bg-gold-100 text-gold-700",
  red: "bg-red-50 text-red-700",
  neutral: "bg-navy-50 text-navy-600",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return <span className={cn("badge", toneClass[tone], className)}>{children}</span>;
}

// Maps ATG's business-status enums to a sensible visual tone bucket so every
// status pill across orders/packages/shipments reads consistently.
const STATUS_TONE: Record<string, Tone> = {
  // Positive / final-good states
  DELIVERED: "green",
  PAID: "green",
  SUCCESSFUL: "green",
  ACCEPTED: "green",
  APPROVED: "green",
  COMPLETED: "green",
  RESOLVED: "green",
  // In-progress
  IN_TRANSIT: "blue",
  SHIPPED: "blue",
  PROCESSING: "blue",
  OUT_FOR_DELIVERY: "blue",
  READY_TO_SHIP: "blue",
  READY_FOR_SHIPPING: "blue",
  UNDER_REVIEW: "blue",
  QUOTED: "blue",
  CUSTOMS: "blue",
  CONSOLIDATION: "blue",
  RECEIVED: "blue",
  RECEIVED_AT_WAREHOUSE: "blue",
  IN_TRANSIT_TO_WAREHOUSE: "blue",
  SUPPLIER_SHIPPED: "blue",
  PURCHASED: "blue",
  // Attention / pending
  PENDING: "gold",
  PENDING_PAYMENT: "gold",
  SUBMITTED: "gold",
  AWAITING_CUSTOMER_INSTRUCTION: "gold",
  ORDERED: "gold",
  OPEN: "gold",
  // Negative
  CANCELLED: "red",
  REJECTED: "red",
  FAILED: "red",
  REFUNDED: "red",
  EXPIRED: "red",
  DECLINED: "red",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = STATUS_TONE[status] ?? "neutral";
  return (
    <Badge tone={tone} className={className}>
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
