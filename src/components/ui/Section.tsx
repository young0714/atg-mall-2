import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center", className)}>
      {eyebrow && (
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-atgblue-600">
          {eyebrow}
        </p>
      )}
      <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
      {description && <p className="mt-3 text-navy-500">{description}</p>}
    </div>
  );
}

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("container-atg", className)}>{children}</div>;
}

export function Section({
  className,
  children,
  tone = "default",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "default" | "sand" | "navy";
}) {
  const toneClass =
    tone === "sand" ? "bg-sand-100" : tone === "navy" ? "bg-navy-900 text-white" : "bg-white";
  return <section className={cn("py-14 sm:py-20", toneClass, className)}>{children}</section>;
}
