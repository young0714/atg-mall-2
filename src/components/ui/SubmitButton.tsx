"use client";

import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * A plain `<button type="submit">` gives no feedback while its server
 * action is in flight (often 1s+), which reads as broken and invites a
 * second click — this disables itself and shows a spinner for that whole
 * window instead. Must be rendered inside the `<form>` it submits, per
 * useFormStatus's own contract.
 */
export function SubmitButton({
  children,
  pendingText,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending}
      className={cn(className, pending && "cursor-wait opacity-70")}
      {...props}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-1.5">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {pendingText ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
