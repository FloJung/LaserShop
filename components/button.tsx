import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Button({
  children,
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]",
        variant === "secondary" && "border border-[var(--line)] bg-white text-[var(--text)] hover:border-[var(--brand)]",
        variant === "ghost" && "bg-[var(--muted-surface)] text-[var(--text)] hover:bg-white hover:shadow-sm",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
