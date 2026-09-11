import Image from "next/image";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  nav: "h-10 w-10",
  hero: "h-24 w-24",
} as const;

/**
 * ATG Mall's real logo artwork (navy/green on a transparent background).
 * Since the art itself is fixed-color, `dark` picks how it's presented
 * rather than recoloring it: on a light background the mark sits directly
 * on the page; on a dark background it's set on a small white plate so it
 * stays legible. `size` picks compact (nav/footer) vs large (auth pages).
 */
export function Logo({
  className,
  dark = false,
  size = "nav",
}: {
  className?: string;
  dark?: boolean;
  size?: keyof typeof SIZE_CLASSES;
}) {
  const img = (
    <Image
      src="/logo.png"
      alt="ATG Mall — Shop Global. Delivered Local."
      width={200}
      height={200}
      priority
      className="h-full w-full object-contain"
    />
  );

  if (dark) {
    return <span className={cn("inline-block shrink-0", SIZE_CLASSES[size], className)}>{img}</span>;
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg bg-white p-1.5",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {img}
    </span>
  );
}
