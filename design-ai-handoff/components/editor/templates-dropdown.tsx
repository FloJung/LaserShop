"use client";

import { useMemo, useState } from "react";
import { ChevronDown, LayoutTemplate } from "lucide-react";
import { TEMPLATE_OPTIONS } from "@/lib/design-tool";
import type { TemplateId } from "@/lib/design-tool";

export function TemplatesDropdown({
  activeTemplate,
  onApplyTemplate
}: {
  activeTemplate: TemplateId;
  onApplyTemplate: (templateId: TemplateId) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const activeOption = useMemo(
    () => TEMPLATE_OPTIONS.find((template) => template.id === activeTemplate) ?? TEMPLATE_OPTIONS[0],
    [activeTemplate]
  );

  return (
    <div className="rounded-2xl bg-[var(--muted-surface)] p-3">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-left transition hover:border-[var(--brand)]"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--muted-surface)] text-[var(--brand)]">
            <LayoutTemplate size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">Vorlagen</span>
            <span className="mt-1 block truncate text-sm font-semibold text-[var(--text)]">{activeOption.label}</span>
          </span>
        </div>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[var(--text-soft)] transition ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen ? (
        <div className="mt-3 space-y-2">
          {TEMPLATE_OPTIONS.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                onApplyTemplate(template.id);
                setIsOpen(false);
              }}
              className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                activeTemplate === template.id
                  ? "border-[var(--brand)] bg-white"
                  : "border-[var(--line)] bg-white hover:border-[var(--brand)]"
              }`}
            >
              <p className="text-sm font-semibold text-[var(--text)]">{template.label}</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">{template.description}</p>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
