"use client";

import clsx from "clsx";
import { useId, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type MobileMenuAccordionProps = {
  children: ReactNode;
  isOpen: boolean;
  title: string;
  onToggle: () => void;
};

export function MobileMenuAccordion({ children, isOpen, title, onToggle }: MobileMenuAccordionProps) {
  const panelId = useId();

  return (
    <div className="rounded-2xl border border-[var(--line)]">
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium text-[var(--text)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
        onClick={onToggle}
      >
        <span>{title}</span>
        <ChevronDown
          size={18}
          className={clsx(
            "shrink-0 text-[var(--text-soft)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isOpen && "rotate-180"
          )}
        />
      </button>

      <div
        id={panelId}
        className={clsx(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-[var(--line)] px-3 py-3">{children}</div>
        </div>
      </div>
    </div>
  );
}
