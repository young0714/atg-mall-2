import Link from "next/link";
import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "outline" | "gold" | "ghost";
type Size = "default" | "sm" | "lg";

const variantClass: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  outline: "btn-outline",
  gold: "btn-gold",
  ghost: "btn-ghost",
};

const sizeClass: Record<Size, string> = {
  default: "",
  sm: "px-3.5 py-2 text-xs",
  lg: "px-7 py-3.5 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "default",
  className,
  ...props
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(variantClass[variant], sizeClass[size], className)} {...props} />
  );
}

export function LinkButton({
  variant = "primary",
  size = "default",
  className,
  href,
  ...props
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return (
    <Link href={href} className={cn(variantClass[variant], sizeClass[size], className)} {...props} />
  );
}
