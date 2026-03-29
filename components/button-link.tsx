import Link from "next/link";
import { cn } from "@/lib/utils";

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold transition",
        variant === "primary"
          ? "bg-[var(--brand)] text-white hover:bg-[var(--brand-strong)]"
          : "border border-[var(--line)] bg-white text-[var(--text)] hover:border-[var(--brand)]",
        className
      )}
    >
      {children}
    </Link>
  );
}
