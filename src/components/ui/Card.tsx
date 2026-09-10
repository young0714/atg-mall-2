import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card", className)} {...props} />;
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 sm:p-6", className)} {...props} />;
}

export function Stat({
  label,
  value,
  hint,
  tone = "navy",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "navy" | "green" | "blue" | "gold";
}) {
  const toneText = {
    navy: "text-navy-900",
    green: "text-atggreen-600",
    blue: "text-atgblue-600",
    gold: "text-gold-600",
  }[tone];

  return (
    <Card>
      <CardBody className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-navy-400">{label}</p>
        <p className={cn("text-2xl font-display font-bold", toneText)}>{value}</p>
        {hint && <p className="text-xs text-navy-400">{hint}</p>}
      </CardBody>
    </Card>
  );
}
