"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ToolTooltip } from "@/components/editor/tool-tooltip";

export function ToolButton({
  icon,
  label,
  description,
  isActive = false,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode;
  label: string;
  description?: string;
  isActive?: boolean;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        aria-label={label}
        className={cn(
          "flex h-11 w-11 items-center justify-center rounded-2xl border text-[var(--text)] transition focus:outline-none focus:shadow-[0_0_0_2px_rgba(231,119,44,0.2)]",
          isActive
            ? "border-[var(--brand)] bg-white text-[var(--brand)]"
            : "border-[var(--line)] bg-white hover:border-[var(--brand)] hover:text-[var(--brand)]",
          "disabled:cursor-not-allowed disabled:opacity-45",
          className
        )}
        {...props}
      >
        {icon}
      </button>
      <ToolTooltip label={label} description={description} />
    </div>
  );
}
