"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LayoutTemplate } from "lucide-react";
import { ToolButton } from "@/components/editor/tool-button";
import { getIconPath, ICON_LIBRARY } from "@/lib/design-tool";
import type { IconId } from "@/lib/design-tool";

function IconPreview({ iconId }: { iconId: IconId }) {
  const path = getIconPath(iconId);

  if (!path) {
    return null;
  }

  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={path} fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconsDropdown({ onAddIcon }: { onAddIcon: (iconId: IconId) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);
    return () => window.removeEventListener("mousedown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <ToolButton
        icon={
          <span className="relative flex items-center justify-center">
            <LayoutTemplate size={17} />
            <ChevronDown size={11} className="absolute -bottom-2 -right-2 rounded-full bg-white text-[var(--text-soft)]" />
          </span>
        }
        label="Icon einfuegen"
        description="Dekorative Symbole aus der Bibliothek einfuegen"
        isActive={isOpen}
        onClick={() => setIsOpen((current) => !current)}
      />

      {isOpen ? (
        <div className="absolute left-0 top-full z-30 mt-3 w-[280px] rounded-3xl border border-[var(--line)] bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--brand)]">Icon-Bibliothek</p>
              <p className="mt-1 text-sm text-[var(--text-soft)]">Waehle ein Symbol fuer die Arbeitsflaeche.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            {ICON_LIBRARY.map((icon) => (
              <button
                key={icon.id}
                type="button"
                onClick={() => {
                  onAddIcon(icon.id);
                  setIsOpen(false);
                }}
                className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--muted-surface)] px-3 py-3 text-left transition hover:border-[var(--brand)] hover:bg-white"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[var(--brand)]">
                  <IconPreview iconId={icon.id} />
                </span>
                <span className="text-sm font-semibold text-[var(--text)]">{icon.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
